import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'fs';

async function run() {
  const server = await createServer({
    server: { port: 3000 }
  });
  await server.listen();
  
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000');
  await page.waitForSelector('button');
  
  // Click "Doors & Windows" tab
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Doors & Windows')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));
  
  // Click "Add Door" button
  const buttons2 = await page.$$('button');
  for (const btn of buttons2) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Add Door')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));
  
  // Click the 3D Preview tab
  const buttons3 = await page.$$('button');
  for (const btn of buttons3) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('3D Preview')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 5000));
  
  const dataUrl1 = await page.evaluate(() => document.querySelector('canvas').toDataURL());
  fs.writeFileSync('test_csg_data_1door.txt', dataUrl1);
  
  // Click "Doors & Windows" tab again
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Doors & Windows')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));
  
  // Click "Add Door" button again
  for (const btn of buttons2) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Add Door')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 500));
  
  // Click the 3D Preview tab again
  for (const btn of buttons3) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('3D Preview')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 5000));
  
  const dataUrl2 = await page.evaluate(() => document.querySelector('canvas').toDataURL());
  fs.writeFileSync('test_csg_data_2doors.txt', dataUrl2);
  
  await browser.close();
  await server.close();
}
run();
