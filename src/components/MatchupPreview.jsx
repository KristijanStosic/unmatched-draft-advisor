import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { getMatchupRows } from "@/lib/draftAnalysis";

export default function MatchupPreview({ hero, opponents, matchupIndex, children }) {
  const [sort, setSort] = useState("best");
  const rows = getMatchupRows(hero, opponents, matchupIndex, sort);
  return (
    <Popover.Root>
      <Popover.Trigger openOnHover delay={180} closeDelay={250}
        className="block w-full cursor-pointer rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        aria-label={`Matchups for ${hero.name}`}>
        {children || <span className="border-b border-dotted border-amber-500/60">{hero.name}</span>}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={8} collisionPadding={12} className="z-50">
          <Popover.Popup className="w-100 max-w-[calc(100vw-24px)] rounded-xl border border-amber-900/60 bg-zinc-950 p-3 text-zinc-100 shadow-2xl outline-none">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Popover.Title className="font-bold text-amber-400">{hero.name} — Matchups</Popover.Title>
                <Popover.Description className="mt-1 text-xs text-zinc-400">Against remaining unbanned roster heroes</Popover.Description>
              </div>
              <Popover.Close aria-label="Close matchups" className="cursor-pointer px-2 text-zinc-400">×</Popover.Close>
            </div>
            <label className="my-3 flex items-center justify-between gap-2 text-xs text-zinc-400">
              Sort by
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded border border-zinc-700 bg-zinc-900 p-1.5 text-zinc-100">
                <option value="best">Win rate: highest first</option>
                <option value="worst">Win rate: lowest first</option>
                <option value="games">Games: most first</option>
                <option value="name">Hero name</option>
              </select>
            </label>
            <div className="max-h-[min(360px,50dvh)] overflow-y-auto overscroll-contain" tabIndex={0} aria-label="Matchup results">
              {rows.length ? <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-zinc-950 text-zinc-400"><tr><th className="py-2">Opponent</th><th className="text-right">Win rate</th><th className="text-right">Games</th></tr></thead>
                <tbody>{rows.map((row) => <tr key={row.slug} className="border-t border-zinc-800">
                  <td className="py-2 pr-2">{row.name}</td>
                  <td className={`text-right font-semibold ${row.winRate == null ? "text-zinc-500" : row.winRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>{row.winRate == null ? "N/A" : `${row.winRate.toFixed(1)}%`}</td>
                  <td className="pl-3 text-right text-zinc-400">{row.games == null ? "N/A" : row.games.toLocaleString()}</td>
                </tr>)}</tbody>
              </table> : <p className="py-4 text-xs text-zinc-400">No remaining opponents.</p>}
            </div>
            <p className="mt-3 text-xs text-zinc-500">N/A = no matchup data. Percentages use wins / games.</p>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
