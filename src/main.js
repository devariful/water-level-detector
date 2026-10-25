import './style.css';
import {analyzePixels, percentage, statusFor} from './analyze.js';

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
<div id="adjustments" hidden><div class="adjust-heading"><strong>Refine your estimate</strong><span>Drag the sliders</span></div><p class="adjust-help">Set the top of the usable bottle, its bottom, and the visible water line.</p><label>Bottle top <input id="top" type="range" min="0" max="95" step="0.5" value="16"></label><label>Bottle bottom <input id="bottom" type="range" min="5" max="100" step="0.5" value="90"></label><label>Water line <input id="line" type="range" min="0" max="100" step="0.5" value="55"></label><div class="quick-actions"><button data-level="0">Mark empty</button><button data-level="100">Mark full</button></div></div>
<div class="result-note">${icon('drop')}<span>Visual estimate, not a volume measurement.<br>Best with transparent, unlabelled bottles.</span></div></div></section>
<section class="features"><div><span class="feature-icon">${icon('camera')}</span><div><h3>Capture your way</h3><p>Phone, webcam, or a saved photo.</p></div></div><div><span class="feature-icon">${icon('drop')}</span><div><h3>Every level, from 0 to 100</h3><p>Empty, full, and everything in between.</p></div></div><div><span class="feature-icon">${icon('shield')}</span><div><h3>Your photos stay yours</h3><p>Processed here. Never uploaded.</p></div></div></section>
<footer><span>Made for a clearer everyday.</span><span>CLARITY <span class="footer-dot">•</span> EVERY DROP COUNTS</span></footer></main>`;

const $ = id => document.getElementById(id);
let photo=null, bounds=null, stream=null, manual=false, generation=0;
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
  ctx.fillStyle='#12b5c52b';ctx.fillRect(x,bounds.line*h,r-x,(bounds.bottom-bounds.line)*h);
  const level=percentage(bounds.top,bounds.bottom,bounds.line), hasEstimate=bounds.candidate||manual;
  $('bottle-water').style.height=hasEstimate?`${level}%`:'0%';$('bottle-number').innerHTML=hasEstimate?`${level}<small>%</small>`:'—<small>%</small>';
  $('result-title').textContent=hasEstimate?statusFor(level):'Help us find the water line';
  $('result-description').textContent=manual?'Your adjusted estimate of water height.':bounds.candidate?'Suggested water line found. Check the overlay and adjust below.':'No reliable line found. Set the guides below to measure the water height.';
  $('result-badge').textContent=manual?'MANUALLY ADJUSTED':bounds.candidate?'CHECK ESTIMATE':'NEEDS ADJUSTMENT';
}
async function loadFile(file){
  if(!file)return;const ticket=++generation;showError('');
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)){showError('Choose a JPG, PNG, or WebP image. For HEIC photos, export as JPG first.');return;}
  if(file.size>15*1024*1024){showError('This image is too large. Please choose a photo under 15 MB.');return;}
  const url=URL.createObjectURL(file);
  try{
    const img=new Image();img.src=url;await img.decode();if(ticket!==generation)return;
    const scale=Math.min(1,1200/Math.max(img.naturalWidth,img.naturalHeight));
    const buffer=document.createElement('canvas');buffer.width=Math.max(1,Math.round(img.naturalWidth*scale));buffer.height=Math.max(1,Math.round(img.naturalHeight*scale));buffer.getContext('2d').drawImage(img,0,0,buffer.width,buffer.height);photo=buffer;
    const tiny=document.createElement('canvas');tiny.width=240;tiny.height=Math.max(20,Math.round(photo.height/photo.width*240));
    if(tiny.height>1200)tiny.height=1200;
    const ctx=tiny.getContext('2d',{willReadFrequently:true});ctx.drawImage(photo,0,0,tiny.width,tiny.height);bounds=analyzePixels(ctx.getImageData(0,0,tiny.width,tiny.height));manual=false;
    ['top','bottom','line'].forEach(key=>$(key).value=bounds[key]*100);
    $('filename').textContent=file.name;$('adjustments').hidden=false;stopCamera();draw();
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
for(const key of ['top','bottom','line'])$(key).oninput=()=>{
  if(!bounds)return;bounds[key]=Number($(key).value)/100;
  bounds.top=Math.min(bounds.top,bounds.bottom-.05);bounds.bottom=Math.max(bounds.bottom,bounds.top+.05);bounds.line=Math.max(bounds.top,Math.min(bounds.bottom,bounds.line));
  for(const k of ['top','bottom','line'])$(k).value=bounds[k]*100;manual=true;draw();
};
document.querySelectorAll('[data-level]').forEach(button=>button.onclick=()=>{bounds.line=button.dataset.level==='100'?bounds.top:bounds.bottom;$('line').value=bounds.line*100;manual=true;draw();});
window.addEventListener('pagehide',()=>{++generation;stopCamera();});
