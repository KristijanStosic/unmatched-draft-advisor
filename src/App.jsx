import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Swords, Search, BarChart3, CheckCheck } from "lucide-react";
import RandomMapGenerator from "@/components/RandomMapGenerator";
import HeroCard from "@/components/HeroCard";
import RosterPanel from "@/components/RosterPanel";
import StatisticsDialog from "@/components/StatisticsDialog";
import DraftFlow from "@/components/DraftFlow";
import MatchupExplorer from "@/components/MatchupExplorer";
import { parseMatchupCsv, parseOverallWinRatesCsv } from "@/lib/csvParser";
import { buildMatchupIndex, analyzePool } from "@/lib/draftAnalysis";
import { loadRoster, saveRoster, clearRoster } from "@/lib/storage";

const MATCHUPS_FILE = "hero-matchups-unmatched.csv";
const OVERALL_FILE = "hero-win-rates-unmatched.csv";

export default function App() {
  const [heroes, setHeroes] = useState([]);
  const [matchups, setMatchups] = useState([]);
  const [overall, setOverall] = useState(new Map());
  const [roster, setRoster] = useState(loadRoster);
  const [screen, setScreen] = useState("roster");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaved, setIsSaved] = useState(true);
  const [statsOpen, setStatsOpen] = useState(false);
  const [matchupsOpen, setMatchupsOpen] = useState(false);
  const [draftBans, setDraftBans] = useState([]);
  const [statsMode, setStatsMode] = useState("roster");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const paths = [MATCHUPS_FILE, OVERALL_FILE].map(
          (name) => `${import.meta.env.BASE_URL}data/${name}`,
        );
        const responses = await Promise.all(
          paths.map((path) => fetch(path, { cache: "no-store" })),
        );
        if (!responses[0].ok || !responses[1].ok)
          throw new Error("Nedostaje jedan od CSV fajlova u public/data.");
        const [matchText, overallText] = await Promise.all(
          responses.map((response) => response.text()),
        );
        const parsed = parseMatchupCsv(matchText);
        const parsedOverall = parseOverallWinRatesCsv(overallText);
        if (active) {
          setHeroes(parsed.heroes);
          setMatchups(parsed.matchups);
          setOverall(parsedOverall);
        }
      } catch (e) {
        if (active) setError(e.message);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const available = useMemo(() => new Set(heroes.map((h) => h.slug)), [heroes]);
  const selected = useMemo(
    () => heroes.filter((h) => roster.includes(h.slug)),
    [heroes, roster],
  );
  const validRoster = useMemo(
    () => roster.filter((slug) => available.has(slug)),
    [roster, available],
  );
  const index = useMemo(() => buildMatchupIndex(matchups), [matchups]);
  const rosterStats = useMemo(
    () => analyzePool(heroes, validRoster, index),
    [heroes, validRoster, index],
  );
  const filtered = useMemo(
    () =>
      heroes.filter((h) =>
        h.name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [heroes, search],
  );

  function toggleHero(slug) {
    setRoster((old) =>
      old.includes(slug) ? old.filter((s) => s !== slug) : [...old, slug],
    );
    setIsSaved(false);
  }
  function selectAllHeroes() {
    setRoster(heroes.map((hero) => hero.slug));
    setIsSaved(false);
  }

  function save() {
    if (saveRoster(roster)) {
      setIsSaved(true);
      setError("");
    } else setError("Roster nije sačuvan.");
  }
  function reset() {
    if (!window.confirm("Resetovati ceo roster?")) return;
    if (clearRoster()) {
      setRoster([]);
      setIsSaved(true);
    } else setError("Roster nije moguće obrisati.");
  }
  function showStats(mode) {
    setStatsMode(mode);
    setStatsOpen(true);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-amber-900/50 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <Swords className="h-8 w-8 text-red-500" />
            <div>
              <h1 className="text-xl font-black tracking-wider">UNMATCHED</h1>
              <p className="text-xs text-zinc-400">Draft Assistant</p>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-start gap-4">
            <nav aria-label="Navigation" className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  className="hover:cursor-pointer"
                  variant={screen === "roster" ? "default" : "outline"}
                  onClick={() => {
                    setScreen("roster");
                    setSearch("");
                  }}
                >
                  Roster
                </Button>
                <Button
                  className="hover:cursor-pointer"
                  variant={screen === "simulator" ? "default" : "outline"}
                  disabled={validRoster.length < 12}
                  onClick={() => {
                    setScreen("simulator");
                    setSearch("");
                  }}
                >
                  Draft Simulator
                </Button>
                <Button
                  className="hover:cursor-pointer"
                  variant={screen === "maps" ? "default" : "outline"}
                  onClick={() => {
                    setScreen("maps");
                    setSearch("");
                  }}
                >
                  Random Map Generator
                </Button>
              </div>
            </nav>
            <section aria-label="Statistics" className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  className="cursor-pointer"
                  variant="outline"
                  onClick={() => showStats("overall")}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Overall Statistics
                </Button>
                <Button
                  className="hover:cursor-pointer"
                  variant="outline"
                  onClick={() => setMatchupsOpen(true)}
                >
                  Matchup Explorer
                </Button>
              </div>
            </section>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <section className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">
              {screen === "maps"
                ? "Random Map Generator"
                : screen === "roster"
                  ? "Heroes database"
                  : "Draft Simulator"}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              {screen === "maps"
                ? "Generate random maps for every table. Maps may repeat between tables."
                : screen === "roster"
                  ? "Choose heroes and save your roster"
                  : "Choose 4, 5 or 6 heroes per player, with pre-bans inside the simulator."}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">{heroes.length} heroes</Badge>
            <Badge variant="outline">{matchups.length} matchups</Badge>
          </div>
        </section>
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-900 bg-red-950/50 p-4 text-sm text-red-300"
          >
            {error}
          </div>
        )}
        {/* Keep generated tables mounted while switching between screens. */}
        <div hidden={screen !== "maps"}>
          <RandomMapGenerator />
        </div>
        {screen === "maps" ? null : screen === "simulator" ? (
          <DraftFlow
            onBannedChange={setDraftBans}
            heroes={heroes}
            available={validRoster}
            index={index}
            overall={overall}
          />
        ) : isLoading && !heroes.length ? (
          <div className="p-10 text-center text-zinc-400">
            Loading CSV data...
          </div>
        ) : (
          <>
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold">
                  Available heroes
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    className="cursor-pointer"
                    variant="outline"
                    onClick={selectAllHeroes}
                    disabled={heroes.length === 0 || validRoster.length === heroes.length}
                  >
                    <CheckCheck className="mr-2 h-4 w-4" />
                    Select All
                  </Button>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search heroes..."
                    className="border-zinc-700 bg-zinc-900 pl-9"
                  />
                  </div>
                </div>
              </div>
              {filtered.length ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12">
                  {filtered.map((hero) => (
                    <HeroCard
                      key={hero.slug}
                      hero={hero}
                      mode="roster"
                      isSelected={roster.includes(hero.slug)}
                      onToggle={toggleHero}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-zinc-800 p-8 text-center text-zinc-400">
                  No heroes to show.
                </div>
              )}
            </section>
            <Separator className="bg-zinc-800" />
              <RosterPanel
                heroes={selected}
                onRemove={toggleHero}
                onSave={save}
                onReset={reset}
                isSaved={isSaved}
                onStatistics={() => showStats("roster")}
              />
          </>
        )}
      </main>
      <MatchupExplorer
        available={validRoster}
        banned={draftBans}
        open={matchupsOpen}
        onOpenChange={setMatchupsOpen}
        heroes={heroes}
        index={index}
      />
      <StatisticsDialog
        key={`${statsMode}-${statsOpen}`}
        open={statsOpen}
        onOpenChange={setStatsOpen}
        initialMode={statsMode}
        heroes={heroes}
        rosterStats={rosterStats}
        
        overallStats={overall}
      />
    </div>
  );
}
