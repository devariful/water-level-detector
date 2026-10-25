// Refine an object detector's approximate bottom using a local silhouette closure.
// This finds an OUTER base candidate, not the invisible inner floor of thick plastic.
export function refineBottleBottom({data,width:w,height:h}, box) {
  const result={...box,bottomRefined:false,bottomReason:'The bottom is an approximate detector boundary. Check the 0% guide against the inside base.'};
  if(w<20 || h<20 || box.right<=box.left || box.bottom<=box.top)return result;
  const gray=new Float32Array(w*h);
  for(let i=0;i<gray.length;i++)gray[i]=.299*data[i*4]+.587*data[i*4+1]+.114*data[i*4+2];
  const left=box.left*w,right=box.right*w,width=right-left,height=(box.bottom-box.top)*h;
  const band=Math.max(2,Math.round(width*.14)),gap=Math.max(3,Math.round(height*.025));
  const x0=Math.max(2,Math.round(left+width*.2)),x1=Math.min(w-3,Math.round(right-width*.2));
  const start=Math.max(gap+3,Math.round(box.bottom*h-height*.06));
  const end=Math.min(h-gap-4,Math.round(box.bottom*h+height*.22));
  const vertical=(x,y)=>Math.abs(gray[y*w+x+2]-gray[y*w+x-2]);
  const horizontal=(x,y)=>Math.abs(gray[(y+2)*w+x]-gray[(y-2)*w+x]);
  const side=(center,y)=>{
    let best=0;
    for(let x=Math.max(2,Math.round(center-band));x<=Math.min(w-3,Math.round(center+band));x++)best=Math.max(best,vertical(x,y));
    return best;
  };
  const candidates=[];
  for(let y=start;y<=end;y++){
    let hits=0,strength=0,n=0;
    for(let x=x0;x<=x1;x++){const d=horizontal(x,y);n++;if(d>10)hits++;strength+=Math.min(60,d);}
    if(!n || hits/n<.55)continue;
    let outsideHits=0,outsideN=0;
    for(const [a,b] of [[left-width*.45,left-width*.12],[right+width*.12,right+width*.45]]){
      for(let x=Math.max(2,Math.ceil(a));x<=Math.min(w-3,Math.floor(b));x++){outsideN++;if(horizontal(x,y)>10)outsideHits++;}
    }
    if(outsideN && outsideHits/outsideN>.4)continue; // e.g. a monitor or table edge
    let aboveLeft=0,aboveRight=0,belowLeft=0,belowRight=0;
    for(let d=gap;d<gap*2;d++){
      const a=Math.max(2,y-d),b=Math.min(h-3,y+d);
      aboveLeft+=side(left,a)/gap;aboveRight+=side(right,a)/gap;
      belowLeft+=side(left,b)/gap;belowRight+=side(right,b)/gap;
    }
    // Both sides must end here; a rib inside continuing sidewalls is not a base.
    if(Math.min(aboveLeft,aboveRight)<12 || belowLeft>aboveLeft*.55 || belowRight>aboveRight*.55)continue;
    candidates.push({y,score:strength/n*(hits/n)});
  }
  candidates.sort((a,b)=>b.score-a.score);
  if(!candidates.length)return result;
  const best=candidates[0],rival=candidates.find(c=>Math.abs(c.y-best.y)>gap*2);
  if(rival && rival.score>best.score*.75)return {...result,bottomReason:'Several possible base edges were found. Click Set bottom on photo to choose the inside base.'};
  return {...result,bottom:best.y/h,bottomRefined:true,bottomReason:'Outer base edge suggested from ending sidewalls. Check the 0% guide; the inner floor may be slightly above it.'};
}
