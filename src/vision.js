let detectorPromise;

export function bottleBoxes(predictions, width, height) {
  return predictions.filter(p => p.class === 'bottle' && p.score >= .5).map(p => {
    const [x,y,w,h] = p.bbox;
    return {left:Math.max(0,x/width),top:Math.max(0,y/height),right:Math.min(1,(x+w)/width),bottom:Math.min(1,(y+h)/height),score:p.score};
  }).filter(b => b.right-b.left > .02 && b.bottom-b.top > .05).sort((a,b)=>b.score-a.score);
}

export function mergeBottleBoxes(boxes) {
  const kept=[];
  for(const box of [...boxes].sort((a,b)=>b.score-a.score)){
    const duplicate=kept.some(other=>{
      const intersection=Math.max(0,Math.min(box.right,other.right)-Math.max(box.left,other.left))*Math.max(0,Math.min(box.bottom,other.bottom)-Math.max(box.top,other.top));
      const area=b=>(b.right-b.left)*(b.bottom-b.top);
      return intersection/(area(box)+area(other)-intersection)>.45;
    });
    if(!duplicate)kept.push(box);
  }
  // Prefer the large foreground bottle over a small bottle on a desk in the background.
  return kept.sort((a,b)=>(b.right-b.left)*(b.bottom-b.top)*b.score-(a.right-a.left)*(a.bottom-a.top)*a.score);
}

export async function detectBottles(canvas,onProgress=()=>{}) {
  if (!detectorPromise) detectorPromise = (async()=>{
    const tf = await import('@tensorflow/tfjs');
    await tf.ready();
    const coco = await import('@tensorflow-models/coco-ssd');
    const local=new URL(`${import.meta.env.BASE_URL}models/bottle/model.json`,location.href).href;
    try{
      const probe=await fetch(local);
      if(probe.ok && probe.headers.get('content-type')?.includes('json')){
        onProgress('Loading the locally installed bottle model…');
        return await coco.load({base:'mobilenet_v2',modelUrl:local});
      }
    }catch{}
    onProgress('Downloading the bottle model. Run npm run prepare:model to install it locally.');
    return coco.load({base:'mobilenet_v2'});
  })().catch(error=>{detectorPromise=null;throw error;});
  const detector = await detectorPromise;
  const windows=[{left:0,top:0,right:1,bottom:1},{left:.2,top:0,right:.8,bottom:1}];
  const found=[];
  for(let i=0;i<windows.length;i++){
    onProgress(i?'Checking a closer crop for narrow bottles…':'Scanning the whole photo for bottles…');
    const box=windows[i],crop=document.createElement('canvas');
    const width=(box.right-box.left)*canvas.width,height=(box.bottom-box.top)*canvas.height;
    const scale=Math.min(1,1000/Math.max(width,height));crop.width=Math.max(1,Math.round(width*scale));crop.height=Math.max(1,Math.round(height*scale));
    crop.getContext('2d').drawImage(canvas,box.left*canvas.width,box.top*canvas.height,width,height,0,0,crop.width,crop.height);
    const predictions=await detector.detect(crop,20,.5);
    found.push(...bottleBoxes(predictions,crop.width,crop.height).map(p=>({...p,
      left:box.left+p.left*(box.right-box.left),right:box.left+p.right*(box.right-box.left),
      top:box.top+p.top*(box.bottom-box.top),bottom:box.top+p.bottom*(box.bottom-box.top),
    })));
  }
  return mergeBottleBoxes(found);
}

export async function readLabel(canvas, box, onProgress) {
  const {createWorker} = await import('tesseract.js');
  const base = new URL(`${import.meta.env.BASE_URL}ocr/`,location.href).href;
  const crop=document.createElement('canvas');
  const x=Math.round(box.left*canvas.width), y=Math.round(box.top*canvas.height);
  const width=Math.max(1,Math.round((box.right-box.left)*canvas.width));
  const height=Math.max(1,Math.round((box.bottom-box.top)*canvas.height));
  const scale=Math.min(3,1800/Math.max(width,height));
  crop.width=Math.round(width*scale);crop.height=Math.round(height*scale);
  crop.getContext('2d').drawImage(canvas,x,y,width,height,0,0,crop.width,crop.height);
  const worker=await createWorker('eng',1,{workerPath:base+'worker.min.js',corePath:base+'core/',langPath:base,logger:message=>onProgress(message.status,message.progress)});
  try {
    await worker.setParameters({tessedit_pageseg_mode:'11'});
    const {data}=await worker.recognize(crop);
    return {text:data.text.trim(),confidence:data.confidence};
  } finally { await worker.terminate(); }
}
