import {test,expect} from '@playwright/test';
test('extracts actual label text and recovers safely when bottle model is unavailable',async({page})=>{
  await page.route('https://storage.googleapis.com/**',route=>route.abort());
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
  await page.locator('#extract-text').click();
  await expect(page.locator('#ocr-status')).toContainText('Text extracted',{timeout:60000});
  await expect(page.locator('#ocr-text')).toHaveValue(/MINERAL WATER/);
  await expect(page.locator('#ocr-text')).toHaveValue(/500/);
  await page.locator('[data-level="100"]').click();
  await expect(page.locator('#result-title')).toHaveText('Full');
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
