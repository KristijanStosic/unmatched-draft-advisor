import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { generateTables, sampleMaps, validateMapSettings } from '../src/lib/randomMaps.js';
const maps = JSON.parse(fs.readFileSync(new URL('../src/data/maps.json', import.meta.url)));

test('manifest covers all deployed images and has unique identifiers', () => {
  assert.equal(new Set(maps.map(m => m.id)).size, maps.length);
  assert.deepEqual(maps.map(m => m.file).sort(), fs.readdirSync(new URL('../public/data/maps', import.meta.url)).filter(f => /\.jpg$/i.test(f)).sort());
  for (const map of maps) assert.ok(map.name);
});
test('every table gets the same count without duplicates, including the full pool', () => {
  for (const count of [1, 3, maps.length]) {
    const tables = generateTables(maps, 10, count);
    assert.equal(tables.length, 10);
    for (const table of tables) {
      assert.equal(table.length, count);
      assert.equal(new Set(table.map(m => m.id)).size, count);
    }
  }
});
test('maps can repeat between tables and source pool is not mutated', () => {
  const pool = [{ id: 'one' }];
  assert.deepEqual(generateTables(pool, 2, 1), [[pool[0]], [pool[0]]]);
  const before = [...maps];
  sampleMaps(maps, 3, () => 0);
  assert.deepEqual(maps, before);
});
test('invalid counts are rejected before generating', () => {
  for (const count of [0, -1, 1.5, NaN, Infinity, maps.length + 1]) {
    assert.ok(validateMapSettings(2, count, maps.length));
    assert.throws(() => generateTables(maps, 2, count), RangeError);
  }
  for (const count of [0, -1, 1.5, NaN, 101]) assert.ok(validateMapSettings(count, 1, maps.length));
  assert.equal(validateMapSettings(100, maps.length, maps.length), '');
});
