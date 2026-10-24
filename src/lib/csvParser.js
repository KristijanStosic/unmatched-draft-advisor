import Papa from "papaparse";

function readRows(csvText, required) {
  const result = Papa.parse(csvText.replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  if (result.errors.length)
    throw new Error(`Neispravan CSV: ${result.errors[0].message}`);
  const missing = required.filter((col) => !result.meta.fields?.includes(col));
  if (missing.length)
    throw new Error(`Nedostaju kolone: ${missing.join(", ")}`);
  return result.data;
}

export function parseMatchupCsv(csvText) {
  const rows = readRows(csvText, [
    "Hero A",
    "Hero A Slug",
    "Hero B",
    "Hero B Slug",
    "Games",
    "Hero A Wins",
  ]);
  const heroesMap = new Map();
  for (const row of rows) {
    for (const side of ["A", "B"]) {
      const name = row[`Hero ${side}`]?.trim();
      const slug = row[`Hero ${side} Slug`]?.trim().toLowerCase();
      if (name && slug && !heroesMap.has(slug))
        heroesMap.set(slug, {
          name,
          slug,
          image: `${import.meta.env.BASE_URL}images/${slug}.jpg`,
        });
    }
  }
  if (!heroesMap.size) throw new Error("Matchup CSV nema heroja.");
  return {
    heroes: [...heroesMap.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
    matchups: rows,
  };
}

export function parseOverallWinRatesCsv(csvText) {
  const rows = readRows(csvText, [
    "Hero",
    "Hero Slug",
    "Games Played",
    "Wins",
    "Losses",
    "Win Rate %",
  ]);
  const result = new Map();
  for (const row of rows) {
    const slug = row["Hero Slug"]?.trim().toLowerCase();
    const games = Number(row["Games Played"]);
    const wins = Number(row.Wins);
    if (
      !slug ||
      !Number.isFinite(games) ||
      !Number.isFinite(wins) ||
      games < 0 ||
      wins < 0 ||
      wins > games
    )
      continue;
    result.set(slug, {
      name: row.Hero,
      slug,
      games,
      wins,
      losses: games - wins,
      winRate: games ? (wins / games) * 100 : null,
    });
  }
  if (!result.size) throw new Error("Overall CSV nema validnih statistika.");
  return result;
}
