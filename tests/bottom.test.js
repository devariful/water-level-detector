import {test} from 'node:test';
import assert from 'node:assert/strict';
import {refineBottleBottom} from '../src/bottom.js';
import {analyzePixels,percentage} from '../src/analyze.js';
const box={left:.3,right:.7,top:.1,bottom:.7};
function fixture(fn){
  const width=200,height=300,data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const v=fn(x,y);data.set([v,v,v,255],(y*width+x)*4);}
  return {width,height,data};
}
test('extends a truncated box to a local edge where both sidewalls end',()=>{
  const image=fixture((x,y)=>x>=60&&x<140&&y>=30&&y<240?150:240);
  const result=refineBottleBottom(image,box);
  assert.equal(result.bottomRefined,true);assert.ok(Math.abs(result.bottom-.8)<.015);
});
test('an internal rib does not become the bottom while sidewalls continue',()=>{
  const image=fixture((x,y)=>x>=60&&x<140&&y>=30?(Math.abs(y-225)<2?40:150):240);
  const result=refineBottleBottom(image,box);
  assert.equal(result.bottomRefined,false);assert.equal(result.bottom,box.bottom);
});
test('a monitor edge crossing the entire scene is not accepted as the base',()=>{
  const image=fixture((x,y)=>y>=240?20:x>=60&&x<140&&y>=30?150:240);
  assert.equal(refineBottleBottom(image,box).bottomRefined,false);
});
test('no clear base preserves the uncertain detector boundary',()=>{
  const result=refineBottleBottom(fixture(()=>200),box);
  assert.equal(result.bottom,box.bottom);assert.equal(result.bottomRefined,false);
});
test('water analysis no longer silently cuts three percent off the bottom',()=>{
  const result=analyzePixels(fixture((x,y)=>y<180?200:150),box);
  assert.equal(result.bottom,box.bottom);
  assert.equal(percentage(.1,.7,.6),17);assert.equal(percentage(.1,.8,.6),29);
});
