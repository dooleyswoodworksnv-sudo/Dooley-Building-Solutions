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
  
  await page.goto('http://localhost:3000/test_csg_render.html');
  await new Promise(r => setTimeout(r, 2000));
  
  const dataUrl = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    return canvas.toDataURL();
  });
  
  fs.writeFileSync('test_csg_data.txt', dataUrl);
  
  await browser.close();
  await server.close();
}
run();
