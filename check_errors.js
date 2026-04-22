import { createServer } from 'vite';
import puppeteer from 'puppeteer';

async function run() {
  const server = await createServer({
    server: { port: 3000 }
  });
  await server.listen();
  
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', err => console.log('ERROR:', err.message));
  
  await page.goto('http://localhost:3000');
  
  // Click the 3D Preview tab
  await page.waitForSelector('button');
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('3D Preview')) {
      await btn.click();
      console.log('Clicked 3D Preview');
      break;
    }
  }
  
  await new Promise(r => setTimeout(r, 5000));
  
  await browser.close();
  await server.close();
}
run();
