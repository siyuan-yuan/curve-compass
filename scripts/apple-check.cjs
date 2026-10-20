const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/10941/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173',{waitUntil:'networkidle',timeout:60000});await page.waitForFunction(()=>document.querySelector('.metrics strong')?.textContent!=='—');
 assert.equal(await page.getByRole('combobox').count(),0);
 await page.screenshot({path:'outputs/apple-light.png',fullPage:true});
 // Rapid reversals must retain the live indicator and settle on the final choice.
 await page.getByRole('button',{name:'近1年',exact:true}).click();await page.waitForTimeout(70);
 const during=await page.locator('.range-switch').evaluate(e=>parseFloat(e.style.getPropertyValue('--range')));
 await page.getByRole('button',{name:'全部',exact:true}).click();await page.waitForTimeout(900);
 const settled=await page.locator('.range-switch').evaluate(e=>parseFloat(e.style.getPropertyValue('--range')));
 console.log('interruptible spring',JSON.stringify({during,settled}));assert(during>0&&during<4);assert.equal(settled,4);
 const slider=page.getByRole('slider',{name:'按日期查看曲线'});await slider.focus();await slider.press('Home');const first=await page.locator('.readout-date').innerText();await slider.press('End');assert(first<await page.locator('.readout-date').innerText());
 await page.getByRole('button',{name:'策略净值',exact:true}).click();assert.equal(await page.locator('.curve-line').count(),1);
 const dl=page.waitForEvent('download');await page.getByRole('button',{name:'导出数据'}).click();console.log('export',(await dl).suggestedFilename());
 await page.getByRole('button',{name:'指数曲线',exact:true}).click();
 for(const mode of ['light','dark']){await page.emulateMedia({colorScheme:mode});for(const width of [320,375,390,414,768,1440]){await page.setViewportSize({width,height:950});await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${mode} ${width}`);}console.log('responsive',mode,'6 widths passed');}
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:'outputs/apple-dark.png',fullPage:true});
 await page.emulateMedia({colorScheme:'light'});await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:'outputs/apple-mobile.png',fullPage:true});
 await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'近3年',exact:true}).click();const reduced=await page.locator('.range-switch').evaluate(e=>parseFloat(e.style.getPropertyValue('--range')));assert.equal(reduced,1);assert.equal(await page.locator('.curve-line').first().evaluate(e=>parseFloat(getComputedStyle(e).strokeDashoffset)),0);
 const styles=await page.locator('.sidebar').evaluate(e=>({blur:getComputedStyle(e).backdropFilter,shadow:getComputedStyle(e).boxShadow}));assert.notEqual(styles.blur,'none');console.log('glass',styles);
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'},{name:'prefers-contrast',value:'more'}]});
 const accessible=await page.locator('.sidebar').evaluate(e=>({blur:getComputedStyle(e).backdropFilter,outline:getComputedStyle(e).outlineStyle}));
 assert.equal(accessible.blur,'none');assert.equal(accessible.outline,'solid');console.log('PASS reduced transparency and increased contrast',accessible);
 assert.equal(errors.length,0);console.log('PASS reduced motion, export, single strategy state, no browser errors');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
