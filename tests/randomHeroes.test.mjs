import test from "node:test";
import assert from "node:assert/strict";
import { drawHeroIndex, remainingHeroes, wheelRotation } from "../src/lib/randomHeroes.js";

test("history excludes a hero from both modes, even after removal and re-addition", () => {
  const heroes = ["a", "b", "c"].map((slug) => ({ slug }));
  const tier = { members: ["a", "b"], history: ["b"] };
  assert.deepEqual(remainingHeroes(tier, heroes), [heroes[0]]);
  assert.deepEqual(remainingHeroes({ ...tier, members: ["a"] }, heroes), [heroes[0]]);
  assert.deepEqual(remainingHeroes({ ...tier, members: ["b", "a"] }, heroes), [heroes[0]]);
  assert.deepEqual(remainingHeroes({ ...tier, history: [] }, heroes), heroes.slice(0, 2));
});

test("draw rejects the biased tail and can select every eligible index", () => {
  for (let index = 0; index < 3; index += 1) {
    const samples = [0xffffffff, index];
    const random = { getRandomValues: (buffer) => { buffer[0] = samples.shift(); } };
    assert.equal(drawHeroIndex(3, random), index);
    assert.equal(samples.length, 0);
  }
  assert.equal(drawHeroIndex(1), 0);
});

test("the wheel stops with the chosen sector centered under the pointer", () => {
  for (const size of [1, 2, 7, 80]) {
    for (let index = 0; index < size; index += 1) {
      const center = (index + 0.5) * (360 / size);
      assert.ok(Math.abs(wheelRotation(size, index) + center - 2160) < 1e-9);
    }
  }
});
