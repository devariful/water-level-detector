import './style.css';
import {analyzePixels, percentage, statusFor, volumePercentage} from './analyze.js';
import {detectBottles, readLabel} from './vision.js';

const icons = {
 drop:'<path d="M12 3C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-12Z"/><path d="M8 15a4 4 0 0 0 4 4"/>',
 camera:'<path d="M8 6l2-3h4l2 3h4a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="4"/>',
 upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
 image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',
 shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
 arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
 check:'<path d="m5 12 4 4L19 6"/>'
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
document.querySelector('#app').innerHTML = `
<header><a class="brand" href="./"><span class="brand-icon">${icon('drop')}</span>clarity<span class="brand-dot">.</span></a><span class="header-label">BOTTLE LEVEL SCANNER</span><span class="privacy">${icon('shield')} Private by design</span></header>
<main><section class="intro"><div class="eyebrow"><span></span> A LITTLE CLARITY, IN EVERY DROP</div><h1>See your bottle.<br>Know your <em>water level.</em></h1><p>Take a photo or upload an image to estimate how full your bottle is.<br class="desktop"> A clearer picture, in just a moment.</p></section>
<section class="workspace" aria-label="Bottle scanner"><div class="input-panel"><div class="panel-heading"><div><span class="step">01</span><h2>Your bottle</h2></div><span class="tag">JPG, PNG, WEBP</span></div>
<div class="tabs" role="group" aria-label="Image source"><button id="upload-tab" class="tab active">${icon('upload')} Upload image</button><button id="camera-tab" class="tab">${icon('camera')} Use camera</button></div>
<div id="dropzone" class="dropzone"><div class="upload-icon">${icon('image')}</div><h3>Drop your bottle photo here</h3><p>or choose one from your device</p><button id="browse" class="primary">${icon('upload')} Browse images</button><span class="file-hint">Up to 15 MB · One bottle per photo</span></div>
<div id="preview" hidden><div class="canvas-wrap"><canvas id="canvas" aria-label="Bottle photo with adjustable water level overlay"></canvas></div><div class="preview-footer"><span id="filename"></span><button id="replace" class="text-button">Change image</button></div></div>
<div id="camera-view" hidden><video id="video" autoplay playsinline muted></video><div class="camera-controls"><button id="capture" class="primary">${icon('camera')} Capture photo</button><button id="cancel-camera" class="secondary">Cancel</button></div></div>
<input type="file" id="file" accept="image/jpeg,image/png,image/webp" hidden><input type="file" id="mobile-file" accept="image/*" capture="environment" hidden>
<p id="error" role="alert" hidden></p><button id="mobile-capture" class="mobile-capture">${icon('camera')} Take a photo with your phone</button>
<div class="photo-tip"><span>✧</span><p><strong>A good photo makes all the difference</strong>Use a clear bottle, a plain background, and good lighting. Keep the whole bottle upright and in frame.</p></div></div>
<div class="result-panel"><div class="panel-heading"><div><span class="step">02</span><h2>Your result</h2></div><span id="result-badge" class="tag">WAITING FOR IMAGE</span></div>
<div class="result-main"><div class="bottle-art"><div class="bottle-cap"></div><div class="bottle-neck"></div><div class="bottle-body"><div id="bottle-water"></div><div class="bottle-mark m1"></div><div class="bottle-mark m2"></div><div class="bottle-mark m3"></div><span id="bottle-number">—<small>%</small></span></div><div class="bottle-shadow"></div></div>
<h3 id="result-title">A little perspective awaits</h3><p id="result-description">Add a photo to see your bottle’s<br>estimated water level.</p></div>
<div id="detection" hidden><p id="detection-status" role="status"></p><label id="bottle-choice-label" hidden>Choose bottle <select id="bottle-choice"></select></label><button id="retry-detection" class="secondary">Detect bottle again</button></div><div id="adjustments" hidden><div class="adjust-heading"><strong>Refine your estimate</strong><span>Drag the sliders</span></div><p class="adjust-help">Set the top of the usable bottle, its bottom, and the visible water line.</p><label>Bottle left <input id="left" type="range" min="0" max="95" step="0.5" value="20"></label><label>Bottle right <input id="right" type="range" min="5" max="100" step="0.5" value="80"></label><label>Bottle top <input id="top" type="range" min="0" max="95" step="0.5" value="16"></label><label>Bottle bottom <input id="bottom" type="range" min="5" max="100" step="0.5" value="90"></label><label>Water line <input id="line" type="range" min="0" max="100" step="0.5" value="55"></label><button id="rescan-water" class="secondary">Find water line in selected area</button><div class="quick-actions"><button data-level="0">Mark empty</button><button data-level="100">Mark full</button></div></div>
<div id="volume-panel" hidden><label for="volume-model">Optional volume estimate</label><select id="volume-model"><option value="none">Off — show water height only</option><option value="cylinder">Straight cylinder</option><option value="shoulder">Cylinder with tapered shoulder</option></select><div id="shape-settings" hidden><label>Shoulder height (% of usable height) <input id="shoulder-size" type="number" min="1" max="60" value="20"></label><label>Neck width (% of body width) <input id="neck-width" type="number" min="10" max="100" value="40"></label></div><p id="volume-result" role="status"></p><p class="adjust-help">Assumes an upright, circular bottle with a flat base. Dimensions are supplied by you, not measured from the photo. Not calibrated volume.</p></div><div class="result-note">${icon('drop')}<span>Visual estimate, not a volume measurement.<br>Best with transparent, unlabelled bottles.</span></div></div></section>
<section id="ocr-panel" class="ocr-panel" hidden><div class="panel-heading"><div><span class="step">03</span><h2>Bottle label text</h2></div><span class="tag">ENGLISH OCR · ON DEVICE</span></div><p>Extract text from the selected bottle area. For best results, use a sharp, front-facing label photo. Adjust all four bottle boundaries to include the label.</p><div class="ocr-actions"><button id="extract-text" class="primary">Extract label text</button><button id="copy-text" class="secondary" disabled>Copy text</button></div><p id="ocr-status" role="status">Ready when you are.</p><label for="ocr-text">Extracted text — check and edit any mistakes</label><textarea id="ocr-text" rows="5" placeholder="Your bottle label text will appear here."></textarea></section><section class="features"><div><span class="feature-icon">${icon('camera')}</span><div><h3>Capture your way</h3><p>Phone, webcam, or a saved photo.</p></div></div><div><span class="feature-icon">${icon('drop')}</span><div><h3>Every level, from 0 to 100</h3><p>Empty, full, and everything in between.</p></div></div><div><span class="feature-icon">${icon('shield')}</span><div><h3>Your photos stay yours</h3><p>Processed here. Never uploaded.</p></div></div></section>
<footer><span>Made for a clearer everyday.</span><span>CLARITY <span class="footer-dot">•</span> EVERY DROP COUNTS</span></footer></main>`;

const $ = id => document.getElementById(id);
let photo=null, bounds=null, stream=null, manual=false, generation=0;
let photoVersion=0, detectionRun=0, ocrRun=0, boxes=[];
let detecting=false;
const showError = message => { $('error').textContent=message; $('error').hidden=!message; };
function stopCamera(){ if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;$('video').srcObject=null;$('camera-view').hidden=true;$('camera-tab').classList.remove('active');$('upload-tab').classList.add('active');$('preview').hidden=!photo;$('dropzone').hidden=!!photo; }
function draw(){
  if(!photo || !bounds)return;
  const canvas=$('canvas'), ctx=canvas.getContext('2d');
  canvas.width=photo.width;canvas.height=photo.height;ctx.drawImage(photo,0,0);
  const w=canvas.width,h=canvas.height,x=bounds.left*w,r=bounds.right*w;
  ctx.lineWidth=Math.max(2,w/250);ctx.strokeStyle='#31b9ac';ctx.setLineDash([w/70,w/90]);
  ctx.strokeRect(x,bounds.top*h,r-x,(bounds.bottom-bounds.top)*h);
  ctx.setLineDash([]);ctx.strokeStyle='#008fce';ctx.beginPath();ctx.moveTo(x,bounds.line*h);ctx.lineTo(r,bounds.line*h);ctx.stroke();
  if(manual || (!detecting && bounds.candidate)){ctx.fillStyle='#12b5c52b';ctx.fillRect(x,bounds.line*h,r-x,(bounds.bottom-bounds.line)*h);}
  const level=percentage(bounds.top,bounds.bottom,bounds.line), hasEstimate=manual || (!detecting && bounds.candidate);
  $('bottle-water').style.height=hasEstimate?`${level}%`:'0%';$('bottle-number').innerHTML=hasEstimate?`${level}<small>%</small>`:'—<small>%</small>';
  $('result-title').textContent=hasEstimate?statusFor(level):detecting?'Looking for a bottle…':'Help us find the water line';
  $('result-description').textContent=detecting?'First use downloads the bottle model. Your photo stays on this device.':manual?'Your adjusted estimate of water height.':bounds.reason || 'Set the bottle boundaries, then find or manually adjust the water line.';
  updateVolume(hasEstimate);
  $('result-badge').textContent=detecting?'DETECTING':manual?'MANUALLY ADJUSTED':bounds.candidate?'CHECK ESTIMATE':'NEEDS ADJUSTMENT';
}
async function loadFile(file){
  if(!file)return;const ticket=++generation;showError('');
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)){showError('Choose a JPG, PNG, or WebP image. For HEIC photos, export as JPG first.');return;}
  if(file.size>15*1024*1024){showError('This image is too large. Please choose a photo under 15 MB.');return;}
  const url=URL.createObjectURL(file);
  try{
    const img=new Image();img.src=url;await img.decode();if(ticket!==generation)return;
    const scale=Math.min(1,2400/Math.max(img.naturalWidth,img.naturalHeight));
    const buffer=document.createElement('canvas');buffer.width=Math.max(1,Math.round(img.naturalWidth*scale));buffer.height=Math.max(1,Math.round(img.naturalHeight*scale));buffer.getContext('2d').drawImage(img,0,0,buffer.width,buffer.height);photo=buffer;
    photoVersion++; detectionRun++; ocrRun++; boxes=[]; manual=false; detecting=false;
    bounds={left:.2,right:.8,top:.1,bottom:.95,line:.55,candidate:false};
    $('ocr-text').value='';$('ocr-status').textContent='Ready when you are.';$('copy-text').disabled=true;$('extract-text').disabled=false;
    $('filename').textContent=file.name;$('adjustments').hidden=false;$('detection').hidden=false;$('ocr-panel').hidden=false;$('volume-panel').hidden=false;
    syncSliders();stopCamera();draw();void runDetection();
  }catch{showError('We couldn’t read this photo. Try another JPG, PNG, or WebP image.');}finally{URL.revokeObjectURL(url);}
}
for(const id of ['file','mobile-file'])$(id).addEventListener('change',e=>{loadFile(e.target.files[0]);e.target.value='';});
$('browse').onclick=$('replace').onclick=()=>$('file').click();
$('mobile-capture').onclick=()=>$('mobile-file').click();
$('upload-tab').onclick=()=>{++generation;stopCamera();};
$('cancel-camera').onclick=()=>{++generation;stopCamera();};
for(const type of ['dragenter','dragover'])$('dropzone').addEventListener(type,e=>{e.preventDefault();$('dropzone').classList.add('dragging');});
$('dropzone').addEventListener('dragleave',()=>$('dropzone').classList.remove('dragging'));
$('dropzone').addEventListener('drop',e=>{e.preventDefault();$('dropzone').classList.remove('dragging');loadFile(e.dataTransfer.files[0]);});
$('camera-tab').onclick=async()=>{
  showError('');const ticket=++generation;
  if(!navigator.mediaDevices?.getUserMedia){showError('Live camera needs HTTPS or localhost. You can still upload a photo or use the phone photo button.');return;}
  try{
    const next=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
    if(ticket!==generation){next.getTracks().forEach(t=>t.stop());return;}
    stopCamera();stream=next;$('video').srcObject=stream;$('camera-view').hidden=false;$('dropzone').hidden=true;$('preview').hidden=true;$('camera-tab').classList.add('active');$('upload-tab').classList.remove('active');
  }catch(error){if(ticket===generation)showError(error.name==='NotAllowedError'?'Camera permission was denied. Allow camera access in your browser or upload a photo.':'No camera is available. Connect a webcam or upload a photo.');}
};
$('capture').onclick=()=>{const video=$('video');if(!video.videoWidth){showError('The camera is still starting. Try again in a moment.');return;}const c=document.createElement('canvas');c.width=video.videoWidth;c.height=video.videoHeight;c.getContext('2d').drawImage(video,0,0);c.toBlob(blob=>{if(blob)loadFile(new File([blob],'camera-capture.jpg',{type:'image/jpeg'}));},'image/jpeg',.92);};
for(const key of ['left','right','top','bottom','line'])$(key).oninput=()=>{
  if(!bounds)return;detectionRun++;detecting=false;$('retry-detection').disabled=false;$('detection-status').textContent='Using your manually selected bottle area.';if(key!=='line')invalidateOCR();bounds[key]=Number($(key).value)/100;
  bounds.left=Math.min(bounds.left,bounds.right-.05);bounds.right=Math.max(bounds.right,bounds.left+.05);
  bounds.top=Math.min(bounds.top,bounds.bottom-.05);bounds.bottom=Math.max(bounds.bottom,bounds.top+.05);bounds.line=Math.max(bounds.top,Math.min(bounds.bottom,bounds.line));
  if(key!=='line')bounds.candidate=false;
  bounds.reason='Bottle area changed. Find the water line again or adjust it manually.';
  syncSliders();manual=manual || key==='line';draw();
};
document.querySelectorAll('[data-level]').forEach(button=>button.onclick=()=>{detectionRun++;detecting=false;$('retry-detection').disabled=false;$('detection-status').textContent='Using your manually selected water level.';bounds.line=button.dataset.level==='100'?bounds.top:bounds.bottom;$('line').value=bounds.line*100;manual=true;draw();});
window.addEventListener('pagehide',()=>{++generation;stopCamera();});

