import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { matchup } from "@/lib/draftStrategy";
import { closeMatchups, heroPoolMatchups } from "@/lib/matchupExplorer";

const pct = (n) => (n == null ? "N/A" : `${n.toFixed(1)}%`);
const selectClass =
  "w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm";

export default function MatchupExplorer({ open, onOpenChange, heroes, index, available, banned }) {
  const [poolHero, setPoolHero] = useState("");
  const poolHeroes = useMemo(
    () => heroes
      .filter((hero) => available.includes(hero.slug) && !banned.includes(hero.slug))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [heroes, available, banned],
  );
  const selectedHero = poolHeroes.find((hero) => hero.slug === poolHero);
  const poolRows = useMemo(
    () => heroPoolMatchups(heroes, index, poolHero, available, banned),
    [heroes, index, poolHero, available, banned],
  );
  const [mode, setMode] = useState("pair");
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [filterHero, setFilterHero] = useState("");
  const [minimum, setMinimum] = useState(1);
  const [search, setSearch] = useState("");
  const sorted = useMemo(
    () => [...heroes].sort((a, b) => a.name.localeCompare(b.name)),
    [heroes],
  );
  const a = heroes.find((h) => h.slug === first),
    b = heroes.find((h) => h.slug === second);
  const data =
    a && b && first !== second ? matchup(index, first, second) : null;
  const rows = useMemo(
    () => closeMatchups(sorted, index, filterHero, minimum),
    [sorted, index, filterHero, minimum],
  );
  const shown = rows.filter((r) =>
    `${r.a.name} ${r.b.name}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-900/50 bg-zinc-900 text-zinc-100 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Matchup Explorer</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {[
            ["pair", "Hero vs Hero"],
            ["pool", "Hero vs Available Pool"],
            ["close", "Close matchups · 45–55%"],
          ].map(([value, title]) => (
            <Button
              key={value}
              variant={mode === value ? "default" : "outline"}
              onClick={() => setMode(value)}
            >
              {title}
            </Button>
          ))}
        </div>
        {mode === "pair" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Hero A", first, setFirst, second],
                ["Hero B", second, setSecond, first],
              ].map(([title, value, setValue, exclude]) => (
                <label key={title} className="space-y-1 text-sm">
                  <span>{title}</span>
                  <select
                    className={selectClass}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  >
                    <option value="">Choose a hero</option>
                    {sorted
                      .filter((h) => h.slug !== exclude)
                      .map((h) => (
                        <option key={h.slug} value={h.slug}>
                          {h.name}
                        </option>
                      ))}
                  </select>
                </label>
              ))}
            </div>
            {a && b ? (
              <div className="rounded-lg border border-amber-900/50 bg-zinc-950 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    [a, data?.rate],
                    [b, data ? 100 - data.rate : null],
                  ].map(([hero, rate]) => (
                    <div key={hero.slug} className="text-center">
                      <img
                        src={hero.image}
                        alt={hero.name}
                        className="mx-auto h-40 rounded object-contain"
                      />
                      <p className="mt-2 font-semibold">{hero.name}</p>
                      <p className="text-2xl font-bold text-amber-300">
                        {pct(rate)}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-center text-sm text-zinc-400">
                  {data
                    ? `${data.games} games · ${a.name}: ${data.wins} wins · ${b.name}: ${data.games - data.wins} wins`
                    : "N/A · 0 games — no recorded matchup data."}
                </p>
                {data && data.rate >= 45 && data.rate <= 55 && (
                  <p className="text-center text-sm text-emerald-300">
                    Close matchup · 45–55%
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">
                Choose two different heroes to see their head-to-head results.
              </p>
            )}
          </div>
        ) : mode === "pool" ? (
          <section className="space-y-4" aria-label="Hero vs Available Pool">
            <h2 className="text-lg font-semibold">Hero vs Available Pool</h2>
            <label className="block space-y-1 text-sm">
              <span>Selected hero</span>
              <select className={selectClass} value={selectedHero ? poolHero : ""}
                onChange={(event) => setPoolHero(event.target.value)}>
                <option value="">Choose a hero</option>
                {poolHeroes.map((hero) => (
                  <option key={hero.slug} value={hero.slug}>{hero.name}</option>
                ))}
              </select>
            </label>
            <p className="text-sm text-zinc-400">
              Opponents come from Available Heroes in your roster, excluding draft bans and the selected hero.
              Sorted by the selected hero's WR, highest first; missing results appear last as N/A.
            </p>
            {selectedHero ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-700 text-left">
                        <th scope="col" className="p-2">Opponent</th>
                        <th scope="col" className="p-2 text-right">{selectedHero.name} WR</th>
                        <th scope="col" className="p-2 text-right">Opponent WR</th>
                        <th scope="col" className="p-2 text-right">Games</th>
                      </tr>
                    </thead>
                    <tbody>
                      {poolRows.map((row) => (
                        <tr key={row.opponent.slug} className="border-b border-zinc-800">
                          <td className="p-2">{row.opponent.name}</td>
                          <td className="p-2 text-right text-amber-300">{pct(row.rate)}</td>
                          <td className="p-2 text-right text-amber-300">{pct(row.oppositeRate)}</td>
                          <td className="p-2 text-right">{row.games ?? "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!poolRows.length && <p className="text-sm text-zinc-400">No other available heroes. Select heroes in Roster or adjust draft bans.</p>}
              </>
            ) : <p className="text-sm text-zinc-400">Choose a hero to see results against the available pool.</p>}
          </section>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              Both heroes have a WR between 45% and 55%, inclusive. Sorted
              closest to 50–50 first, then by games played. Missing data is
              excluded.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-sm">
                <span>Hero</span>
                <select
                  className={selectClass}
                  value={filterHero}
                  onChange={(e) => setFilterHero(e.target.value)}
                >
                  <option value="">All heroes</option>
                  {sorted.map((h) => (
                    <option key={h.slug} value={h.slug}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span>Search matchup</span>
                <input
                  className={selectClass}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Hero name..."
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>Minimum games</span>
                <input
                  className={selectClass}
                  type="number"
                  min="1"
                  step="1"
                  value={minimum}
                  onChange={(e) =>
                    setMinimum(
                      Math.max(1, Math.floor(Number(e.target.value) || 1)),
                    )
                  }
                />
              </label>
            </div>
            <p className="text-sm text-amber-300">
              {shown.length} close matchups
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700 text-left">
                    <th className="p-2">Hero A</th>
                    <th className="p-2 text-right">WR A</th>
                    <th className="p-2">Hero B</th>
                    <th className="p-2 text-right">WR B</th>
                    <th className="p-2 text-right">Games</th>
                    <th className="p-2">
                      <span className="sr-only">View pair</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr
                      key={`${r.a.slug}|${r.b.slug}`}
                      className="border-b border-zinc-800"
                    >
                      <td className="p-2">{r.a.name}</td>
                      <td className="p-2 text-right text-amber-300">
                        {pct(r.rate)}
                      </td>
                      <td className="p-2">{r.b.name}</td>
                      <td className="p-2 text-right text-amber-300">
                        {pct(r.oppositeRate)}
                      </td>
                      <td className="p-2 text-right">{r.games}</td>
                      <td className="p-2">
                        <button
                          className="text-amber-300 underline"
                          onClick={() => {
                            setFirst(r.a.slug);
                            setSecond(r.b.slug);
                            setMode("pair");
                          }}
                          aria-label={`View ${r.a.name} vs ${r.b.name}`}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!shown.length && (
              <p className="text-sm text-zinc-400">
                No close matchups match these filters.
              </p>
            )}
          </div>
        )}
        <p className="text-xs text-zinc-500">
          {mode === "pool"
            ? "Uses the current roster pool without banned opponents."
            : "Uses all heroes in the currently loaded Matchups CSV, independently of your roster and draft bans."}
          {" "}Small game counts can give less reliable estimates.
        </p>
      </DialogContent>
    </Dialog>
  );
}
