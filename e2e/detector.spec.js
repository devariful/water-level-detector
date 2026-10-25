import {test,expect} from '@playwright/test';

test('recognizes a bottle in an optional real photo using the installed model',async({page})=>{
  test.skip(!process.env.BOTTLE_TEST_IMAGE,'Set BOTTLE_TEST_IMAGE to an absolute path to a real bottle photo.');
  // Ensure recognition does not silently rely on an online model download.
  await page.route('https://storage.googleapis.com/**',route=>route.abort());
  await page.goto('/');
  await page.locator('#file').setInputFiles(process.env.BOTTLE_TEST_IMAGE);
  await expect(page.locator('#area-origin')).toContainText('Detected bottle area',{timeout:80000});
  await expect(page.locator('#rescan-water')).toBeEnabled();
  await expect(page.locator('#extract-text')).toBeEnabled();
  const area=await page.evaluate(()=>Object.fromEntries(['left','right','top','bottom'].map(key=>[key,Number(document.getElementById(key).value)])));
  expect(area.left).toBeLessThan(area.right);expect(area.top).toBeLessThan(area.bottom);
});
