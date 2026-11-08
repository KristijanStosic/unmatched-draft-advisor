// Use raw WR, never the rounded display percentage. At least four games are required.
export const MATCHUP_RATINGS = [
  { label: 'Counter', range: '>75%', color: 'text-green-300 bg-green-950/60 border-green-700' },
  { label: 'Favoured', range: '>60–75%', color: 'text-emerald-300 bg-emerald-950/60 border-emerald-700' },
  { label: 'Slightly Favoured', range: '>55–60%', color: 'text-teal-300 bg-teal-950/60 border-teal-700' },
  { label: 'Balanced', range: '45–55%', color: 'text-slate-200 bg-slate-800 border-slate-600' },
  { label: 'Slightly Losing', range: '40–<45%', color: 'text-yellow-300 bg-yellow-950/60 border-yellow-700' },
  { label: 'Losing', range: '25–<40%', color: 'text-orange-300 bg-orange-950/60 border-orange-700' },
  { label: 'Nightmare', range: '<25%', color: 'text-red-300 bg-red-950/60 border-red-700' },
  { label: 'Unknown', range: 'No data or fewer than 4 games', color: 'text-zinc-400 bg-zinc-900 border-zinc-700' },
];
export function matchupRating(rate, games) {
  if (!Number.isFinite(rate) || rate < 0 || rate > 100 || !Number.isFinite(games) || games < 4) return MATCHUP_RATINGS[7];
  return MATCHUP_RATINGS[rate > 75 ? 0 : rate > 60 ? 1 : rate > 55 ? 2 : rate >= 45 ? 3 : rate >= 40 ? 4 : rate >= 25 ? 5 : 6];
}
