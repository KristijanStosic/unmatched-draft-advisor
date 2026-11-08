import { MATCHUP_RATINGS, matchupRating } from "@/lib/matchupRating";

export default function MatchupRating({ rate, games }) {
  const rating = matchupRating(rate, games);
  const reason =
    rating.label === "Unknown"
      ? Number.isFinite(rate) && games > 0
        ? "Too few games (minimum 4)"
        : "No recorded matchup data"
      : "From this hero’s perspective · " + rating.range + " WR";
  return (
    <span
      title={reason}
      aria-label={rating.label + ": " + reason}
      className={
        "inline-flex max-w-full items-center rounded border px-1.5 py-0.5 text-[11px] font-medium leading-tight " +
        rating.color
      }
    >
      {rating.label}
    </span>
  );
}

export function MatchupLegend() {
  return (
    <details className="rounded border border-zinc-700 p-2 text-xs text-zinc-400">
      <summary className="cursor-pointer">Matchup ratings · legend</summary>
      <p className="mt-2">
        Ratings use the selected hero’s WR, before rounding. Counter means this
        hero strongly favours the matchup. Fewer than 4 games is Unknown;
        recorded WR and Games remain visible.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {MATCHUP_RATINGS.map((rating) => (
          <span
            key={rating.label}
            className={"rounded border px-2 py-1 " + rating.color}
          >
            {rating.label} · {rating.range}
          </span>
        ))}
      </div>
    </details>
  );
}
