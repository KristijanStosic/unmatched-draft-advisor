import assert from 'node:assert/strict';
import { test } from 'node:test';
import { closeMatchups } from '../src/lib/matchupExplorer.js';
import { matchup } from '../src/lib/draftStrategy.js';

const heroes = ['a','b','c','d','e','f','g'].map(slug => ({slug,name:slug}));
const index = new Map();
for (const [b,wins,games] of [['b',4500,10000],['c',5500,10000],['d',4499,10000],['e',5501,10000],['f',50,100],['g',100,200]]) {
  index.set(`a|${b}`,{wins,games});
  index.set(`${b}|a`,{wins:games-wins,games});
}
test('45 and 55 are included, unrounded outside values and unknown pairs are excluded', () => {
  const rows=closeMatchups(heroes,index);
  assert.equal(rows.length,4);
  assert.deepEqual(rows.map(r=>r.b.slug),['g','f','b','c']);
  assert(rows.every(r=>r.rate+r.oppositeRate===100));
  assert.equal(new Set(rows.map(r=>[r.a.slug,r.b.slug].sort().join('|'))).size,4);
});
test('hero filter works on either side; minimum games and empty results work', () => {
  assert.equal(closeMatchups(heroes,index,'b').length,1);
  assert.equal(closeMatchups(heroes,index,'a',201).length,2);
  assert.equal(closeMatchups(heroes,index,'d').length,0);
  assert.deepEqual(closeMatchups([],index),[]);
});
test('head-to-head results reverse perspective and retain games; missing data is N/A', () => {
  assert.equal(matchup(index,'a','b').rate,45);
  assert.equal(matchup(index,'b','a').rate,55);
  assert.equal(matchup(index,'b','a').games,10000);
  assert.equal(matchup(index,'b','c'),null);
});
