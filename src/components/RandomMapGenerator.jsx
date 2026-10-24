import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import "./RandomMapGenerator.css";
import maps from "@/data/maps.json";
import {
  generateTables,
  sampleMaps,
  validateMapSettings,
} from "@/lib/randomMaps";

export default function RandomMapGenerator() {
  const [tableCount, setTableCount] = useState("4");
  const [mapsPerTable, setMapsPerTable] = useState("1");
  const [tables, setTables] = useState([]);
  const error = validateMapSettings(
    Number(tableCount),
    Number(mapsPerTable),
    maps.length,
  );
  const stale =
    tables.length > 0 &&
    (tables.length !== Number(tableCount) ||
      tables[0].length !== Number(mapsPerTable));

  return (
    <section className="space-y-6">
      <form
        className="map-generator-controls rounded-xl border border-zinc-800 bg-zinc-900 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!error)
            setTables(
              generateTables(maps, Number(tableCount), Number(mapsPerTable)),
            );
        }}
      >
        <label className="map-generator-field text-sm">
          Number of tables
          <Input
            className="h-10 w-full border-zinc-700 bg-zinc-950 px-3"
            type="number"
            min="1"
            max="100"
            step="1"
            required
            value={tableCount}
            onChange={(e) => setTableCount(e.target.value)}
            aria-describedby="map-settings-status"
          />
        </label>
        <label className="map-generator-field text-sm">
          Maps per table
          <Input
            className="h-10 w-full border-zinc-700 bg-zinc-950 px-3"
            type="number"
            min="1"
            max={maps.length}
            step="1"
            required
            value={mapsPerTable}
            onChange={(e) => setMapsPerTable(e.target.value)}
            aria-describedby="map-settings-status"
          />
        </label>
        <Button type="submit" variant="default" size="lg" className="h-10 cursor-pointer border border-amber-400 bg-amber-400 px-6 font-semibold text-zinc-950 shadow-sm hover:bg-amber-300 focus-visible:ring-amber-400 disabled:opacity-50" disabled={!!error}>
          Generate
        </Button>
        <p className="map-generator-hint text-sm text-zinc-400">
          {maps.length} maps available · No duplicates within a table
        </p>
      </form>
      <div id="map-settings-status">
        {error && (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        )}
        {stale && (
          <p className="text-sm text-amber-300">
            Settings changed. Use Generate to apply them to every table.
          </p>
        )}
      </div>
      <div aria-live="polite" className="map-generator-tables">
        {!tables.length && (
          <p className="map-generator-empty rounded-xl border border-dashed border-zinc-800 p-8 text-center text-zinc-400">
            Choose your settings and press Generate.
          </p>
        )}
        {tables.map((table, index) => (
          <article
            key={index}
            className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold">Table {index + 1}</h3>
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                aria-label={`Reroll Table ${index + 1}`}
                onClick={() =>
                  setTables((old) =>
                    old.map((row, i) =>
                      i === index ? sampleMaps(maps, row.length) : row,
                    ),
                  )
                }
              >
                Reroll
              </Button>
            </div>
            <div className="map-generator-maps">
              {table.map((map) => (
                <figure
                  key={map.id}
                  className="m-0 min-w-0 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950"
                >
                  <div className="map-generator-image">
                  <img
                    src={`${import.meta.env.BASE_URL}data/maps/${map.file}`}
                    alt={map.name}
                    loading="lazy"
                    className="h-full w-full object-contain rounded-md"
                    onError={(event) => { event.currentTarget.parentElement.hidden = true; }}
                  />
                  </div>
                  <figcaption className="map-generator-caption border-t border-zinc-800 p-3 text-center text-sm font-semibold">
                    {map.name}
                  </figcaption>
                </figure>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
