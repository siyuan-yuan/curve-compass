const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/10941/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const page=await browser.newPage({viewport:{width:1440,height:1050},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173',{waitUntil:'networkidle',timeout:60000});
 await page.waitForFunction(()=>document.querySelector('.metrics strong')?.textContent!=='—');
 await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:'outputs/motion-desktop.png',fullPage:true});
 console.log('state',await page.locator('.status-bar').innerText());
 assert.equal(await page.locator('h1').count(),1);
 console.log('font',await page.evaluate(()=>document.fonts.check('500 16px Manrope')));
 // A real click must start a visible curve draw, then settle to the exact path.
 await page.getByRole('button',{name:'近1年',exact:true}).click();
 const first=await page.locator('.curve-line').first().evaluate(e=>parseFloat(getComputedStyle(e).strokeDashoffset));
 await page.waitForTimeout(350);
 const middle=await page.locator('.curve-line').first().evaluate(e=>parseFloat(getComputedStyle(e).strokeDashoffset));
 await page.waitForTimeout(1100);
 const end=await page.locator('.curve-line').first().evaluate(e=>parseFloat(getComputedStyle(e).strokeDashoffset));
 console.log('curve reveal',JSON.stringify({first,middle,end}));assert(first>middle&&end===0);
 const slider=page.getByRole('slider',{name:'按日期查看曲线'});await slider.focus();await slider.press('Home');
 const beginning=await page.locator('.readout-date').innerText();await slider.press('End');const ending=await page.locator('.readout-date').innerText();assert(beginning<ending);console.log('date input',beginning,ending);
 await page.getByRole('button',{name:'策略净值',exact:true}).click();assert.equal(await page.locator('.curve-line').count(),1);
 await page.locator('#position').selectOption('held');await page.locator('#position').selectOption('auto');
 const dl=page.waitForEvent('download');await page.getByRole('button',{name:'导出数据'}).click();console.log('download',(await dl).suggestedFilename());
 await page.getByRole('button',{name:'指数曲线',exact:true}).click();await page.getByRole('button',{name:'全部',exact:true}).click();
 for(const width of [320,375,390,414,768,1440]){await page.setViewportSize({width,height:900});await page.waitForTimeout(180);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);console.log('width',width,'overflow',overflow);assert(!overflow);}
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(1200);await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(100);await page.screenshot({path:'outputs/motion-mobile.png',fullPage:true});
 // Reduced-motion must show complete curves and readable content without transitions.
 await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'近3年',exact:true}).click();
 const reduced=await page.locator('.curve-line').first().evaluate(e=>({animation:getComputedStyle(e).animationName,offset:getComputedStyle(e).strokeDashoffset}));assert.equal(reduced.animation,'none');assert.equal(parseFloat(reduced.offset),0);
 await page.setViewportSize({width:1440,height:1050});await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:'outputs/motion-reduced.png',fullPage:true});
 console.log('reduced',reduced,'errors',errors);assert.equal(errors.length,0);
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});

