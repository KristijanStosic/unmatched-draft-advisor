import test from 'node:test';
import assert from 'node:assert/strict';
import { matchupRating } from '../src/lib/matchupRating.js';

test('ratings classify raw rates at every boundary without rounding', () => {
  for (const [rate, label] of [[100,'Counter'],[75.001,'Counter'],[75,'Favoured'],[60.001,'Favoured'],[60,'Slightly Favoured'],[55.001,'Slightly Favoured'],[55,'Balanced'],[45,'Balanced'],[44.999,'Slightly Losing'],[40,'Slightly Losing'],[39.999,'Losing'],[25,'Losing'],[24.999,'Nightmare'],[0,'Nightmare']]) {
    assert.equal(matchupRating(rate, 100).label, label, String(rate));
  }
});

test('unknown preserves the distinction between small sample and missing data', () => {
  for (const [rate,games] of [[100,3],[0,1],[50,0],[null,20],[undefined,20],[NaN,20],[101,20],[-1,20],[50,undefined]]) {
    assert.equal(matchupRating(rate,games).label,'Unknown');
  }
  assert.equal(matchupRating(100,4).label,'Counter');
});

test('opposite hero perspectives produce complementary categories', () => {
  for (const [rate,a,b] of [[80,'Counter','Nightmare'],[68,'Favoured','Losing'],[58,'Slightly Favoured','Slightly Losing'],[50,'Balanced','Balanced']]) {
    assert.equal(matchupRating(rate,100).label,a);
    assert.equal(matchupRating(100-rate,100).label,b);
  }
});
