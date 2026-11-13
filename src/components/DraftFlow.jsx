import MatchupRating from '@/components/MatchupRating';
import { matchupRating } from "@/lib/matchupRating";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Undo2, Info, ArrowRight, Check } from "lucide-react";
import DraftTournaments from "@/components/DraftTournaments";
import { DRAFT_FORMATS, arsenalDraftState, draftFormat } from "@/lib/draftFormats";
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
          className="absolute right-0 top-full z-50 mt-1 w-80 max-w-[85vw] max-h-64 overflow-y-auto rounded-lg border border-amber-800 bg-zinc-950 p-3 text-left shadow-2xl"
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
                <span className="flex max-w-[65%] flex-wrap items-center justify-end gap-1 text-right">
                  {pct(data?.rate)}{" "}
                  <span className="text-zinc-500">({data?.games ?? 0})</span>
                  <MatchupRating rate={data?.rate} games={data?.games} />
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

function BanProgress({ title, steps, names, instruction }) {
  return (
    <section aria-label={title} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(130px,1fr))]">
        {steps.map(({ who, role, phase, recorded, active }, index) => (
          <li key={index} aria-current={active ? "step" : undefined}
            className={`min-w-0 rounded-md border p-2.5 text-sm ${active ? "border-amber-400 bg-amber-950/50 ring-1 ring-amber-400/30" : recorded ? "border-emerald-900 bg-emerald-950/25" : "border-zinc-800 bg-zinc-900"}`}>
            <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
              <span className="text-zinc-400">{index + 1}. {phase}</span>
              {active && <span className="flex items-center gap-1 font-semibold text-amber-300"><ArrowRight className="size-3" aria-hidden="true" /> Current turn</span>}
            </div>
            <p className={`mt-1 font-semibold ${who === "me" ? "text-emerald-300" : "text-red-300"}`}>{label(who)} <span className="font-normal text-zinc-400">· {role}</span></p>
            {recorded && <p className="mt-1 flex items-center gap-1 wrap-break-word text-xs text-zinc-200">
              <Check className="size-3 shrink-0 text-emerald-400" aria-hidden="true" /> {names.get(recorded.slug) ?? recorded.slug}
            </p>}
          </li>
        ))}
      </ol>
      {instruction && <p role="status" className="border-l-2 border-amber-400 pl-3 text-sm font-medium text-amber-200">{instruction}</p>}
    </section>
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
  const [tournament, setTournament] = useState(null);
  const [manualBans, setManualBans] = useState([]);
  const [leader, setLeader] = useState("opponent");
  const [started, setStarted] = useState(false);
  const [actions, setHistory] = useState([]);
  const [search, setSearch] = useState("");
  const arsenal = format === "arsenal";
  const barsenal = format === "barsenal";
  const { name: formatName, size, preBans } = draftFormat(format);
  const arsenalState = useMemo(
    () => arsenal || barsenal ? arsenalDraftState(actions, size, barsenal ? available : undefined) : null,
    [actions, arsenal, barsenal, available, size],
  );
  const history = arsenalState?.confirmed ?? actions;
  const lastRestore = history.findLastIndex(({ phase }) => phase === "restore-mirrors");
  const mirrorBans = history.slice(lastRestore + 1).filter(({ phase }) => phase === "conflict").map(({ slug }) => slug);
  useEffect(() => {
    onBannedChange([
      ...(format === 6 ? manualBans : []),
      ...history.filter(({ phase }) => ["pre", "cross", "self"].includes(phase)).map(({ slug }) => slug),
      ...history.slice(lastRestore + 1).filter(({ phase }) => phase === "conflict").map(({ slug }) => slug),
    ]);
  }, [format, manualBans, history, lastRestore, onBannedChange]);
  useEffect(() => () => onBannedChange([]), [onBannedChange]);
  const names = useMemo(
    () => new Map(heroes.map((h) => [h.slug, h.name])),
    [heroes],
  );
  const order = pickOrder(format);
  const arquest = format === "arquest";
  const finalSize = format === 6 ? 6 : size - 2;
  const minimum = size * 2 + preBans * 2;
  const pre = history.filter((h) => h.phase === "pre");
  const banned = format === 6 ? manualBans : [...pre.map(({ slug }) => slug), ...mirrorBans];
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
  const arsenalPicking = phase === "arsenal" || phase === "barsenal";
  const picking = phase === "pick" || arsenalPicking;
  const cannotFillArsenal = arsenalPicking && remaining.length < size * 2 - picks.length;
  const steps = format === 6 ? [] : banSteps(leader);
  const activeBan = steps.find(
    (step) =>
      !history.some((h) => h.phase === step.phase && h.who === step.who),
  );
  const phaseWho = arsenalPicking ? arsenalState.who : phase === "pre" ? (pre.length % 2 === 0 ? leader : other(leader)) : picking ? current : activeBan?.who;
  const pendingPicks = arsenalPicking ? arsenalState.pending : { me: [], opponent: [] };
  const myVisiblePicks = [...mine, ...pendingPicks.me];
  const theirVisiblePicks = [...theirs, ...pendingPicks.opponent];
  const pickOpponents = phaseWho === "me" ? theirVisiblePicks : myVisiblePicks;
  const candidates =
    arsenalPicking
      ? remaining.filter((slug) => !pendingPicks[phaseWho].includes(slug))
      : phase === "pre" || picking
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
    picking
      ? recommendPicks(
          index,
          candidates,
          pickOpponents,
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
    phaseWho === "me" || arsenalPicking || phase === "self" || phase === "cross",
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
  function applyFormat(next, nextTournament = null) {
    if (started && !window.confirm("Apply this format and reset the current draft?")) return;
    reset();
    setFormat(next);
    setTournament(nextTournament);
  }
  function startDraft() {
    setStarted(true);
    setSearch("");
  }
  return (
    <div className="space-y-5">
      <DraftTournaments format={format} tournament={tournament} onApply={applyFormat} />
      <div className="rounded-lg border border-amber-900/50 bg-zinc-900 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Draft Simulator</h2>
          <div className="flex gap-2">
            <Button className="hover:cursor-pointer" variant="outline" disabled={!actions.length && (started || !manualBans.length)} onClick={undo}>
              <Undo2 className="mr-1 h-4 w-4" />
              Undo
            </Button>
            <Button className="hover:cursor-pointer" variant="outline" onClick={reset}>
              <RotateCcw className="mr-1 h-4 w-4" />
              Reset Draft
            </Button>
          </div>
        </div>
        <p className="font-semibold">{tournament ? `${tournament.name} · ` : ""}{formatName}</p>
        {!started ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">
              {format === 6
                ? "Manually ban any number of roster heroes below, then alternate single picks starting with the Leader. No post-draft bans."
                : arsenal || barsenal
                  ? `Enter your picks first, then record your opponent’s picks. Shared picks are banned automatically after each round. Fill open slots until both players have ${size} fighters.`
                  : arquest
                    ? "Alternate three pre-bans per player, then pick in LFFLLFFLLF order. Record Opponent Bans and Self Bans after the picks."
                    : `Each player pre-bans 2 heroes, alternating from the Leader. Then ${format === 4 ? "1–2–2–2–1" : "1–2–2–2–2–1"} snake picks, Opponent Ban and Self Ban.`}
            </p>
            <div className="flex flex-wrap gap-2" aria-label="Draft format">
              {DRAFT_FORMATS.map(({ id, name }) => (
                <Button className="hover:cursor-pointer" key={id} aria-pressed={format === id} variant={format === id ? "outline" : "default"}
                  onClick={() => applyFormat(id)}>
                  {name}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Choose Leader and Follower">
              {["me", "opponent"].map((w) => (
                <Button
                  className="hover:cursor-pointer"
                  key={w}
                  aria-pressed={leader === w}
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
              disabled={pool.length < minimum}
              onClick={startDraft}
            >
              Start Draft
            </Button>
            {pool.length < minimum && (
              <p className="text-xs text-red-300">
                At least {minimum} unbanned heroes are needed to start.
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-zinc-300">
              Leader: {label(leader)} · Follower: {label(other(leader))}
            </p>
            {order.length > 0 && <div className="flex flex-wrap gap-2">
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
            </div>}
            <p className="font-semibold text-amber-300">
              {phase === "pre"
                ? `Pre-ban ${pre.length + 1}/${preBans * 2} — ${label(phaseWho)} bans (${pre.filter((h) => h.who === phaseWho).length}/${preBans})`
                : phase === "pick"
                ? `Pick ${picks.length + 1}/${size * 2} — ${label(phaseWho)} chooses`
                : arsenalPicking
                  ? `${formatName} — ${phaseWho === "me" ? "Choose your next hero" : "Record opponent’s next hero"} (${(phaseWho === "me" ? myVisiblePicks : theirVisiblePicks).length}/${size})`
                : phase === "self"
                  ? `Self Ban — ${label(phaseWho)} removes one of their own heroes`
                  : phase === "cross"
                    ? `Opponent Ban — ${label(phaseWho)} removes an enemy hero`
                    : `Draft complete — final ${finalSize} vs ${finalSize}`}
            </p>
            {preBans > 0 && (
              <BanProgress title="Pre-ban order" names={names}
                instruction={phase === "pre" ? (phaseWho === "me" ? "Choose a hero to exclude from this draft." : "Record the hero your opponent pre-banned.") : undefined}
                steps={Array.from({ length: preBans * 2 }, (_, i) => ({
                  who: i % 2 === 0 ? leader : other(leader),
                  role: i % 2 === 0 ? "Leader" : "Follower",
                  phase: "Pre-ban",
                  recorded: pre[i],
                  active: phase === "pre" && i === pre.length,
                }))} />
            )}
            {steps.length > 0 && picks.length === size * 2 && (
              <BanProgress title="Post-draft ban order" names={names} instruction={activeBan?.instruction}
                steps={steps.map((step) => ({
                  who: step.who,
                  role: step.who === leader ? "Leader" : "Follower",
                  phase: step.phase === "cross" ? "Opponent Ban" : "Self Ban",
                  recorded: history.find((entry) => entry.phase === step.phase && entry.who === step.who),
                  active: activeBan === step,
                }))} />
            )}
          </>
        )}
      </div>
      {started && (
        <>
          <p className="text-sm text-zinc-400">{banned.length} {arsenal || barsenal ? "duplicate picks banned" : "simulator pre-bans"} · {pool.length} active heroes{banned.length ? ` · Banned: ${banned.map((s) => names.get(s)).join(", ")}` : ""}</p>
          {history.at(-1)?.phase === "restore-mirrors" && (
            <p role="status" className="text-sm text-amber-300">The remaining pool was too small. All mirror bans have been lifted.</p>
          )}
          <details className="rounded border border-zinc-800 p-3">
            <summary className="cursor-pointer">Active draft statistics ({pool.length} heroes)</summary>
            <div className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {rosterStats.map((h) => <p key={h.slug} className="text-sm">{h.name}: {pct(h.winRate)} · {h.games} games</p>)}
            </div>
          </details>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Your heroes", myVisiblePicks, "text-emerald-400", pendingPicks.me],
              ["Opponent heroes", theirVisiblePicks, "text-red-400", pendingPicks.opponent],
            ].map(([title, slugs, color, pending]) => (
              <div
                key={title}
                className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3"
              >
                <h3 className={`mb-2 font-semibold ${color}`}>
                  {title} ({slugs.length}/{size})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {slugs.map((s) => (
                    <span
                      key={s}
                      className={`rounded border border-zinc-700 px-2 py-1 text-sm ${[selfMine, selfTheirs, crossMine, crossTheirs].includes(s) ? "line-through opacity-40" : ""}`}
                    >
                      {names.get(s) ?? s}
                      {pending.includes(s) && <span className="ml-1 text-xs text-amber-300">Pending</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {(phase === "self" || phase === "cross") && (
            <section aria-label="Ban matchup comparison" className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
              <h3 className="font-semibold">{phase === "cross" ? "Opponent Ban" : "Self Ban"} · Matchup overview</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="mb-2 text-left text-xs text-zinc-400">
                    {phase === "cross"
                      ? "Win rates and game counts for fighters still available after any recorded Opponent Ban."
                      : "Win rates and game counts for all fighters who passed Opponent Ban, including any recorded Self Ban."}
                    {" "}Ratings are from your fighters’ perspective.
                  </caption>
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th scope="col" className="p-2 text-left">Your fighter</th>
                      {theirAfterCross.map((slug) => (
                        <th key={slug} scope="col" className="min-w-24 p-2 text-center">{names.get(slug) ?? slug}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {myAfterCross.map((mine) => (
                      <tr key={mine} className="border-b border-zinc-800 last:border-0">
                        <th scope="row" className="p-2 text-left font-medium">{names.get(mine) ?? mine}</th>
                        {theirAfterCross.map((theirs) => {
                          const result = matchup(index, mine, theirs);
                          const rating = matchupRating(result?.rate, result?.games);
                          return (
                            <td key={theirs} className="p-2 text-center">
                              <div className={`space-y-1 rounded-md border p-2 ${rating.color}`}>
                                <div className="font-semibold tabular-nums">{pct(result?.rate)}</div>
                                {result && <div className="text-xs text-zinc-300">{result.games} games</div>}
                                <MatchupRating rate={result?.rate} games={result?.games} />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {cannotFillArsenal ? (
            <p role="alert" className="text-red-300">There are too few eligible heroes to fill both pools. Undo the last pick or reset the draft.</p>
          ) : phase !== "done" ? (
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
              {(phaseWho === "me" || arsenalPicking) && (
                <p className="text-sm text-zinc-400">
                  {picking
                    ? pickOpponents.length
                      ? `Ranked by matchup results against ${phaseWho === "me" ? "opponent’s" : "your"} current picks.`
                      : "No opposing picks yet: ranked by Roster WR (Overall WR fallback)."
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
                          {arsenalPicking && pendingPicks[other(phaseWho)].includes(h.slug) && (
                            <div className="mt-1 text-amber-300">Mirror pick · both copies will be banned</div>
                          )}
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
                            picking
                              ? pickOpponents
                              : phase === "cross"
                              ? phaseWho === "me"
                                ? myAfterCross
                                : theirAfterCross
                              : phaseWho === "me" ? theirFinal : myFinal
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
                      {pct(d.data?.rate)} ({d.data?.games ?? 0} games){" "}
                      <MatchupRating rate={d.data?.rate} games={d.data?.games} />
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
