import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import HeroCard from "@/components/HeroCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { drawHeroIndex, loadHeroTiers, remainingHeroes, saveHeroTiers, wheelRotation } from "@/lib/randomHeroes";
import "./RandomHeroGenerator.css";

const WHEEL_MS = 5800;
const SAVE_DELAY_MS = 180;
const EMPTY_POOL = [];
const TierHeroCard = memo(HeroCard);
const ROULETTE_DELAYS = [50, 55, 60, 65, 70, 80, 90, 105, 125, 150, 180, 220, 270, 340, 420]
  .map((ms) => ms * 1.5);

const HeroWheel = memo(function HeroWheel({ pool, draw, onFinish }) {
  const step = 360 / pool.length;
  const gradient = pool.map((_, index) =>
    `hsl(${(index * 137.508) % 360} 65% ${index % 2 ? 28 : 37}%) ${index * step}deg ${(index + 1) * step}deg`,
  ).join(", ");

  return (
    <div className="hero-wheel" aria-hidden="true">
      <div className="hero-wheel-pointer" />
      <div
        key={draw?.id}
        className={draw?.animate ? "hero-wheel-disc hero-wheel-spinning" : "hero-wheel-disc"}
        onAnimationEnd={draw?.active ? onFinish : undefined}
        style={{
          background: `conic-gradient(${gradient})`,
          "--spin-angle": `${draw?.rotation ?? 0}deg`,
          "--spin-time": `${WHEEL_MS}ms`,
          "--label-size": `clamp(4px, ${Math.min(3, 100 / pool.length)}cqw, 14px)`,
        }}
      >
        {pool.map((hero, index) => (
          <div key={hero.slug} className="hero-wheel-spoke" style={{ rotate: `${(index + 0.5) * step}deg` }}>
            <span>{hero.name}</span>
          </div>
        ))}
        <div className="hero-wheel-hub" />
      </div>
    </div>
  );
});

function HeroPortrait({ hero, className = "" }) {
  return (
    <figure className={`text-center ${className}`}>
      {hero.image && <img src={hero.image} alt="" className="mx-auto h-64 w-full rounded-xl object-contain sm:h-80" />}
      <figcaption className="mt-3 text-xl font-bold text-amber-100">{hero.name}</figcaption>
    </figure>
  );
}

