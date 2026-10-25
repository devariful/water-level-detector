// Bottle recognition lives in vision.js. This module estimates the visible water surface.
export function percentage(top, bottom, line) {
  if (![top, bottom, line].every(Number.isFinite) || bottom <= top) return 0;
  return Math.round(Math.max(0, Math.min(100, (bottom - line) / (bottom - top) * 100)));
}
export function statusFor(level) { return level <= 5 ? 'Empty' : level >= 95 ? 'Full' : 'Partially full'; }

// Optional rotationally symmetric shape model, not an inferred/calibrated bottle volume.
// The top shoulderFraction tapers linearly from neckRatio to full body width.
export function volumePercentage(top, bottom, line, shoulderFraction=.2, neckRatio=.4) {
  if (![top,bottom,line,shoulderFraction,neckRatio].every(Number.isFinite) || bottom<=top) return null;
  const shoulder=Math.max(0,Math.min(1,shoulderFraction));
  const neck=Math.max(.05,Math.min(1,neckRatio));
  const surface=Math.max(0,Math.min(1,(line-top)/(bottom-top)));
  const integral=y=>{
    if(!shoulder)return y;
    const z=Math.min(y,shoulder), slope=(1-neck)/shoulder;
    return neck*neck*z+neck*slope*z*z+slope*slope*z*z*z/3+Math.max(0,y-shoulder);
  };
  return Math.round(100*(integral(1)-integral(surface))/integral(1));
}

export function analyzePixels({ data, width:w, height:h }, bottle=null, {exactBounds=false}={}) {
  if(w<12 || h<12 || data.length<w*h*4) throw new Error('Image is too small to analyze');
  const gray=new Float32Array(w*h), saturated=new Uint8Array(w*h);
  for(let i=0;i<gray.length;i++){
    const r=data[i*4],g=data[i*4+1],b=data[i*4+2],max=Math.max(r,g,b),min=Math.min(r,g,b);
    gray[i]=.299*r+.587*g+.114*b;
    saturated[i]=max-min>25 && (max-min)/Math.max(max,1)>.22 ? 1:0;
  }
  const columns=new Float32Array(w);
  for(let x=2;x<w-2;x++)for(let y=Math.floor(h*.12);y<h*.92;y++)columns[x]+=Math.abs(gray[y*w+x+2]-gray[y*w+x-2])/(h*.8);
  const peak=(a,b)=>{let best=a;for(let x=a;x<b;x++)if(columns[x]>columns[best])best=x;return best;};
  const left=bottle?Math.max(0,Math.round(bottle.left*w)):peak(Math.floor(w*.08),Math.floor(w*.46));
  const right=bottle?Math.min(w-1,Math.round(bottle.right*w)):peak(Math.floor(w*.54),Math.floor(w*.92));
  const top=bottle?(exactBounds?bottle.top:bottle.top+(bottle.bottom-bottle.top)*.06):.16;
  const bottom=bottle?bottle.bottom:.9;
  const edgeStrength=Math.min(columns[left],columns[right]);
  const x0=Math.ceil(left+(right-left)*.12), x1=Math.floor(right-(right-left)*.12);
  const count=Math.max(1,x1-x0), start=Math.max(3,Math.ceil(h*(top+.05*(bottom-top))));
  const end=Math.min(h-3,Math.floor(h*(bottom-.05*(bottom-top))));
  const rowColour=new Float32Array(h);
  for(let y=0;y<h;y++)for(let x=x0;x<x1;x++)rowColour[y]+=saturated[y*w+x]/count;
  const labelMask=new Uint8Array(h), margin=Math.max(3,Math.round((bottom-top)*h*.015));
  // Mask both sides of a coloured label edge, including its antialiased border.
  for(let y=0;y<h;y++)if(rowColour[y]>.3)for(let dy=-margin;dy<=margin;dy++)if(y+dy>=0&&y+dy<h)labelMask[y+dy]=1;
  const delta=(x,y)=>(gray[(y+1)*w+x]+gray[(y+2)*w+x]-gray[(y-1)*w+x]-gray[(y-2)*w+x])/2;
  const rows=[];
  for(let y=start;y<end;y++){
    if(labelMask[y])continue;
    let strength=0,positive=0,negative=0;const bucketHits=[0,0,0,0,0],bucketCounts=[0,0,0,0,0];
    for(let x=x0;x<x1;x++){
      const d=delta(x,y),bucket=Math.min(4,Math.floor((x-x0)/count*5));bucketCounts[bucket]++;
      if(Math.abs(d)>6){bucketHits[bucket]++;if(d>0)positive++;else negative++;}
      strength+=Math.min(45,Math.abs(d));
    }
    const coverage=(positive+negative)/count,polarity=Math.max(positive,negative)/Math.max(1,positive+negative);
    const span=bucketHits.filter((n,i)=>n/Math.max(1,bucketCounts[i])>.55).length/5;
    // A monitor edge behind the bottle may continue outside both bottle boundaries.
    let outsideHits=0,outsideCount=0;
    for(const [a,b] of [[Math.max(2,left-Math.round(count*.35)),left-3],[right+3,Math.min(w-2,right+Math.round(count*.35))]])for(let x=a;x<b;x++){outsideCount++;if(Math.abs(delta(x,y))>6)outsideHits++;}
    const background=outsideCount>12 && outsideHits/outsideCount>.65;
    if(coverage<.68 || polarity<.72 || span<.8 || background)continue;
    rows.push({y,score:strength/count*coverage*polarity*span,coverage});
  }
  rows.sort((a,b)=>b.score-a.score);
  const strongest=rows[0];
  // Merge front/back meniscus edges; repeated separated surfaces are ambiguous ribs/labels.
  const separation=Math.max(5,Math.round((bottom-top)*h*.035));
  const rival=strongest&&rows.find(row=>Math.abs(row.y-strongest.y)>separation);
  const ambiguous=!!(rival && rival.score>strongest.score*.72);
  const candidate=!!((bottle || edgeStrength>8) && strongest && strongest.score>7 && !ambiguous);
  const reason=candidate?'A broad, nearly horizontal surface was found. Check the blue guide.':ambiguous?'Several similar edges could be ridges or reflections. Set the water line manually.':'No distinct water surface found outside coloured labels. Set the water line manually.';
  return {left:left/w,right:right/w,top,bottom,line:candidate?strongest.y/h:(top+bottom)/2,candidate,edgeStrength,reason,labelRows:labelMask.reduce((s,n)=>s+n,0),ambiguous};
}
