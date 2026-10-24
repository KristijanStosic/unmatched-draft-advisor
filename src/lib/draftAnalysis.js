const numeric = (value) => Number(String(value ?? "").replace(",", "."));

export function getMatchupRows(hero, opponents, matchupIndex, sort = "best") {
  return opponents.filter(opponent => opponent.slug !== hero.slug).map(opponent => {
    const data = matchupIndex.get(`${hero.slug}|${opponent.slug}`);
    return { ...opponent, games: data?.games ?? null, winRate: data?.games ? data.wins / data.games * 100 : null };
  }).sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (a.winRate == null || b.winRate == null)
      return (a.winRate == null) - (b.winRate == null) || a.name.localeCompare(b.name);
    if (sort === "games") return b.games - a.games || a.name.localeCompare(b.name);
    return (sort === "worst" ? a.winRate - b.winRate : b.winRate - a.winRate) || b.games - a.games || a.name.localeCompare(b.name);
  });
}

export function buildMatchupIndex(matchups) {
  const index = new Map();
  const add = (slug, opponent, games, wins) => {
    const key = `${slug}|${opponent}`;
    const existing = index.get(key) || { games: 0, wins: 0 };
    existing.games += games;
    existing.wins += wins;
    index.set(key, existing);
  };
  for (const row of matchups) {
    const a = String(row["Hero A Slug"] || "")
      .trim()
      .toLowerCase();
    const b = String(row["Hero B Slug"] || "")
      .trim()
      .toLowerCase();
    const games = numeric(row.Games);
    const wins = numeric(row["Hero A Wins"]);
    if (
      !a ||
      !b ||
      a === b ||
      !Number.isFinite(games) ||
      !Number.isFinite(wins) ||
      games <= 0 ||
      wins < 0 ||
      wins > games
    )
      continue;
    add(a, b, games, wins);
    add(b, a, games, games - wins);
  }
  return index;
}

export function analyzePool(heroes, poolSlugs, matchupIndex) {
  const pool = new Set(poolSlugs);
  return heroes
    .filter((h) => pool.has(h.slug))
    .map((hero) => {
      let games = 0,
        wins = 0,
        covered = 0;
      const details = [];
      for (const opponent of heroes) {
        if (opponent.slug === hero.slug || !pool.has(opponent.slug)) continue;
        const data = matchupIndex.get(`${hero.slug}|${opponent.slug}`);
        if (!data) continue;
        games += data.games;
        wins += data.wins;
        covered++;
        details.push({
          slug: opponent.slug,
          name: opponent.name,
          games: data.games,
          wins: data.wins,
          winRate: (data.wins / data.games) * 100,
        });
      }
      details.sort((a, b) => b.winRate - a.winRate);
      return {
        ...hero,
        games,
        wins,
        covered,
        possible: pool.size - 1,
        winRate: games ? (wins / games) * 100 : null,
        details,
      };
    })
    .sort((a, b) => (b.winRate ?? -1) - (a.winRate ?? -1) || b.games - a.games);
}
