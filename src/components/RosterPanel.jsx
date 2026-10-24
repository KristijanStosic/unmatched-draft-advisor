
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Save, Trash2, BarChart3 } from "lucide-react";

export default function RosterPanel({
  heroes,
  onRemove,
  onSave,
  onReset,
  isSaved,
  onStatistics,
}) {
  return (
    <Card className="border-amber-900/40 bg-zinc-900 text-zinc-100">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Curated Roster</h2>
            <p className="text-sm text-zinc-400">
              Heroes you can use for draft
            </p>
          </div>

          <Badge variant="secondary">
            {heroes.length} {heroes.length === 1 ? "hero" : "heroes"}
          </Badge>
        </div>

        {heroes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-400">
            Roster is empty. Add heroes to the list
          </div>
        ) : (
          <div className="space-y-2">
            {heroes.map((hero) => (
              <div
                key={hero.slug}
                className="flex items-center gap-3 rounded-lg border border-zinc-800 p-2 hover:cursor-pointer"
              >
                <img
                  src={hero.image}
                  alt=""
                  className="h-14 w-10 rounded object-cover"
                  onError={(event) => {
                    event.currentTarget.style.visibility = "hidden";
                  }}
                />

                <span className="min-w-0 flex-1 truncate font-medium">
                  {hero.name}
                </span>

                <Button
                  className="hover:cursor-pointer hover:text-red-400 hover:scale-3d"
                  variant="ghost"
                  size="icon"
                  aria-label={`Ukloni ${hero.name} iz rostera`}
                  onClick={() => onRemove(hero.slug)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button className="cursor-pointer" variant="outline" onClick={onStatistics}><BarChart3 className="mr-2 h-4 w-4" />Statistics</Button>
          <Button className="hover:cursor-pointer" onClick={onSave}>
            <Save className="mr-2 h-4 w-4" />
            Save roster
          </Button>

          <Button className="hover:cursor-pointer" variant="outline" onClick={onReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset roster
          </Button>
        </div>

        <p className="text-xs text-zinc-500">
          {isSaved
            ? "Roster saved"
            : "There are changes that are not yet saved"}
        </p>
      </CardContent>
    </Card>
  );
}