function syncSliders(){for(const key of ['left','right','top','bottom','line'])$(key).value=bounds[key]*100;}
function invalidateOCR(){ocrRun++;$('extract-text').disabled=false;$('ocr-text').value='';$('copy-text').disabled=true;$('ocr-status').textContent='Bottle area changed. Extract the label again.';}
function selectBottle(index){
  const box=boxes[index];if(!box)return;
  invalidateOCR();
  const tiny=document.createElement('canvas');const scale=Math.min(1,720/Math.max(photo.width,photo.height));tiny.width=Math.max(20,Math.round(photo.width*scale));tiny.height=Math.max(20,Math.round(photo.height*scale));
  const ctx=tiny.getContext('2d',{willReadFrequently:true});ctx.drawImage(photo,0,0,tiny.width,tiny.height);
  bounds=analyzePixels(ctx.getImageData(0,0,tiny.width,tiny.height),box);manual=false;
  syncSliders();draw();
}
async function runDetection(){
  if(!photo)return;const run=++detectionRun, version=photoVersion, source=photo;detecting=true;manual=false;bounds.candidate=false;
  $('retry-detection').disabled=true;$('bottle-choice-label').hidden=true;
  $('detection-status').textContent='Loading bottle recognition… First use needs an internet connection.';draw();
  let timer;
  try{
    const found=await Promise.race([detectBottles(source),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('timeout')),60000);})]);
    if(run!==detectionRun || version!==photoVersion)return;
    boxes=found;detecting=false;
    if(!boxes.length){$('detection-status').textContent='No bottle recognized with enough confidence. Try a clearer photo, or set the bottle boundaries manually.';bounds.candidate=false;draw();return;}
    $('bottle-choice').replaceChildren(...boxes.map((box,index)=>new Option(`Bottle ${index+1} · ${Math.round(box.score*100)}% detection confidence`,index)));
    $('bottle-choice-label').hidden=boxes.length<2;
    $('detection-status').textContent=`${boxes.length} bottle${boxes.length===1?'':'s'} detected. Recognition confidence: ${Math.round(boxes[0].score*100)}%. This is not water-level confidence.`;
    selectBottle(0);
  }catch{
    if(run!==detectionRun || version!==photoVersion)return;
    detecting=false;bounds.candidate=false;$('detection-status').textContent='Bottle recognition could not load or run. Check your internet connection and retry, or set all four bottle boundaries manually.';draw();
  }finally{clearTimeout(timer);if(run===detectionRun){detecting=false;$('retry-detection').disabled=false;}}
}
$('retry-detection').onclick=runDetection;
$('bottle-choice').onchange=()=>selectBottle(Number($('bottle-choice').value));
$('extract-text').onclick=async()=>{
  if(!photo || !bounds)return;const run=++ocrRun,version=photoVersion;
  $('extract-text').disabled=true;$('copy-text').disabled=true;$('ocr-text').value='';$('ocr-status').textContent='Preparing text recognition…';
  try{
    const result=await readLabel(photo,{...bounds},(status,progress)=>{if(run===ocrRun && version===photoVersion)$('ocr-status').textContent=`${status}${Number.isFinite(progress)?` · ${Math.round(progress*100)}%`:''}`;});
    if(run!==ocrRun || version!==photoVersion)return;
    $('ocr-text').value=result.text;$('copy-text').disabled=!result.text;
    $('ocr-status').textContent=result.text?`Text extracted. OCR confidence: ${Math.round(result.confidence)}%. Review spelling and numbers.`:'No readable text found. Try a sharper, closer label photo or expand the bottle boundaries.';
  }catch{if(run===ocrRun && version===photoVersion)$('ocr-status').textContent='Text recognition failed. Try again, or use a smaller, clearer image.';}
  finally{if(run===ocrRun && version===photoVersion)$('extract-text').disabled=false;}
};
$('ocr-text').oninput=()=>{$('copy-text').disabled=!$('ocr-text').value.trim();};
$('copy-text').onclick=async()=>{try{await navigator.clipboard.writeText($('ocr-text').value);$('ocr-status').textContent='Text copied.';}catch{$('ocr-text').focus();$('ocr-text').select();$('ocr-status').textContent='Press Ctrl+C (or Cmd+C on Mac) to copy the selected text.';}};

