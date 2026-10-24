import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMatchupIndex, getMatchupRows } from '../src/lib/draftAnalysis.js';

const hero = { slug: 'achilles', name: 'Achilles' };
const alice = { slug: 'alice', name: 'Alice' };
const houdini = { slug: 'houdini', name: 'Houdini' };
const missing = { slug: 'missing', name: 'Missing' };
const index = buildMatchupIndex([
  { 'Hero A Slug': 'achilles', 'Hero B Slug': 'alice', Games: 105, 'Hero A Wins': 74 },
  { 'Hero A Slug': 'houdini', 'Hero B Slug': 'achilles', Games: 10, 'Hero A Wins': 7 },
]);
test('uses actual wins and games in both directions, excludes self and preserves N/A', () => {
  const rows = getMatchupRows(hero, [hero, alice, houdini, missing], index);
  assert.deepEqual(rows.map(r => r.slug), ['alice', 'houdini', 'missing']);
  assert.equal(rows[0].winRate, 74 / 105 * 100);
  assert.equal(rows[0].games, 105);
  assert.equal(rows[1].winRate, 30);
  assert.equal(rows[2].winRate, null);
  assert.equal(rows[2].games, null);
});
test('remaining pool excludes bans and heroes outside roster', () => {
  assert.deepEqual(getMatchupRows(hero, [hero, houdini], index).map(r => r.slug), ['houdini']);
  assert.deepEqual(getMatchupRows(hero, [hero], index), []);
});
test('all sorting modes keep missing values last except alphabetical order', () => {
  const pool = [missing, houdini, alice];
  assert.deepEqual(getMatchupRows(hero, pool, index, 'worst').map(r => r.slug), ['houdini', 'alice', 'missing']);
  assert.deepEqual(getMatchupRows(hero, pool, index, 'games').map(r => r.slug), ['alice', 'houdini', 'missing']);
  assert.deepEqual(getMatchupRows(hero, pool, index, 'name').map(r => r.slug), ['alice', 'houdini', 'missing']);
});
test('invalid and zero-game records do not invent percentages', () => {
  const invalid = buildMatchupIndex([{ 'Hero A Slug': 'achilles', 'Hero B Slug': 'alice', Games: 0, 'Hero A Wins': 0 }]);
  assert.equal(getMatchupRows(hero, [alice], invalid)[0].winRate, null);
});
