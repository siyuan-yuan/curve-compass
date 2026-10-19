import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decision, replay, mergeSeries, buildSnapshot } from './strategy.mjs';

test('strict absolute distance, with position dependent sell', () => {
  assert.equal(decision(false, 1299.99, 2700, 1000), 'buy');
  assert.equal(decision(false, 700.01, 2700, 1000), 'buy');
  assert.equal(decision(false, 1300, 2700, 1000), 'wait');
  assert.equal(decision(false, 699, 2700, 1000), 'wait');
  assert.equal(decision(true, 2700, 2700, 1000), 'hold');
  assert.equal(decision(true, 2701, 2700, 1000), 'sell');
});
test('first day signal executes next close; last day remains pending', () => {
  const r = replay([['2005-01-04',1000,1000],['2005-01-05',1100,1000],['2005-01-06',2800,1000],['2005-01-07',3000,1000]]);
  assert.equal(r.trades.length, 1);
  assert.equal(r.trades[0].buy, '2005-01-05');
  assert.equal(r.trades[0].sell, '2005-01-07');
  assert.ok(Math.abs(r.totalReturn-(3000/1100-1)*100)<1e-8);
  assert.equal(replay([['2005-01-04',1000,1000]]).signal, 'buy');
  assert.equal(replay([['2005-01-04',1000,1000]]).position, false);
});
test('merge requires both fresh indices, no forward fill or silently deleting old dates', () => {
  const seed=[['2005-01-04',1000,1000]];
  const e=[{tradeDate:'20261019',close:1965.58}];
  assert.equal(mergeSeries(seed,e,[],982.79,1000).length,1);
  assert.deepEqual(mergeSeries(seed,e,[{tradeDate:'20261019',close:1200}],982.79,1000).at(-1),['2026-10-19',2000,1200]);
  assert.throws(()=>mergeSeries(seed,[{tradeDate:'20261019',close:-1}],[{tradeDate:'20261019',close:1200}],982.79,1000));
});
test('snapshot exposes stale data instead of a current actionable signal',()=>{
  const x=buildSnapshot([['2005-01-04',1000,1000]],{now:'2026-10-19T10:00:00Z',error:'source unavailable'});
  assert.equal(x.fresh,false);
  assert.equal(x.actionable,false);
  assert.equal(x.asOf,'2005-01-04');
});
