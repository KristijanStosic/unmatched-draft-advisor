export const DRAFT_FORMATS = [
  { id: 4, name: "Banquest (4 picks)", size: 4, preBans: 2 },
  { id: 5, name: "Banquest (5 picks)", size: 5, preBans: 2 },
  { id: 6, name: "Team League", size: 6, preBans: 0 },
  { id: "arquest", name: "Arquest", size: 5, preBans: 3 },
  { id: "arsenal", name: "Arsenal", size: 5, preBans: 0 },
  { id: "barsenal", name: "Barsenal", size: 4, preBans: 0 },
];

export function draftFormat(id) {
  return DRAFT_FORMATS.find((format) => format.id === id) ?? DRAFT_FORMATS[0];
}

export function resolveArsenalRound(mine, theirs) {
  const conflicts = mine.filter((slug) => theirs.includes(slug));
  return [
    ...conflicts.map((slug) => ({ phase: "conflict", slug })),
    ...[["me", mine], ["opponent", theirs]].flatMap(([who, choices]) =>
      choices.filter((slug) => !conflicts.includes(slug)).map((slug) => ({ phase: "pick", who, slug })),
    ),
  ];
}

export function barsenalRound(available, picks, banned, mine, theirs, size) {
  const entries = resolveArsenalRound(mine, theirs);
  const kept = [...picks, ...entries.filter(({ phase }) => phase === "pick").map(({ slug }) => slug)];
  const excluded = [...banned, ...entries.filter(({ phase }) => phase === "conflict").map(({ slug }) => slug)];
  const eligible = available.filter((slug) => !kept.includes(slug) && !excluded.includes(slug));
  // The pool is exhausted once it cannot supply the remaining unique slots.
  if (eligible.length < size * 2 - kept.length) entries.push({ phase: "restore-mirrors" });
  return entries;
}

export function arsenalDraftState(history, size, barsenalPool) {
  const confirmed = [];
  let pending = { me: [], opponent: [] };
  const counts = { me: 0, opponent: 0 };

  for (const entry of history) {
    if (entry.phase !== "arsenal" && entry.phase !== "barsenal") {
      confirmed.push(entry);
      continue;
    }
    pending[entry.who].push(entry.slug);
    if (counts.me + pending.me.length !== size || counts.opponent + pending.opponent.length !== size) continue;

    const picks = confirmed.filter(({ phase }) => phase === "pick").map(({ slug }) => slug);
    const lastRestore = confirmed.findLastIndex(({ phase }) => phase === "restore-mirrors");
    const banned = confirmed.slice(lastRestore + 1).filter(({ phase }) => phase === "conflict").map(({ slug }) => slug);
    const resolved = barsenalPool
      ? barsenalRound(barsenalPool, picks, banned, pending.me, pending.opponent, size)
      : resolveArsenalRound(pending.me, pending.opponent);
    for (const pick of resolved) {
      if (pick.phase === "pick") counts[pick.who] += 1;
    }
    confirmed.push(...resolved);
    pending = { me: [], opponent: [] };
  }

  return {
    confirmed,
    pending,
    who: counts.me + pending.me.length < size ? "me" : "opponent",
  };
}
