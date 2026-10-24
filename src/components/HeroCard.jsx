import { useState } from "react";
import { Check, Ban } from "lucide-react";

export default function HeroCard({
  hero,
  isSelected,
  onToggle,
  mode = "roster",
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const banned = mode === "ban";
  return (
    <button
      type="button"
      onClick={() => onToggle(hero.slug)}
      aria-label={`${banned ? "Ban" : "Select"} ${hero.name}`}
      aria-pressed={isSelected}
      className={`group relative block w-full overflow-hidden rounded-lg border-2 bg-zinc-900 transition-all duration-200 ${isSelected ? (banned ? "border-red-500 ring-2 ring-red-500/30" : "border-amber-400 ring-2 ring-amber-400/30") : "border-zinc-800 hover:border-amber-500/70"}`}
    >
      <div className="relative aspect-3/4 w-full overflow-hidden cursor-pointer">
        {!imageFailed ? (
          <img
            src={hero.image}
            alt={hero.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className={`absolute inset-0 block h-full w-full object-cover object-center ${isSelected && banned ? "grayscale opacity-35" : ""}`}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 p-2 text-xs text-zinc-400">
            {hero.name}
          </div>
        )}
        {isSelected && (
          <div
            className={`absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full text-white shadow-lg ${banned ? "bg-red-600" : "bg-emerald-500"}`}
          >
            {banned ? (
              <Ban className="h-4 w-4" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </div>
        )}
        {isSelected && banned && (
          <div className="absolute inset-x-0 bottom-3 bg-red-700/90 py-1 text-center text-xs font-black tracking-widest">
            BANNED
          </div>
        )}
      </div>
      <div className="truncate px-1.5 py-1.5 text-center text-xs text-zinc-100 sm:text-sm">
        {hero.name}
      </div>
    </button>
  );
}
