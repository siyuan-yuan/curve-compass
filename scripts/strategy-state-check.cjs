const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/10941/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const p=await b.newPage({viewport:{width:1440,height:1000}});await p.addInitScript(()=>localStorage.setItem('curve-position','held'));
 let fixture;await p.route('**/api/market',r=>r.fulfill({json:fixture}));
 for(const [held,signal,title] of [[false,'buy','买入信号'],[true,'sell','清仓信号'],[false,'wait','空仓等待'],[true,'hold','继续持有']]){
  fixture={position:held,signal,fresh:true,asOf:'2026-10-19',checkedAt:'2026-10-19T12:00:00Z',trades:[],totalReturn:0,cagr:0,maxDrawdown:0,rows:[{date:'2026-10-19',equity:signal==='buy'?1100:signal==='sell'?2800:2500,yellow:2700,blue:1000,distance:signal==='buy'?100:signal==='sell'?1800:1500,nav:1,position:held,signal}]};
  await p.goto('http://127.0.0.1:5173',{waitUntil:'networkidle'});
  await p.waitForFunction(t=>document.querySelector('.signal-title')?.textContent===t,title,{timeout:7000});
  assert.equal(await p.getByRole('combobox').count(),0);assert.equal(await p.getByText('我的持仓状态',{exact:true}).count(),0);
  console.log('PASS strategy state:',title,'despite old manual holding preference');
 }
 for(const width of [320,390,768,1440]){await p.setViewportSize({width,height:900});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 console.log('PASS responsive layout after selector removal');
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
