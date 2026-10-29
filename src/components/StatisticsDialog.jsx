import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const fmt = (value) => (value == null ? "N/A" : `${value.toFixed(1)}%`);

export default function StatisticsDialog({
  open,
  onOpenChange,
  initialMode = "roster",
  heroes,
  rosterStats,
  overallStats,
}) {
  const [mode, setMode] = useState(initialMode);
  const [selected, setSelected] = useState(null);
  const heroMap = new Map(heroes.map((h) => [h.slug, h]));
  const rows =
    mode === "overall"
      ? [...overallStats.values()]
          .map((item) => ({
            ...item,
            image:
              heroMap.get(item.slug)?.image ||
              `${import.meta.env.BASE_URL}images/${item.slug}.jpg`,
          }))
          .sort((a, b) => (b.winRate ?? -1) - (a.winRate ?? -1))
      : mode === "roster"
        ? rosterStats
        : [];
  const selectedRow = rows.find((h) => h.slug === selected);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-amber-900/50 bg-zinc-800 text-zinc-100 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Hero Statistics</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {[
            ["overall", "Overall WR"],
            ["roster", "Roster WR"],
          ].map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={mode === key ? "default" : "outline"}
              onClick={() => {
                setMode(key);
                setSelected(null);
              }}
            >
              {label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-zinc-400">
          {mode === "overall"
            ? "Ukupna statistika svih heroja iz Overall CSV-a."
            : mode === "roster"
              ? "Rezultati protiv celog sačuvanog rostera, bez uticaja banova."
              : "Rezultati protiv heroja koji nisu banovani."}{" "}
          Klikni na heroja za detalje.
        </p>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900 text-white-400">
              <tr>
                <th className="p-2">#</th>
                <th className="p-2">Hero</th>
                <th className="p-2 text-right">WR</th>
                <th className="p-2 text-right">Games</th>
                <th className="p-2 text-right">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((h, i) => (
                <tr
                  key={h.slug}
                  onClick={() =>
                    setSelected(h.slug === selected ? null : h.slug)
                  }
                  className={`cursor-pointer border-t border-zinc-800 hover:bg-zinc-900 ${selected === h.slug ? "bg-amber-950/40" : ""}`}
                >
                  <td className="p-2 text-zinc-500">{i + 1}</td>
                  <td className="p-2 font-medium">{h.name}</td>
                  <td
                    className={`p-2 text-right font-semibold ${h.winRate >= 55 ? "text-emerald-400" : ""}`}
                  >
                    {fmt(h.winRate)}
                  </td>
                  <td className="p-2 text-right">{h.games}</td>
                  <td className="p-2 text-right text-zinc-400">
                    {h.possible == null ? "—" : `${h.covered}/${h.possible}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selectedRow && (
          <div className="space-y-2 rounded-lg border border-amber-900/40 bg-zinc-900/70 p-3">
            <h3 className="font-semibold">
              {selectedRow.name} — {fmt(selectedRow.winRate)}
            </h3>
            {selectedRow.details?.length ? (
              <div className="max-h-52 overflow-y-auto">
                {selectedRow.details.map((d) => (
                  <div
                    key={d.slug}
                    className="flex justify-between border-b border-zinc-800 py-1 text-sm"
                  >
                    <span>{d.name}</span>
                    <span>
                      {fmt(d.winRate)} · {d.games} games
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">
                {mode === "overall"
                  ? "Overall CSV sadrži zbirne rezultate; detalji protivnika dostupni su u Roster/Draft prikazu."
                  : "Nema matchup podataka za preostale protivnike."}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
