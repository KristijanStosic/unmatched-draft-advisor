import assert from "node:assert/strict";
import { test } from "node:test";
import { arsenalDraftState, barsenalRound, resolveArsenalRound } from "../src/lib/draftFormats.js";
import { banSteps, draftPhase, pickOrder } from "../src/lib/draftStrategy.js";

test("Barsenal records both sides manually and exposes surviving opponents for refill", () => {
  const pool = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
  const picks = (who, slugs) => slugs.map((slug) => ({ phase: "barsenal", who, slug }));
  const mine = picks("me", ["a", "b", "c", "d"]);
  assert.equal(arsenalDraftState(mine, 4, pool).who, "opponent");
  const round = [...mine, ...picks("opponent", ["a", "e", "f", "g"])];
  const state = arsenalDraftState(round, 4, pool);
  assert.equal(state.who, "me");
  assert.deepEqual(state.confirmed.filter(({ who }) => who === "opponent").map(({ slug }) => slug), ["e", "f", "g"]);
  assert.deepEqual(state.confirmed.filter(({ phase }) => phase === "conflict").map(({ slug }) => slug), ["a"]);
  const final = arsenalDraftState([...round, ...picks("me", ["h"]), ...picks("opponent", ["i"])], 4, pool);
  assert.equal(draftPhase(final.confirmed.filter(({ phase }) => phase === "pick").length, 0, 0, "barsenal"), "cross");
});

test("Arquest runs six pre-bans before the required pick order", () => {
  for (let pre = 0; pre < 6; pre += 1) {
    assert.equal(draftPhase(0, 0, 0, "arquest", pre), "pre");
  }
  assert.equal(draftPhase(0, 0, 0, "arquest", 6), "pick");
  assert.equal(pickOrder("arquest").map((role) => role[0].toUpperCase()).join(""), "LFFLLFFLLF");
  assert.equal(draftPhase(10, 0, 0, "arquest", 6), "cross");
  assert.equal(draftPhase(10, 2, 0, "arquest", 6), "self");
  assert.equal(draftPhase(10, 2, 2, "arquest", 6), "done");
});

test("post-draft bans follow the chosen Leader for both phases", () => {
  for (const [leader, follower] of [["me", "opponent"], ["opponent", "me"]]) {
    assert.deepEqual(banSteps(leader).map(({ phase, who }) => [phase, who]), [
      ["cross", leader], ["cross", follower], ["self", leader], ["self", follower],
    ]);
  }
});

test("Arsenal bans shared picks, keeps unique picks, and advances after both pools refill", () => {
  const first = resolveArsenalRound(["a", "b", "c", "d", "e"], ["a", "b", "f", "g", "h"]);
  assert.deepEqual(first.filter(({ phase }) => phase === "conflict").map(({ slug }) => slug), ["a", "b"]);
  assert.equal(draftPhase(first.filter(({ phase }) => phase === "pick").length, 0, 0, "arsenal"), "arsenal");
  const refill = resolveArsenalRound(["i", "j"], ["k", "l"]);
  const picks = [...first, ...refill].filter(({ phase }) => phase === "pick");
  assert.equal(new Set(picks.map(({ slug }) => slug)).size, 10);
  assert.equal(picks.filter(({ who }) => who === "me").length, 5);
  assert.equal(picks.filter(({ who }) => who === "opponent").length, 5);
  assert.equal(draftPhase(picks.length, 0, 0, "arsenal"), "cross");
  assert.equal(draftPhase(picks.length, 2, 0, "arsenal"), "self");
  assert.equal(draftPhase(picks.length, 2, 2, "arsenal"), "done");
});

test("Arsenal records one pick at a time and undo reverses automatic mirror bans", () => {
  const picks = (who, slugs) => slugs.map((slug) => ({ phase: "arsenal", who, slug }));
  const mine = picks("me", ["a", "b", "c", "d", "e"]);
  const theirs = picks("opponent", ["a", "f", "g", "h", "i"]);
  assert.equal(arsenalDraftState(mine.slice(0, -1), 5).who, "me");
  assert.equal(arsenalDraftState(mine, 5).who, "opponent");

  const round = [...mine, ...theirs];
  const afterRound = arsenalDraftState(round, 5);
  assert.equal(afterRound.who, "me");
  assert.deepEqual(afterRound.confirmed.filter(({ phase }) => phase === "conflict"), [{ phase: "conflict", slug: "a" }]);
  assert.equal(afterRound.confirmed.filter(({ phase, who }) => phase === "pick" && who === "opponent").length, 4);

  const undone = arsenalDraftState(round.slice(0, -1), 5);
  assert.equal(undone.who, "opponent");
  assert.deepEqual(undone.confirmed, []);
  assert.deepEqual(undone.pending.opponent, ["a", "f", "g", "h"]);

  const refill = [...round, ...picks("me", ["j"]), ...picks("opponent", ["k"])];
  const final = arsenalDraftState(refill, 5).confirmed.filter(({ phase }) => phase === "pick");
  assert.equal(new Set(final.map(({ slug }) => slug)).size, 10);
});
test("Barsenal retains unique picks and restores mirror bans when the pool cannot fill both rosters", () => {
  const available = Array.from({ length: 36 }, (_, index) => String(index));
  const mine = ["0", "1", "2", "3"];
  const theirs = ["0", "1", "4", "5"];
  const result = barsenalRound(available, [], [], mine, theirs, 4);
  assert.deepEqual(result.filter(({ phase }) => phase === "conflict").map(({ slug }) => slug), ["0", "1"]);
  assert.equal(result.filter(({ phase }) => phase === "pick").length, 4);
  assert.equal(barsenalRound(available.slice(0, 8), [], [], mine, theirs, 4).at(-1).phase, "restore-mirrors");
  assert.equal(draftPhase(7, 0, 0, "barsenal"), "barsenal");
  assert.equal(draftPhase(8, 0, 0, "barsenal"), "cross");
  assert.equal(draftPhase(8, 2, 0, "barsenal"), "self");
  assert.equal(draftPhase(8, 2, 2, "barsenal"), "done");
});
