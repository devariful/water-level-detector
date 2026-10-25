// A local edge-based visual estimate, not a trained bottle recognition model.
export function percentage(top, bottom, line) {
  if (![top, bottom, line].every(Number.isFinite) || bottom <= top) return 0;
  return Math.round(Math.max(0, Math.min(100, (bottom - line) / (bottom - top) * 100)));
}
export function statusFor(level) { return level <= 5 ? 'Empty' : level >= 95 ? 'Full' : 'Partially full'; }
export function analyzePixels({ data, width: w, height: h }) {
  const gray = new Float32Array(w * h);
  for (let i = 0; i < gray.length; i++) gray[i] = .299 * data[i*4] + .587 * data[i*4+1] + .114 * data[i*4+2];
  const columns = new Float32Array(w);
  for (let x = 2; x < w-2; x++) for(let y = Math.floor(h*.12); y < h*.92; y++) columns[x] += Math.abs(gray[y*w+x+2]-gray[y*w+x-2]) / (h*.8);
  const peak = (a,b) => { let best = a; for(let x=a;x<b;x++) if(columns[x]>columns[best]) best=x; return best; };
  const left = peak(Math.floor(w*.08),Math.floor(w*.46));
  const right = peak(Math.floor(w*.54),Math.floor(w*.92));
  const edgeStrength = Math.min(columns[left], columns[right]);
  // Interior horizontal changes can be a meniscus, but labels and reflections can look similar.
  const top = .16, bottom = .9;
  const scores = [];
  for(let y=Math.floor(h*.23); y<h*.85;y++) {
    let sum=0, count=0;
    for(let x=Math.ceil(left+(right-left)*.15);x<right-(right-left)*.15;x++) {
      sum += Math.abs(gray[(y+2)*w+x]-gray[(y-2)*w+x]); count++;
    }
    scores.push({y, score: sum/Math.max(1,count)});
  }
  scores.sort((a,b)=>b.score-a.score);
  const strongest=scores[0] || {y:h*.55,score:0};
  const average=scores.reduce((s,r)=>s+r.score,0)/Math.max(1,scores.length);
  const candidate = edgeStrength > 8 && strongest.score > 6 && strongest.score > average*2;
  return {left:left/w,right:right/w,top,bottom,line:candidate?strongest.y/h:.55,candidate,edgeStrength};
}
