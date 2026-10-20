const encoder=new TextEncoder();
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const emailReady=env=>Boolean(env.NOTIFICATIONS_DB&&env.RESEND_API_KEY&&env.EMAIL_TOKEN_SECRET&&env.EMAIL_FROM);
const base=env=>env.PUBLIC_URL||'https://curvecompass.top';
export function normalizeEmail(value){const email=String(value||'').trim().toLowerCase();return email.length<=254&&/^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email)?email:null;}
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
const hash=async s=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(s)));
const b64=s=>btoa(s).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const unb64=s=>atob(s.replaceAll('-','+').replaceAll('_','/'));
async function key(env){return crypto.subtle.importKey('raw',encoder.encode(env.EMAIL_TOKEN_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function makeToken(env,id,kind,expires){const data=b64(JSON.stringify({id,kind,expires}));return data+'.'+b64(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC',await key(env),encoder.encode(data)))));}
export async function readToken(env,token,kind,now=Date.now()){try{if(typeof token!=='string'||token.length>1024)return null;const [data,signature,...extra]=token.split('.');if(extra.length||!signature)return null;const bytes=Uint8Array.from(unb64(signature),c=>c.charCodeAt(0));if(!await crypto.subtle.verify('HMAC',await key(env),bytes,encoder.encode(data)))return null;const payload=JSON.parse(unb64(data));return payload.kind===kind&&payload.expires>now&&typeof payload.id==='string'?payload:null;}catch{return null;}}
async function limit(db,key,max,expires){const r=await db.prepare('INSERT INTO email_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,expires).first();return r.count<=max;}
async function send(env,to,subject,text,id,fetcher){const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify({from:env.EMAIL_FROM,to:[to],subject,text}),signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Email delivery unavailable');const result=await response.json();if(!result.id)throw Error('Email delivery unavailable');return result.id;}
function page(title,message,action){return new Response(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${esc(title)} · 曲线罗盘</title><style>body{font-family:system-ui,sans-serif;background:#f5f5f7;color:#1d1d1f;margin:0;padding:48px 20px}main{max-width:460px;margin:auto;padding:28px;background:white;border-radius:24px}h1{font-size:24px}p{line-height:1.8;color:#6e6e73}button,a{display:inline-block;background:#0066cc;color:white;border:0;border-radius:99px;padding:13px 22px;font:inherit;text-decoration:none;cursor:pointer}</style><main><h1>${esc(title)}</h1><p>${esc(message)}</p>${action||'<a href="/">返回曲线罗盘</a>'}</main></html>`,{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"}});}
export async function handleEmailRequest(request,env,{fetcher=fetch,now=Date.now()}={}){
 const url=new URL(request.url),path=url.pathname;
 if(!path.startsWith('/api/email/')&&!path.startsWith('/email/'))return null;
 if(path==='/api/email/status'&&request.method==='GET')return json({ready:emailReady(env)});
 if(!(path.startsWith('/email/')?env.NOTIFICATIONS_DB&&env.EMAIL_TOKEN_SECRET:emailReady(env)))return path.startsWith('/api/')?json({error:'邮件通知尚未开放，请稍后再试。'},503):page('暂时无法处理','邮件服务正在配置，请稍后再试。');
 const db=env.NOTIFICATIONS_DB;
 if(request.method==='POST'&&request.headers.get('Origin')!==url.origin)return json({error:'请求来源无效。'},403);
 if(path==='/api/email/subscribe'&&request.method==='POST'){
  if(!request.headers.get('Content-Type')?.includes('application/json'))return json({error:'请求格式无效。'},415);
  if(Number(request.headers.get('Content-Length')||0)>2048)return json({error:'请求过大。'},413);
  let body;try{const text=await request.text();if(text.length>2048)return json({error:'请求过大。'},413);body=JSON.parse(text);}catch{return json({error:'请求格式无效。'},400);}
  const email=normalizeEmail(body.email);if(!email||body.consent!==true)return json({error:'请填写有效邮箱，并同意接收买卖信号邮件。'},400);
  const hour=Math.floor(now/3600000),day=Math.floor(now/86400000),ip=request.headers.get('CF-Connecting-IP')||'local';
  const ipHash=await hash(env.EMAIL_TOKEN_SECRET+ip),emailHash=await hash(email);
  if(!await limit(db,`ip:${ipHash}:${hour}`,5,now+7200000)||!await limit(db,`address:${emailHash}:${hour}`,3,now+7200000)||!await limit(db,`verify:${day}`,30,now+172800000))return json({error:'请求较频繁，请稍后再试。'},429);
  const existing=await db.prepare('SELECT id FROM email_subscribers WHERE email=?').bind(email).first();const id=existing?.id||crypto.randomUUID();
  if(!await limit(db,`total:${day}`,90,now+172800000))return json({error:'邮件发送繁忙，请稍后再试。'},429);
  const token=await makeToken(env,id,'verify',now+30*60000),pendingHash=await hash(token);
  await db.prepare('INSERT INTO email_subscribers(id,email,pending_hash,expires_at,created_at) VALUES(?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET pending_hash=excluded.pending_hash,expires_at=excluded.expires_at').bind(id,email,pendingHash,now+30*60000,now).run();
  const link=base(env)+'/email/verify?token='+encodeURIComponent(token);
  try{await send(env,email,'确认订阅曲线罗盘买卖信号',`请打开以下链接，再点击“确认订阅”，完成邮箱验证（30分钟内有效）：\n${link}\n\n验证后，仅在最新收盘数据触发买入或清仓信号时通知，每个信号只发一次。每封信均可退订。若不是你发起的请求，请忽略此邮件。`, 'verify-'+pendingHash,fetcher);}catch{return json({error:'验证邮件暂未发送成功，请稍后重试。'},502);}
  return json({message:'验证邮件已提交发送，请检查收件箱及垃圾邮件，点击链接后确认订阅。'});
 }
 if((path==='/email/verify'||path==='/email/unsubscribe')&&['GET','POST'].includes(request.method)){
  const kind=path.endsWith('verify')?'verify':'unsubscribe',token=url.searchParams.get('token'),payload=await readToken(env,token,kind,now);
  if(!payload)return page('链接已失效','请返回网站重新申请邮件订阅。');
  const row=await db.prepare('SELECT * FROM email_subscribers WHERE id=?').bind(payload.id).first();
  if(!row)return page(kind==='unsubscribe'?'已退订':'链接已失效',kind==='unsubscribe'?'已停止发送邮件，邮箱记录已删除。':'请重新申请订阅。');
  if(kind==='verify'&&(row.pending_hash!==await hash(token)||row.expires_at<=now))return page('链接已失效','验证链接已使用或过期，请重新申请订阅。');
  if(request.method==='GET')return page(kind==='verify'?'确认邮件订阅':'取消邮件订阅',kind==='verify'?'确认后，在网站关闭时也可收到新买卖信号邮件。':'确认后将停止信号邮件，并删除你的邮箱订阅记录。',`<form method="post" action="${esc(url.pathname+url.search)}"><button type="submit">${kind==='verify'?'确认订阅':'确认退订'}</button></form>`);
  if(kind==='verify'){
   const updated=await db.prepare('UPDATE email_subscribers SET active=1,verified_at=?,pending_hash=NULL,expires_at=NULL WHERE id=? AND pending_hash=? AND expires_at>?').bind(now,row.id,row.pending_hash,now).run();
   return updated.meta.changes?page('订阅成功','邮箱验证已完成。仅在新数据触发买入或清仓信号时提醒，没有信号时不发送。'):page('链接已失效','请重新申请订阅。');
  }
  await db.batch([db.prepare('DELETE FROM email_delivery WHERE subscriber_id=?').bind(row.id),db.prepare('DELETE FROM email_subscribers WHERE id=?').bind(row.id)]);
  return page('已退订','已停止发送邮件，邮箱订阅记录已删除。');
 }
 return json({error:'未找到此接口。'},404);
}
export async function dispatchSignalEmails(env,snapshot,{fetcher=fetch,now=Date.now()}={}){
 if(!emailReady(env))return {sent:0,reason:'not-configured'};
 const db=env.NOTIFICATIONS_DB,day=new Date(now+8*3600000).toISOString().slice(0,10);
 await db.prepare('DELETE FROM email_limits WHERE expires_at<?').bind(now).run();
 await db.prepare('DELETE FROM email_subscribers WHERE active=0 AND expires_at<?').bind(now-86400000).run();
 if(!snapshot.fresh||!['buy','sell'].includes(snapshot.signal)||snapshot.asOf!==day)return {sent:0,reason:'no-current-signal'};
 const rows=await db.prepare("SELECT id,email FROM email_subscribers s WHERE active=1 AND NOT EXISTS(SELECT 1 FROM email_delivery d WHERE d.subscriber_id=s.id AND d.signal_date=? AND d.signal=? AND d.status='sent') ORDER BY verified_at LIMIT 100").bind(day,snapshot.signal).all();let sent=0,failed=0;
 for(const row of rows.results){
  await db.prepare("INSERT OR IGNORE INTO email_delivery(subscriber_id,signal_date,signal,status) VALUES(?,?,?,'pending')").bind(row.id,day,snapshot.signal).run();
  const claim=await db.prepare("UPDATE email_delivery SET status='sending',lease_until=?,attempts=attempts+1 WHERE subscriber_id=? AND signal_date=? AND signal=? AND status!='sent' AND lease_until<? AND attempts<6 AND EXISTS(SELECT 1 FROM email_subscribers WHERE id=? AND active=1)").bind(now+120000,row.id,day,snapshot.signal,now,row.id).run();if(!claim.meta.changes)continue;
  const key=`signal:${row.id}:${day}:${snapshot.signal}`;
  try{
   if(!await limit(db,`send:${Math.floor(now/86400000)}`,80,now+172800000)||!await limit(db,`total:${Math.floor(now/86400000)}`,90,now+172800000))throw Error('Daily send limit');
   const token=await makeToken(env,row.id,'unsubscribe',Date.parse(day+'T00:00:00Z')+366*86400000),unsubscribe=base(env)+'/email/unsubscribe?token='+encodeURIComponent(token),last=snapshot.rows.at(-1),verb=snapshot.signal==='buy'?'买入':'清仓';
   const providerId=await send(env,row.email,`曲线罗盘：${day} ${verb}信号`,`${day} 收盘数据触发${verb}信号。\n沪深300全收益归一值：${last.equity.toFixed(2)}\n黄线：${last.yellow.toFixed(2)}；蓝线：${last.blue.toFixed(2)}\n\n查看曲线与规则：${base(env)}\n收盘生成信号，下一交易日收盘模拟成交；本邮件不会自动下单。\n\n退订：${unsubscribe}`,key,fetcher);
   await db.prepare("UPDATE email_delivery SET status='sent',provider_id=?,lease_until=0 WHERE subscriber_id=? AND signal_date=? AND signal=?").bind(providerId,row.id,day,snapshot.signal).run();sent++;
  }catch{await db.prepare("UPDATE email_delivery SET status='pending',lease_until=? WHERE subscriber_id=? AND signal_date=? AND signal=? AND status!='sent'").bind(now+120000,row.id,day,snapshot.signal).run();failed++;}
 }
 return {sent,failed};
}
