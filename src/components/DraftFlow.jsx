import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Undo2, Info } from "lucide-react";
import {
  pickOrder,
  draftPhase,
  banSteps,
  matchup,
  evaluateTeams,
  recommendPicks,
  recommendSelfBans,
  recommendOpponentBans,
  visibleDraftHeroes,
} from "@/lib/draftStrategy";

import { analyzePool } from "@/lib/draftAnalysis";

const pct = (n) => (n == null ? "N/A" : `${n.toFixed(1)}%`);
const other = (who) => (who === "me" ? "opponent" : "me");
const label = (who) => (who === "me" ? "You" : "Opponent");

function MatchupInfo({ hero, opponents, index, names }) {
  const [open, setOpen] = useState(false);
  const rows = opponents
    .filter((s) => s !== hero)
    .map((s) => ({ slug: s, data: matchup(index, hero, s) }))
    .sort((a, b) => (b.data?.rate ?? -1) - (a.data?.rate ?? -1));
  return (
    <div className="relative group/info" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onMouseEnter={() => setOpen(true)}
        className="rounded p-1 text-zinc-400 hover:text-amber-300"
        aria-label="Matchup details"
      >
        <Info className="h-4 w-4" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-64 max-h-64 overflow-y-auto rounded-lg border border-amber-800 bg-zinc-950 p-3 text-left shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2 text-xs font-bold text-amber-300">
            Matchups vs available heroes
          </div>
          {rows.length ? (
            rows.map(({ slug, data }) => (
              <div
                key={slug}
                className="flex justify-between gap-2 border-b border-zinc-800 py-1 text-xs"
              >
                <span className="truncate">{names.get(slug) ?? slug}</span>
                <span className="shrink-0">
                  {pct(data?.rate)}{" "}
                  <span className="text-zinc-500">({data?.games ?? 0})</span>
                </span>
              </div>
            ))
          ) : (
            <span className="text-xs text-zinc-500">
              No opponents selected yet.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function DraftFlow({
  heroes,
  available,
  index,
  overall,
  onBannedChange,
}) {
  const [format, setFormat] = useState(4);
  const [manualBans, setManualBans] = useState([]);
  const [leader, setLeader] = useState("opponent");
  const [started, setStarted] = useState(false);
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState("");
  useEffect(() => {
    onBannedChange([
      ...(format === 6 ? manualBans : []),
      ...history.filter((step) => step.phase !== "pick").map((step) => step.slug),
    ]);
  }, [format, manualBans, history, onBannedChange]);
  useEffect(() => () => onBannedChange([]), [onBannedChange]);
  const names = useMemo(
    () => new Map(heroes.map((h) => [h.slug, h.name])),
    [heroes],
  );
  const order = pickOrder(format);
  const finalSize = format === 6 ? 6 : format - 2;
  const pre = history.filter((h) => h.phase === "pre");
  const banned = format === 6 ? manualBans : pre.map((h) => h.slug);
  const pool = available.filter((s) => !banned.includes(s));
  const rosterStats = analyzePool(heroes, pool, index);
  const picks = history.filter((h) => h.phase === "pick");
  const mine = picks.filter((p) => p.who === "me").map((p) => p.slug);
  const theirs = picks.filter((p) => p.who === "opponent").map((p) => p.slug);
  const picked = [...mine, ...theirs];
  const remaining = pool.filter((s) => !picked.includes(s));
  const pickRole = order[picks.length];
  const current = pickRole === "leader" ? leader : other(leader);
  const self = history.filter((h) => h.phase === "self");
  const cross = history.filter((h) => h.phase === "cross");
  const selfMine = self.find((h) => h.who === "me")?.slug;
  const selfTheirs = self.find((h) => h.who === "opponent")?.slug;
  const crossMine = cross.find((h) => h.who === "me")?.slug;
  const crossTheirs = cross.find((h) => h.who === "opponent")?.slug;
  const myAfterCross = mine.filter((s) => s !== crossTheirs);
  const theirAfterCross = theirs.filter((s) => s !== crossMine);
  const myFinal = myAfterCross.filter((s) => s !== selfMine);
  const theirFinal = theirAfterCross.filter((s) => s !== selfTheirs);
  const phase = draftPhase(picks.length, cross.length, self.length, format, pre.length);
  const steps = format === 6 ? [] : banSteps(leader);
  const activeBan = steps.find(
    (step) =>
      !history.some((h) => h.phase === step.phase && h.who === step.who),
  );
  const phaseWho = phase === "pre" ? (pre.length % 2 === 0 ? leader : other(leader)) : phase === "pick" ? current : activeBan?.who;
  const candidates =
    phase === "pre" || phase === "pick"
      ? remaining
      : phase === "self"
        ? phaseWho === "me"
          ? myAfterCross
          : theirAfterCross
        : phase === "cross"
          ? phaseWho === "me"
            ? theirAfterCross
            : myAfterCross
          : [];
  const rankings =
    phase === "pick"
      ? recommendPicks(
          index,
          candidates,
          phaseWho === "me" ? theirs : mine,
          rosterStats,
          overall,
        )
      : phase === "self"
        ? phaseWho === "me"
          ? selfTheirs
            ? recommendSelfBans(index, myAfterCross, theirFinal, true)
            : recommendSelfBans(index, myAfterCross, theirAfterCross)
          : selfMine
            ? recommendSelfBans(index, theirAfterCross, myFinal, true)
            : recommendSelfBans(index, theirAfterCross, myAfterCross)
        : phase === "cross"
          ? phaseWho === "me"
            ? recommendOpponentBans(
                index,
                myAfterCross,
                theirAfterCross,
                Boolean(crossTheirs),
              )
            : recommendOpponentBans(
                index,
                theirAfterCross,
                myAfterCross,
                Boolean(crossMine),
              )
          : [];
  const ranked = new Map(
    rankings.map((r, i) => [r.slug, { ...r, rank: i + 1 }]),
  );
  const shown = visibleDraftHeroes(
    heroes,
    candidates,
    rankings,
    search,
    phaseWho === "me" || phase === "self" || phase === "cross",
  );
  const final = evaluateTeams(index, myFinal, theirFinal);
  function action(slug) {
    if (!candidates.includes(slug)) return;
    setHistory((old) => [...old, { phase, who: phaseWho, slug }]);
    setSearch("");
  }
  function undo() {
    if (!started && format === 6) setManualBans((old) => old.slice(0, -1));
    else setHistory((old) => old.slice(0, -1));
  }
  function reset() {
    setHistory([]);
    setStarted(false);
    setManualBans([]);
    setSearch("");
  }
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-amber-900/50 bg-zinc-900 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Draft Simulator</h2>
          <div className="flex gap-2">
            <Button className="hover:cursor-pointer" variant="outline" disabled={!history.length && (started || !manualBans.length)} onClick={undo}>
              <Undo2 className="mr-1 h-4 w-4" />
              Undo
            </Button>
            <Button className="hover:cursor-pointer" variant="outline" onClick={reset}>
              <RotateCcw className="mr-1 h-4 w-4" />
              Reset Draft
            </Button>
          </div>
        </div>
        {!started ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">
              {format === 6
                ? "Manually ban any number of roster heroes below, then alternate single picks starting with the Leader. No post-draft bans."
                : `Each player pre-bans 2 heroes, alternating from the Leader. Then ${format === 4 ? "1–2–2–2–1" : "1–2–2–2–2–1"} snake picks, Opponent Ban and Self Ban.`}
            </p>
            <div className="flex flex-wrap gap-2" aria-label="Draft format">
              {[4, 5, 6].map((n) => (
                <Button className="hover:cursor-pointer" key={n} variant={format === n ? "outline" : "default"}
                  onClick={() => { setFormat(n); setManualBans([]); setHistory([]); }}>
                  {n} heroes per player
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {["me", "opponent"].map((w) => (
                <Button
                  className="hover:cursor-pointer"
                  key={w}
                  variant={leader === w ? "outline" : "default"}
                  onClick={() => setLeader(w)}
                >
                  {w === "me" ? "I am Leader" : "I am Follower"}
                </Button>
              ))}
            </div>
            {format === 6 && (
              <div className="space-y-2">
                <p className="text-sm">Manual pre-bans: {manualBans.length} · {pool.length} available</p>
                <input aria-label="Search pre-bans" placeholder="Search heroes to ban..." value={search}
                  onChange={(e) => setSearch(e.target.value)} className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" />
                <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto">
                  {heroes.filter((h) => available.includes(h.slug) && h.name.toLowerCase().includes(search.toLowerCase())).map((h) => (
                    <Button key={h.slug} variant="outline" aria-pressed={manualBans.includes(h.slug)}
                      onClick={() => setManualBans((old) => old.includes(h.slug) ? old.filter((s) => s !== h.slug) : [...old, h.slug])}>
                      {manualBans.includes(h.slug) ? "Banned: " : ""}{h.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <Button
              variant="outline"
              className="hover:cursor-pointer border-amber-500"
              disabled={pool.length < format * 2 + (format === 6 ? 0 : 4)}
              onClick={() => { setStarted(true); setSearch(""); }}
            >
              Start Draft
            </Button>
            {pool.length < format * 2 + (format === 6 ? 0 : 4) && (
              <p className="text-xs text-red-300">
                At least {format * 2 + (format === 6 ? 0 : 4)} unbanned heroes are needed{format === 6 ? "." : " before the four pre-bans."}.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {order.map((role, i) => {
                const who = role === "leader" ? leader : other(leader);
                return (
                  <Badge
                    key={i}
                    variant={i < picks.length ? "secondary" : "outline"}
                  >
                    #{i + 1} {label(who)} {i < picks.length ? "✓" : ""}
                  </Badge>
                );
              })}
            </div>
            <p className="font-semibold text-amber-300">
              {phase === "pre"
                ? `Pre-ban ${pre.length + 1}/4 — ${label(phaseWho)} bans (${pre.filter((h) => h.who === phaseWho).length}/2)`
                : phase === "pick"
                ? `Pick ${picks.length + 1}/${format * 2} — ${label(phaseWho)} chooses`
                : phase === "self"
                  ? `Self Ban — ${label(phaseWho)} removes one of their own heroes`
                  : phase === "cross"
                    ? `Opponent Ban — ${label(phaseWho)} removes an enemy hero`
                    : `Draft complete — final ${finalSize} vs ${finalSize}`}
            </p>
            {format !== 6 && picks.length === format * 2 && (
              <div className="space-y-3" aria-label="Ban progress">
                <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {steps.map((step, i) => {
                    const recorded = history.find(
                      (h) => h.phase === step.phase && h.who === step.who,
                    );
                    const active = phase !== "done" && activeBan === step;
                    return (
                      <li
                        key={step.phase + step.who}
                        aria-current={active ? "step" : undefined}
                        className={`rounded-lg border p-3 text-sm ${active ? "border-amber-400 bg-amber-950/40 text-amber-200" : recorded ? "border-emerald-900 bg-emerald-950/20 text-emerald-300" : "border-zinc-800 text-zinc-500"}`}
                      >
                        <div className="font-semibold">
                          {i + 1}. {step.title}
                        </div>
                        <div className="mt-1 text-xs">
                          {recorded
                            ? `✓ ${names.get(recorded.slug) ?? recorded.slug}`
                            : active
                              ? "Current step"
                              : "Up next"}
                        </div>
                      </li>
                    );
                  })}
                </ol>
                {phase !== "done" && (
                  <p
                    className="rounded-lg border border-amber-900/50 bg-zinc-950 p-3 font-semibold text-amber-300"
                    role="status"
                  >
                    {activeBan.instruction}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
      {started && (
        <>
          <p className="text-sm text-zinc-400">{banned.length} simulator pre-bans · {pool.length} active heroes{banned.length ? ` · Banned: ${banned.map((s) => names.get(s)).join(", ")}` : ""}</p>
          <details className="rounded border border-zinc-800 p-3">
            <summary className="cursor-pointer">Active draft statistics ({pool.length} heroes)</summary>
            <div className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {rosterStats.map((h) => <p key={h.slug} className="text-sm">{h.name}: {pct(h.winRate)} · {h.games} games</p>)}
            </div>
          </details>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Your heroes", mine, "text-emerald-400"],
              ["Opponent heroes", theirs, "text-red-400"],
            ].map(([title, slugs, color]) => (
              <div
                key={title}
                className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3"
              >
                <h3 className={`mb-2 font-semibold ${color}`}>
                  {title} ({slugs.length}/{format})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {slugs.map((s) => (
                    <span
                      key={s}
                      className={`rounded border border-zinc-700 px-2 py-1 text-sm ${[selfMine, selfTheirs, crossMine, crossTheirs].includes(s) ? "line-through opacity-40" : ""}`}
                    >
                      {names.get(s) ?? s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {phase !== "done" ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold">
                  {phaseWho === "me"
                    ? "Your options & recommendations"
                    : "Record opponent's choice"}
                </h3>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search heroes..."
                  className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                />
              </div>
              {phaseWho === "me" && (
                <p className="text-sm text-zinc-400">
                  {phase === "pick"
                    ? theirs.length
                      ? "Ranked by matchup results against opponent's current picks."
                      : "No opponent picks yet: ranked by Roster WR (Overall WR fallback)."
                    : phase === "pre" ? "Choose a hero to exclude from this draft." : `Recommendations maximize your worst-case projected final ${finalSize}v${finalSize} matchup. Missing matchup data is treated as neutral (50%) only in simulations.`}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {shown.map((h) => {
                  const r = ranked.get(h.slug);
                  return (
                    <div
                      key={h.slug}
                      className="relative rounded-lg border border-zinc-700 bg-zinc-900 hover:border-amber-500"
                    >
                      <button
                        onClick={() => action(h.slug)}
                        className="block w-full cursor-pointer text-left"
                      >
                        <img
                          src={h.image}
                          alt={h.name}
                          className="aspect-3/4 w-full rounded-t-lg object-cover"
                          loading="lazy"
                        />
                        <div className="p-2 text-xs">
                          <div className="font-semibold">{h.name}</div>
                          {r && (
                            <div className="mt-1 text-amber-300">
                              #{r.rank} · {pct(r.score)}
                              {r.games != null && (
                                <span className="text-zinc-500">
                                  {" "}
                                  · {r.games} games
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                      <div className="absolute right-1 top-1 rounded bg-zinc-950/90">
                        <MatchupInfo
                          hero={h.slug}
                          opponents={
                            phase === "cross"
                              ? phaseWho === "me"
                                ? myAfterCross
                                : theirAfterCross
                              : phaseWho === "me"
                                ? phase === "pick"
                                  ? theirs
                                  : theirFinal
                                : phase === "pick"
                                  ? mine
                                  : myFinal
                          }
                          index={index}
                          names={names}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-emerald-900/50 bg-zinc-900 p-4 space-y-3">
              <h3 className="text-xl font-bold">Final Teams — {finalSize} vs {finalSize}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-emerald-400">You</p>
                  {myFinal.map((s) => (
                    <p key={s}>{names.get(s)}</p>
                  ))}
                </div>
                <div>
                  <p className="text-red-400">Opponent</p>
                  {theirFinal.map((s) => (
                    <p key={s}>{names.get(s)}</p>
                  ))}
                </div>
              </div>
              <p>
                Matchup WR: <strong>{pct(final.rate)}</strong> · {final.games}{" "}
                games · {final.covered}/{final.possible} matchups covered
              </p>
              <div className="space-y-1">
                {final.details.map((d) => (
                  <div
                    key={`${d.a}|${d.b}`}
                    className="flex justify-between border-t border-zinc-800 py-2 text-sm"
                  >
                    <span>
                      {names.get(d.a)} vs {names.get(d.b)}
                    </span>
                    <span>
                      {pct(d.data?.rate)} ({d.data?.games ?? 0} games)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
