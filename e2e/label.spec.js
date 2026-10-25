import {test,expect} from '@playwright/test';
async function selectArea(page){
  await page.locator('#draw-area').click();
  const rect=await page.locator('#canvas').boundingBox();
  await page.mouse.move(rect.x+rect.width*.2,rect.y+rect.height*.1);
  await page.mouse.down();
  await page.mouse.move(rect.x+rect.width*.8,rect.y+rect.height*.95,{steps:5});
  await page.mouse.up();
  await expect(page.locator('#area-origin')).toContainText('Manually selected');
}

test('extracts actual label text and recovers safely when bottle model is unavailable',async({page})=>{
  await page.route('https://storage.googleapis.com/**',route=>route.abort());
  await page.route('**/models/bottle/**',route=>route.abort());
  await page.goto('/');
  const image=await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=900;c.height=500;
    const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,900,500);
    ctx.fillStyle='black';ctx.font='bold 48px Arial';ctx.fillText('MINERAL WATER',220,200);ctx.fillText('500 ml',250,300);
    return c.toDataURL().split(',')[1];
  });
  await page.locator('#file').setInputFiles({name:'label.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});
  await expect(page.locator('#detection-status')).toContainText('could not load',{timeout:70000});
  await expect(page.locator('#bottle-number')).toHaveText('—%');
  await expect(page.locator('#area-origin')).toHaveText('No bottle boundary confirmed yet.');
  await expect(page.locator('#extract-text')).toBeDisabled();
  await expect(page.locator('#rescan-water')).toBeDisabled();
  await selectArea(page);
  await page.locator('#extract-text').click();
  await expect(page.locator('#ocr-status')).toContainText('Text extracted',{timeout:60000});
  await expect(page.locator('#ocr-text')).toHaveValue(/MINERAL WATER/);
  await expect(page.locator('#ocr-text')).toHaveValue(/500/);
  await page.locator('[data-level="100"]').click();
  await expect(page.locator('#result-title')).toHaveText('Full');
  await page.locator('#volume-model').selectOption('shoulder');
  await expect(page.locator('#volume-result')).toContainText('100% by volume');
  await page.locator('#neck-width').fill('0');
  await expect(page.locator('#volume-result')).toContainText('Enter shoulder height');
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('rescans a selected bottle area while ignoring a blue label and curved ribs',async({page})=>{
  await page.route('https://storage.googleapis.com/**',route=>route.abort());
  await page.route('**/models/bottle/**',route=>route.abort());
  await page.goto('/');
  const image=await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=300;c.height=400;
    const ctx=c.getContext('2d'),img=ctx.createImageData(300,400);
    for(let y=0;y<400;y++)for(let x=0;x<300;x++){
      let rgb=[240,240,240];
      if(x>=60&&x<=240){
        const v=y>=245?170:205;rgb=[v,v,v];
        if(y>=90&&y<=170)rgb=[30,80,160];
        for(const rib of [280,320,350])if(Math.abs(y-rib-12*Math.sin((x-60)/180*Math.PI*2))<2)rgb=[45,45,45];
      }
      img.data.set([...rgb,255],(y*300+x)*4);
    }
    ctx.putImageData(img,0,0);return c.toDataURL().split(',')[1];
  });
  await page.locator('#file').setInputFiles({name:'label-and-ribs.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});
  await expect(page.locator('#rescan-water')).toBeVisible();
  await selectArea(page);
  await page.locator('#rescan-water').click();
  await expect(page.locator('#result-badge')).toHaveText('CHECK ESTIMATE');
  await expect(page.locator('#result-description')).toContainText('horizontal surface');
  const percent=Number((await page.locator('#bottle-number').textContent()).replace('%',''));
  expect(percent).toBeGreaterThanOrEqual(39);expect(percent).toBeLessThanOrEqual(41);
  await page.locator('#volume-model').selectOption('cylinder');
  await expect(page.locator('#volume-result')).toContainText(`${percent}% by volume`);
});
