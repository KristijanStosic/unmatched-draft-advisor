import { matchup } from "./draftStrategy.js";

export function closeMatchups(heroes, index, heroSlug = "", minimumGames = 1) {
  const rows = [];
  for (let i = 0; i < heroes.length; i++) {
    for (let j = i + 1; j < heroes.length; j++) {
      const a = heroes[i],
        b = heroes[j];
      if (heroSlug && a.slug !== heroSlug && b.slug !== heroSlug) continue;
      const data = matchup(index, a.slug, b.slug);
      // Compare raw rates, not rounded display values. Each unordered pair appears once.
      if (
        !data ||
        data.games < minimumGames ||
        data.rate < 45 ||
        data.rate > 55
      )
        continue;
      rows.push({ a, b, ...data, oppositeRate: 100 - data.rate });
    }
  }
  return rows.sort(
    (a, b) =>
      Math.abs(a.rate - 50) - Math.abs(b.rate - 50) ||
      b.games - a.games ||
      a.a.name.localeCompare(b.a.name) ||
      a.b.name.localeCompare(b.b.name),
  );
}
