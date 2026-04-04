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
  
  // Wait for app to load
  await page.waitForSelector('button');
  
  // Click "Doors & Windows" tab
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Doors & Windows')) {
      await btn.click();
      console.log('Clicked Doors & Windows');
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
      console.log('Clicked Add Door');
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
      console.log('Clicked 3D Preview');
      break;
    }
  }
  
  await new Promise(r => setTimeout(r, 5000));
  
  await browser.close();
  await server.close();
}
run();
