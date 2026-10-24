export const PICK_ORDER = ["leader", "follower", "follower", "leader", "leader", "follower", "follower", "leader"];

export function pickOrder(format = 4) {
  if (format === 6) return Array.from({ length: 12 }, (_, i) => i % 2 ? "follower" : "leader");
  if (format === 5) return ["leader", "follower", "follower", "leader", "leader", "follower", "follower", "leader", "leader", "follower"];
  return PICK_ORDER;
}

export const draftPhase = (picks, cross, self, format = 4, pre = 4) =>
  format !== 6 && pre < 4 ? "pre" : picks < format * 2 ? "pick" : format === 6 ? "done" : cross < 2 ? "cross" : self < 2 ? "self" : "done";

export function banSteps(leader) {
  const follower = leader === "me" ? "opponent" : "me";
  return ["cross", "self"].flatMap(phase => [leader, follower].map(who => ({
    phase, who,
    title: phase === "cross"
      ? (who === "me" ? "You ban an opponent hero" : "Opponent bans your hero")
      : (who === "me" ? "Your self ban" : "Opponent's self ban"),
    instruction: phase === "cross"
      ? (who === "me" ? "Choose an opponent hero to ban." : "Select your hero that the opponent banned.")
      : (who === "me" ? "Choose one of your remaining heroes to self-ban." : "Select the opponent hero they self-banned."),
  })));
}

export function matchup(index, a, b) {
  const d = index.get(`${a}|${b}`);
  return d && d.games > 0 ? { games: d.games, wins: d.wins, rate: (100 * d.wins) / d.games } : null;
}

export function evaluateTeams(index, mine, theirs) {
  const details = mine.flatMap(a => theirs.map(b => ({ a, b, data: matchup(index, a, b) })));
  const known = details.filter(d => d.data);
  const games = known.reduce((s, d) => s + d.data.games, 0);
  const wins = known.reduce((s, d) => s + d.data.wins, 0);
  return { rate: games ? wins / games * 100 : null, games, covered: known.length, possible: details.length, details };
}

// For each candidate, compute its performance against all known enemy picks.
export function recommendPicks(index, candidates, enemies, rosterStats, overall) {
  return candidates.map(slug => {
    const result = evaluateTeams(index, [slug], enemies);
    const roster = rosterStats.find(x => x.slug === slug);
    const baseline = roster?.winRate != null ? roster : overall.get(slug);
    const fallback = baseline?.winRate ?? null;
    return { slug, ...result, fallback, score: enemies.length ? result.rate : fallback,
      games: enemies.length ? result.games : (fallback != null ? baseline.games : 0) };
  }).sort((a,b) => (b.score ?? -1) - (a.score ?? -1) || b.games - a.games);
}

// Keep search results in recommendation order; opponent recording retains pool order.
export function visibleDraftHeroes(heroes, candidates, rankings, search, useRankings) {
  const ranks = new Map(rankings.map((r, i) => [r.slug, i]));
  const shown = heroes.filter(h => candidates.includes(h.slug) && h.name.toLowerCase().includes(search.toLowerCase()));
  return useRankings ? shown.sort((a, b) => (ranks.get(a.slug) ?? Infinity) - (ranks.get(b.slug) ?? Infinity)) : shown;
}

const without = (arr, slug) => arr.filter(s => s !== slug);
// Cross bans precede self bans. Maximin protects against remaining enemy choices.
// Missing matchup results are neutral (50%) for simulations,
// but the UI still reports missing data explicitly.
function score(index, mine, theirs) {
  const result = evaluateTeams(index, mine, theirs);
  if (!result.possible) return 50;
  return result.details.reduce((sum, d) => sum + (d.data?.rate ?? 50), 0) / result.possible;
}
export function recommendSelfBans(index, mine, theirs, opponentAlreadySelfBanned = false) {
  return mine.map(remove => {
    const my2 = without(mine, remove);
    const worst = Math.min(...(opponentAlreadySelfBanned ? [null] : theirs)
      .map(theirSelf => score(index, my2, theirSelf === null ? theirs : without(theirs, theirSelf))));
    return { slug: remove, score: Number.isFinite(worst) ? worst : null };
  }).sort((a,b) => (b.score ?? -1) - (a.score ?? -1));
}
export function recommendOpponentBans(index, mine, theirs, opponentAlreadyBanned = false) {
  return theirs.map(remove => {
    const their3 = without(theirs, remove);
    const worst = Math.min(...(opponentAlreadyBanned ? [null] : mine).map(theirBan => {
      const my3 = theirBan === null ? mine : without(mine, theirBan);
      return Math.max(...my3.map(mySelf =>
        Math.min(...their3.map(theirSelf => score(index, without(my3, mySelf), without(their3, theirSelf))))));
    }));
    return { slug: remove, score: Number.isFinite(worst) ? worst : null };
  }).sort((a,b) => (b.score ?? -1) - (a.score ?? -1));
}