export default function RandomHeroGenerator({ heroes, isLoading }) {
  const [tiers, setTiers] = useState(loadHeroTiers);
  const [selectedId, setSelectedId] = useState("");
  const [newName, setNewName] = useState("");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("wheel");
  const [draw, setDraw] = useState(null);
  const [preview, setPreview] = useState(null);
  const [storageError, setStorageError] = useState(false);
  const timer = useRef(null);
  const drawing = useRef(false);
  const latestTiers = useRef(tiers);
  const saveTimer = useRef(null);

  const flushSave = useCallback(() => {
    if (saveTimer.current === null) return true;
    clearTimeout(saveTimer.current);
    saveTimer.current = null;
    return saveHeroTiers(latestTiers.current);
  }, []);

  useEffect(() => {
    window.addEventListener("pagehide", flushSave);
    return () => {
      window.removeEventListener("pagehide", flushSave);
      clearTimeout(timer.current);
      flushSave();
    };
  }, [flushSave]);

  const tier = tiers.find(({ id }) => id === selectedId) ?? tiers[0];
  const tierId = tier?.id;
  const pool = useMemo(() => tier ? remainingHeroes(tier, heroes) : EMPTY_POOL, [tier, heroes]);
  const deferredPool = useDeferredValue(pool);
  const members = useMemo(() => new Set(tier?.members), [tier?.members]);
  const bySlug = useMemo(() => new Map(heroes.map((hero) => [hero.slug, hero])), [heroes]);
  const history = draw?.active ? tier.history.slice(0, -1) : tier?.history ?? [];
  const winner = bySlug.get(history.at(-1));
  const wheelPool = draw?.pool ?? deferredPool;
  const busy = Boolean(draw?.active);
  const catalog = useMemo(() => {
    const query = search.trim().toLowerCase();
    return heroes.filter((hero) => hero.name.toLowerCase().includes(query));
  }, [heroes, search]);

  const updateTiers = useCallback((next, deferSave = false) => {
    latestTiers.current = next;
    setTiers(next);
    clearTimeout(saveTimer.current);
    if (deferSave) {
      saveTimer.current = setTimeout(() => setStorageError(!flushSave()), SAVE_DELAY_MS);
    } else {
      saveTimer.current = null;
      setStorageError(!saveHeroTiers(next));
    }
  }, [flushSave]);

  function editTier(changes) {
    updateTiers(latestTiers.current.map((item) => item.id === tierId ? { ...item, ...changes } : item));
  }

  function addTier(event) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const id = crypto.randomUUID();
    updateTiers([...latestTiers.current, { id, name, members: [], history: [] }]);
    setSelectedId(id);
    setNewName("");
    setDraw(null);
  }

  const toggleHero = useCallback((slug) => {
    if (drawing.current) return;
    setDraw(null);
    updateTiers(latestTiers.current.map((item) => {
      if (item.id !== tierId) return item;
      const members = item.members.includes(slug)
        ? item.members.filter((member) => member !== slug)
        : [...item.members, slug];
      return { ...item, members };
    }), true);
  }, [tierId, updateTiers]);

  const finishDraw = useCallback(() => {
    drawing.current = false;
    setDraw((current) => current?.active ? { ...current, active: false } : current);
    setPreview(null);
  }, []);

  function startDraw() {
    if (drawing.current || !pool.length) return;
    const winnerIndex = drawHeroIndex(pool.length);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    editTier({ history: [...tier.history, pool[winnerIndex].slug] });

    drawing.current = !reducedMotion;
    if (mode === "wheel") {
      setDraw({
        id: crypto.randomUUID(),
        pool,
        rotation: wheelRotation(pool.length, winnerIndex),
        animate: !reducedMotion,
        active: !reducedMotion,
      });
      return;
    }

    setDraw(reducedMotion ? null : { active: true });
    if (reducedMotion) return;

    let frame = 0;
    let index = pool.length > 1 ? (winnerIndex + 1) % pool.length : winnerIndex;
    function tick() {
      if (frame === ROULETTE_DELAYS.length) {
        finishDraw();
        return;
      }
      setPreview(pool[index]);
      index = (index + 1) % pool.length;
      timer.current = setTimeout(tick, ROULETTE_DELAYS[frame]);
      frame += 1;
    }
    tick();
  }

  return (
    <div className="space-y-5">
      {storageError && <p role="alert" className="text-red-300">Could not save hero tiers in this browser.</p>}
      <fieldset disabled={busy} className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <form onSubmit={addTier} className="flex items-end gap-2">
          <label className="grid gap-1.5 text-sm text-zinc-300">
            New tier name
            <Input value={newName} onChange={(event) => setNewName(event.target.value)} />
          </label>
          <Button type="submit" disabled={busy || !newName.trim()}>Add Tier</Button>
        </form>
        {tier && (
          <>
            <label className="grid max-w-full gap-1.5 text-sm text-zinc-300">
              Active tier
              <select className="max-w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5" value={tier.id} onChange={(event) => {
                setSelectedId(event.target.value);
                setDraw(null);
              }}>
                {tiers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <Button variant="default" onClick={() => {
              const name = window.prompt("Tier name", tier.name)?.trim();
              if (name) editTier({ name });
            }}>Rename Tier</Button>
            <Button variant="default" onClick={() => {
              if (!window.confirm(`Delete “${tier.name}” and its draw history?`)) return;
              updateTiers(tiers.filter(({ id }) => id !== tier.id));
              setDraw(null);
            }}>Delete Tier</Button>
          </>
        )}
      </fieldset>

      {tier && (
        <>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <section aria-label="Hero draw" className="flex flex-col gap-5 rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6">
              <div className="order-first flex flex-wrap items-center justify-between gap-3">
                <div role="group" aria-label="Generator mode" className="flex flex-wrap gap-2">
                  {[["wheel", "Spin the Wheel"], ["roulette", "Hero Roulette"]].map(([value, label]) => (
                    <Button className="hover:cursor-pointer" key={value} disabled={busy} aria-pressed={mode === value}
                      variant={mode === value ? "outline" : "default"} onClick={() => {
                        setMode(value);
                        setDraw(null);
                      }}>
                      {label}
                    </Button>
                  ))}
                </div>
                <p className="text-sm text-zinc-300">{busy ? pool.length + 1 : pool.length} / {members.size} remaining</p>
              </div>

              <div className="order-1 grid items-center gap-5 sm:order-none sm:grid-cols-2">
                {mode === "wheel" && wheelPool.length > 0 && <HeroWheel pool={wheelPool} draw={draw} onFinish={finishDraw} />}
                {busy && mode === "roulette" && preview && <HeroPortrait hero={preview} className="sm:col-span-2" />}
                {winner && !busy && (
                  <div aria-live="polite" className={mode === "roulette" || !wheelPool.length ? "sm:col-span-2" : ""}>
                    <HeroPortrait key={winner.slug} hero={winner} />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  className="h-11 flex-1 cursor-pointer bg-amber-500 text-zinc-950 hover:bg-amber-400 sm:h-8 sm:flex-none"
                  disabled={busy || !pool.length}
                  onClick={startDraw}
                >
                  {busy ? "Drawing…" : mode === "wheel" ? "Spin Wheel" : "Draw Hero"}
                </Button>

                <Button
                  className="h-11 cursor-pointer bg-red-800 text-white hover:bg-red-600 sm:h-8"
                  disabled={busy || !tier.history.length}
                  onClick={() => {
                    setDraw(null);
                    editTier({ history: [] });
                  }}
                >
                  Reset Draw
                </Button>
              </div>
              {!busy && !pool.length && (
                <p className="order-2 text-sm text-zinc-400">
                  {isLoading ? "Loading heroes…" : !heroes.length ? "The hero catalog is unavailable." :
                    !members.size ? "Add heroes below to start drawing." :
                      "No eligible heroes remain. Reset the draw or add heroes to this tier."}
                </p>
              )}
            </section>
            <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6">
              <h3 className="font-semibold">Draw History</h3>
              {history.length ? (
                <ol className="mt-3 max-h-80 list-decimal space-y-1 overflow-auto pl-6 text-sm text-zinc-200">
                  {history.map((slug) => <li key={slug}>{bySlug.get(slug)?.name ?? slug}</li>)}
                </ol>
              ) : <p className="mt-3 text-sm text-zinc-400">No heroes drawn yet.</p>}
            </section>
          </div>
          <fieldset disabled={busy} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold">Tier Heroes ({members.size})</h3>
              <Input aria-label="Find a hero" placeholder="Find a hero…" value={search}
                onChange={(event) => setSearch(event.target.value)} className="max-w-60" />
            </div>
            <div className="hero-tier-catalog grid max-h-96 grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2 overflow-auto p-1">
              {catalog.map((hero) => (
                <TierHeroCard key={hero.slug} hero={hero} isSelected={members.has(hero.slug)} onToggle={toggleHero} />
              ))}
            </div>
            {!catalog.length && !isLoading && <p className="text-sm text-zinc-400">No heroes found.</p>}
          </fieldset>
        </>
      )}
    </div>
  );
}
