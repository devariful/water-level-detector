import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bottleBoxes,mergeBottleBoxes} from '../src/vision.js';
import {analyzePixels} from '../src/analyze.js';
test('only confident bottles qualify, and boxes are clamped and sorted',()=>{
 const boxes=bottleBoxes([
  {class:'person',score:.99,bbox:[0,0,50,100]},
  {class:'bottle',score:.3,bbox:[0,0,50,100]},
  {class:'bottle',score:.7,bbox:[-10,10,40,100]},
  {class:'bottle',score:.95,bbox:[50,0,80,200]},
 ],100,200);
 assert.equal(boxes.length,2);assert.equal(boxes[0].right,1);assert.equal(boxes[1].left,0);assert.equal(boxes[0].score,.95);
});
test('empty detections never become bottle candidates',()=>assert.deepEqual(bottleBoxes([],100,100),[]));
test('merges overlapping crop detections and prioritizes the foreground bottle',()=>{
 const primary={left:.3,right:.6,top:.1,bottom:.9,score:.8};
 const duplicate={left:.31,right:.61,top:.1,bottom:.9,score:.7};
 const small={left:.8,right:.86,top:.8,bottom:.95,score:.99};
 const result=mergeBottleBoxes([small,duplicate,primary]);
 assert.equal(result.length,2);assert.deepEqual(result[0],primary);assert.deepEqual(result[1],small);
});
test('water analysis searches an off-centre detected bottle, ignoring background line',()=>{
 const width=300,height=300,data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const inside=x>=210&&x<270;const value=inside?(y>=180?100:210):(y>=100?0:255);
  data.set([value,value,value,255],(y*width+x)*4);
 }
 const r=analyzePixels({data,width,height},{left:.7,right:.9,top:.1,bottom:.9});
 assert.equal(r.candidate,true);assert.ok(Math.abs(r.line-.6)<.02);assert.equal(r.left,.7);
});