function updateVolume(hasEstimate){
  const model=$('volume-model').value;$('shape-settings').hidden=model!=='shoulder';
  if(model==='none'){$('volume-result').textContent='';return;}
  if(!hasEstimate){$('volume-result').textContent='Confirm a water line first.';return;}
  const shoulder=Number($('shoulder-size').value),neck=Number($('neck-width').value);
  if(model==='shoulder' && (!$('shoulder-size').value || !$('neck-width').value || shoulder<1 || shoulder>60 || neck<10 || neck>100)){$('volume-result').textContent='Enter shoulder height 1–60% and neck width 10–100%.';return;}
  const value=volumePercentage(bounds.top,bounds.bottom,bounds.line,model==='cylinder'?0:shoulder/100,neck/100);
  $('volume-result').textContent=`Approx. ${value}% by volume with your selected shape. Main percentage shows water height.`;
}
for(const id of ['volume-model','shoulder-size','neck-width'])$(id).oninput=draw;
$('rescan-water').onclick=()=>{
  if(!photo || !bounds)return;
  detectionRun++;detecting=false;$('retry-detection').disabled=false;
  const tiny=document.createElement('canvas'),scale=Math.min(1,720/Math.max(photo.width,photo.height));
  tiny.width=Math.max(20,Math.round(photo.width*scale));tiny.height=Math.max(20,Math.round(photo.height*scale));
  const ctx=tiny.getContext('2d',{willReadFrequently:true});ctx.drawImage(photo,0,0,tiny.width,tiny.height);
  bounds=analyzePixels(ctx.getImageData(0,0,tiny.width,tiny.height),bounds,{exactBounds:true});manual=false;
  $('detection-status').textContent='Water-line search within your selected area. Check that the green guide encloses the bottle.';
  syncSliders();draw();
};
