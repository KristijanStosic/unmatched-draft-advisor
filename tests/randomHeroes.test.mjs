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

test("the pointer lands inside the chosen sector, including near either edge", () => {
  for (const size of [1, 2, 7, 80]) {
    for (let index = 0; index < size; index += 1) {
      const step = 360 / size;
      const landing = (sample) => (2160 - wheelRotation(size, index, () => sample)) / step;
      const early = landing(0);
      const late = landing(0.999999);
      assert.ok(early > index && early < index + 0.03);
      assert.ok(late > index + 0.97 && late < index + 1);
      assert.equal(Math.floor(landing(0.4)), index);
    }
  }
});
