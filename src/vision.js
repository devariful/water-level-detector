let detectorPromise;

export function bottleBoxes(predictions, width, height) {
  return predictions.filter(p => p.class === 'bottle' && p.score >= .5).map(p => {
    const [x,y,w,h] = p.bbox;
    return {left:Math.max(0,x/width),top:Math.max(0,y/height),right:Math.min(1,(x+w)/width),bottom:Math.min(1,(y+h)/height),score:p.score};
  }).filter(b => b.right-b.left > .02 && b.bottom-b.top > .05).sort((a,b)=>b.score-a.score);
}

export async function detectBottles(canvas) {
  if (!detectorPromise) detectorPromise = (async()=>{
    const tf = await import('@tensorflow/tfjs');
    await tf.ready();
    const coco = await import('@tensorflow-models/coco-ssd');
    return coco.load({base:'lite_mobilenet_v2'});
  })().catch(error=>{detectorPromise=null;throw error;});
  const detector = await detectorPromise;
  return bottleBoxes(await detector.detect(canvas,20,.5),canvas.width,canvas.height);
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
