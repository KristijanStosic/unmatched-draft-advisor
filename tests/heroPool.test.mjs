import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMatchupIndex } from '../src/lib/draftAnalysis.js';
import { heroPoolMatchups } from '../src/lib/matchupExplorer.js';

const heroes = ['achilles', 'alice', 'houdini', 'missing', 'zero', 'banned', 'outside'].map(slug => ({ slug, name: slug }));
const available = heroes.filter(h => h.slug !== 'outside').map(h => h.slug);
const index = buildMatchupIndex([
  { 'Hero A Slug': 'achilles', 'Hero B Slug': 'alice', Games: 100, 'Hero A Wins': 68 },
  { 'Hero A Slug': 'houdini', 'Hero B Slug': 'achilles', Games: 10, 'Hero A Wins': 7 },
  { 'Hero A Slug': 'achilles', 'Hero B Slug': 'zero', Games: 10, 'Hero A Wins': 0 },
  { 'Hero A Slug': 'achilles', 'Hero B Slug': 'banned', Games: 10, 'Hero A Wins': 10 },
]);

test('pool results use CSV A/B perspective, complements, games and descending WR with N/A last', () => {
  const rows = heroPoolMatchups(heroes, index, 'achilles', available, ['banned']);
  assert.deepEqual(rows.map(r => r.opponent.slug), ['alice', 'houdini', 'zero', 'missing']);
  assert.deepEqual(rows.map(({ rate, oppositeRate, games }) => [rate, oppositeRate, games]), [
    [68, 32, 100], [30, 70, 10], [0, 100, 10], [null, null, null],
  ]);
  const reverse = heroPoolMatchups(heroes, index, 'alice', available);
  assert.equal(reverse[0].opponent.slug, 'achilles');
  assert.equal(reverse[0].rate, 32);
});

test('pool and ban changes immediately change opponents, including empty and unselected states', () => {
  const rows = (pool, bans) => heroPoolMatchups(heroes, index, 'achilles', pool, bans).map(r => r.opponent.slug);
  assert.deepEqual(rows(['alice', 'houdini'], []), ['alice', 'houdini']);
  assert.deepEqual(rows(['alice', 'houdini'], ['alice']), ['houdini']);
  assert.deepEqual(rows(['alice'], []), ['alice']);
  assert.deepEqual(rows([], []), []);
  assert.deepEqual(rows(['achilles'], []), []);
  assert.deepEqual(heroPoolMatchups(heroes, index, '', available), []);
  assert.deepEqual(heroPoolMatchups(heroes, index, 'unknown', available), []);
});
