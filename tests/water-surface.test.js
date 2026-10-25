import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyzePixels, volumePercentage} from '../src/analyze.js';
const box={left:.2,right:.8,top:.1,bottom:.95};
function scene(pixel){
  const width=300,height=400,data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const rgb=x>=60&&x<=240?pixel(x,y):[240,240,240];
    data.set([...rgb,255],(y*width+x)*4);
  }
  return {width,height,data};
}
test('ignores a stronger blue label and curved ribs in favour of the water surface',()=>{
  const image=scene((x,y)=>{
    if(y>=90&&y<=170)return [30,80,160];
    for(const rib of [280,320,350])if(Math.abs(y-rib-12*Math.sin((x-60)/180*Math.PI*2))<2)return [45,45,45];
    const v=y>=245?170:205;return [v,v,v];
  });
  const result=analyzePixels(image,box);
  assert.equal(result.candidate,true);assert.ok(result.labelRows>70);
  assert.ok(Math.abs(result.line*400-245)<4);
});
test('a label alone is not a water surface',()=>{
  const result=analyzePixels(scene((x,y)=>y>=90&&y<=170?[30,80,160]:[205,205,205]),box);
  assert.equal(result.candidate,false);
});
test('repeated horizontal ribs are ambiguous rather than a fabricated percentage',()=>{
  const result=analyzePixels(scene((x,y)=>{const v=[210,260,310].some(r=>Math.abs(y-r)<3)?100:205;return [v,v,v];}),box);
  assert.equal(result.candidate,false);assert.equal(result.ambiguous,true);
});
test('a continuous background edge is rejected',()=>{
  const image=scene(()=>[205,205,205]);
  for(let y=200;y<400;y++)for(let x=0;x<300;x++)image.data.set([100,100,100,255],(y*300+x)*4);
  assert.equal(analyzePixels(image,box).candidate,false);
});
test('manual area rescan preserves the user top and bottom',()=>{
  const result=analyzePixels(scene((x,y)=>{const v=y<245?205:170;return [v,v,v];}),box,{exactBounds:true});
  assert.equal(result.top,box.top);assert.equal(result.bottom,box.bottom);
});
test('shape integration distinguishes height from volume, with valid endpoints',()=>{
  assert.equal(volumePercentage(0,1,.6,0),40);
  // Upper 20% is a frustum with radius ratio .4: Vtotal=.8+.2*(1+.4+.16)/3=.904.
  assert.equal(volumePercentage(0,1,.6,.2,.4),44);
  assert.equal(volumePercentage(0,1,0),100);assert.equal(volumePercentage(0,1,1),0);
  assert.equal(volumePercentage(0,1,-1),100);assert.equal(volumePercentage(1,0,.5),null);
});
