const {chromium}=require('C:/Users/10941/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe"});const page=await browser.newPage({viewport:{width:1512,height:1050},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173',{waitUntil:'networkidle',timeout:60000});
 await page.waitForFunction(()=>document.querySelector('.metrics strong')?.textContent!=='—',{timeout:30000});
 await page.screenshot({path:'outputs/desktop.png',fullPage:true});
 console.log('desktop',await page.locator('.signal-title').innerText(),await page.locator('.status-bar').innerText());
 await page.getByRole('button',{name:'策略净值',exact:true}).click();await page.getByRole('button',{name:'近1年',exact:true}).click();console.log('net path',await page.locator('.chart-svg path').count());
 await page.locator('#position').selectOption('held');console.log('holding',await page.locator('.signal-title').innerText());
 await page.locator('#position').selectOption('auto');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'导出数据'}).click();console.log('download',(await download).suggestedFilename());
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'指数曲线',exact:true}).click();await page.screenshot({path:'outputs/mobile.png',fullPage:true});
 console.log('mobile overflow',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));console.log('errors',JSON.stringify(errors));
 await browser.close();if(errors.length)process.exitCode=1;
})();

