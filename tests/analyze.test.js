import {test} from 'node:test';
import assert from 'node:assert/strict';
import {percentage,statusFor,analyzePixels} from '../src/analyze.js';
test('water height maps to empty, half, and full and clamps outside bounds',()=>{
 assert.equal(percentage(.1,.9,.9),0);assert.equal(percentage(.1,.9,.5),50);assert.equal(percentage(.1,.9,.1),100);
 assert.equal(percentage(.1,.9,1),0);assert.equal(percentage(.1,.9,0),100);assert.equal(percentage(.9,.1,.5),0);
 assert.equal(statusFor(0),'Empty');assert.equal(statusFor(50),'Partially full');assert.equal(statusFor(100),'Full');
});
function fixture(w,h,fn){const data=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=fn(x,y);data.set([v,v,v,255],(y*w+x)*4);}return {width:w,height:h,data};}
test('uniform photo does not fabricate a detected level',()=>{
 const result=analyzePixels(fixture(240,320,()=>255));assert.equal(result.candidate,false);
});
test('detects a clear silhouette and interior horizontal line in a controlled fixture',()=>{
 const result=analyzePixels(fixture(240,320,(x,y)=>x>=70&&x<=170?(y>=180?100:210):250));
 assert.equal(result.candidate,true);assert.ok(Math.abs(result.left-70/240)<.03);assert.ok(Math.abs(result.right-170/240)<.03);assert.ok(Math.abs(result.line-180/320)<.02);
});
