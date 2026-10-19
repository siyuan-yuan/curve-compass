export const RULES = { threshold: 300, equityBase: 982.79, bondBase: 1036.3 };
export function decision(position, equity, yellow, blue) {
  return position ? (equity > yellow ? 'sell' : 'hold') : (Math.abs(equity-blue)<300 ? 'buy' : 'wait');
}
export function replay(series) {
  let cash=1, units=0, pending=null, entry=null, high=1, maxDrawdown=0;
  const trades=[], rows=[];
  for(const [date,equity,bond] of series) {
    let action=null;
    if(pending==='buy') { units=cash/equity; cash=0; entry={buy:date,buyPrice:equity}; action='buy'; }
    if(pending==='sell') { cash=units*equity; units=0; trades.push({...entry,sell:date,sellPrice:equity,returnPct:(equity/entry.buyPrice-1)*100}); action='sell'; }
    const yellow=2700+Math.exp(2/3)*(bond-1000), blue=1000+Math.exp(.5)*(bond-1000);
    const signal=decision(units>0,equity,yellow,blue);
    pending=signal==='buy'||signal==='sell'?signal:null;
    const nav=cash+units*equity;
    high=Math.max(high,nav); maxDrawdown=Math.min(maxDrawdown,nav/high-1);
    rows.push({date,equity,bond,yellow,blue,distance:Math.abs(equity-blue),signal,action,position:units>0,nav});
  }
  const last=rows.at(-1), years=(Date.parse(last.date)-Date.parse(rows[0].date))/86400000/365.2425;
  return {rows,trades,position:units>0,signal:last.signal,openTrade:units>0?entry:null,totalReturn:(last.nav-1)*100,cagr:years>0?(last.nav**(1/years)-1)*100:0,maxDrawdown:maxDrawdown*100};
}
export function mergeSeries(seed,equityRows,bondRows,equityBase=RULES.equityBase,bondBase=RULES.bondBase) {
  const bonds=new Map(bondRows.map(x=>[String(x.tradeDate).replaceAll('-',''),Number(x.close)]));
  const map=new Map(seed.map(x=>[x[0],x]));
  for(const row of equityRows) {
    const raw=String(row.tradeDate).replaceAll('-',''), b=bonds.get(raw), e=Number(row.close);
    if(b===undefined) continue;
    if(!Number.isFinite(e)||!Number.isFinite(b)||e<=0||b<=0||!/^\d{8}$/.test(raw)) throw Error('数据包含无效日期或指数值');
    const date=`${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`;
    if(date>='2005-01-04') map.set(date,[date,e/equityBase*1000,b/bondBase*1000]);
  }
  return [...map.values()].sort((a,b)=>a[0].localeCompare(b[0]));
}
/** @param {any} series @param {any} options */
export function buildSnapshot(series,{now=new Date().toISOString(),error=null,checkedAt=now,latestEquity=null,latestBond=null}={}) {
  const result=replay(series), asOf=series.at(-1)[0];
  const chinaNow=new Date(new Date(now).getTime()+8*3600000);
  const day=chinaNow.getUTCDay(), hour=chinaNow.getUTCHours();
  const expected=new Date(chinaNow); // Last weekday close; exchange holidays are reported conservatively.
  if(hour<18) expected.setUTCDate(expected.getUTCDate()-1);
  while(expected.getUTCDay()===0||expected.getUTCDay()===6) expected.setUTCDate(expected.getUTCDate()-1);
  const expectedDate=expected.toISOString().slice(0,10);
  const fresh=asOf>=expectedDate&&!error;
  return {...result,asOf,checkedAt,fresh,actionable:fresh&&(result.signal==='buy'||result.signal==='sell'),error,latestEquity,latestBond,expectedDate,marketNote:day===0||day===6?'周末显示最近收盘数据':'每日收盘后更新，节假日以实际发布为准',source:'中证指数公司官方接口',rules:RULES};
}
