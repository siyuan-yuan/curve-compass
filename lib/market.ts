import seed from './seed.json';
import {buildSnapshot,mergeSeries} from './strategy.mjs';
type Cache = {at:number; data:ReturnType<typeof buildSnapshot>};
let cache:Cache|null=null;
let inflight:Promise<ReturnType<typeof buildSnapshot>>|null=null;
async function fetchIndex(code:string,start:string,end:string) {
  const url=new URL('https://www.csindex.com.cn/csindex-home/perf/index-perf');
  url.search=new URLSearchParams({indexCode:code,startDate:start,endDate:end}).toString();
  const response=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{Accept:'application/json'}});
  if(!response.ok) throw Error(`官方数据接口暂时不可用（${response.status}）`);
  const json:any=await response.json();
  if(!Array.isArray(json.data)||json.data.length===0) throw Error(`${code} 暂未返回新数据`);
  for(const row of json.data) if(row.indexCode!==code) throw Error('指数代码校验失败');
  return json.data;
}
export async function getMarket() {
  if(cache&&Date.now()-cache.at<15*60*1000) return cache.data;
  if(inflight) return inflight;
  inflight=(async()=>{
    const now=new Date().toISOString();
    const prior=cache?.data.rows.map((r:any)=>[r.date,r.equity,r.bond])??seed.series;
    try {
      const start=prior.at(-1)![0].replaceAll('-','');
      const end=new Date(Date.now()+8*3600000).toISOString().slice(0,10).replaceAll('-','');
      const [equity,bond]=await Promise.all([fetchIndex('H00300',start,end),fetchIndex('H11023',start,end)]);
      const merged=mergeSeries(prior,equity,bond);
      const latest=(r:any[])=>r.map(x=>String(x.tradeDate)).sort().at(-1)!;
      const data=buildSnapshot(merged,{now,latestEquity:latest(equity),latestBond:latest(bond)});
      cache={at:Date.now(),data}; return data;
    } catch(error) {
      const data=buildSnapshot(prior,{now,error:error instanceof Error?error.message:'数据更新失败'});
      cache={at:Date.now()-14*60*1000,data}; return data;
    } finally { inflight=null; }
  })();
  return inflight;
}
