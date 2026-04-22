import puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';

(async () => {
    console.log("Locating standard browser to bypass security blocks...");
    const browserPaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    const executablePath = browserPaths.find(p => fs.existsSync(p));

    console.log("Opening browser for manual login...");
    const browser = await puppeteer.launch({ 
        headless: false,
        executablePath: executablePath || undefined,
        defaultViewport: null,
        userDataDir: path.join(process.cwd(), 'puppeteer_session'), // Uses the EXACT same session
        args: ['--start-maximized'] 
    });

    const page1 = await browser.newPage();
    await page1.goto('https://3dwarehouse.sketchup.com/');
    
    const page2 = await browser.newPage();
    await page2.goto('https://www.poliigon.com/login');

    console.log("Browser is open! Please take your time to log into 3D Warehouse and Poliigon.");
    console.log("When you are finished logging in to both, simply close the browser window entirely. Your session will be permanently saved for the Asset Manager!");
})();
