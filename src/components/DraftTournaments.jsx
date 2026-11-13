import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DRAFT_FORMATS } from "@/lib/draftFormats";

const KEY = "unmatched-draft-tournaments-v1";

function loadTournaments() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(saved) ? saved.filter((item) =>
      typeof item?.id === "string" && typeof item.name === "string" &&
      DRAFT_FORMATS.some(({ id }) => id === item.format),
    ) : [];
  } catch {
    return [];
  }
}

export default function DraftTournaments({ format, tournament, onApply }) {
  const [tournaments, setTournaments] = useState(loadTournaments);
  const [selectedId, setSelectedId] = useState(tournaments[0]?.id ?? "");
  const [name, setName] = useState("");
  const [newFormat, setNewFormat] = useState(4);
  const [storageError, setStorageError] = useState(false);
  const selected = tournaments.find(({ id }) => id === selectedId);

  function save(next) {
    setTournaments(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }

  function addTournament(event) {
    event.preventDefault();
    if (!name.trim()) return;
    const item = { id: crypto.randomUUID(), name: name.trim(), format: newFormat };
    save([...tournaments, item]);
    setSelectedId(item.id);
    setName("");
  }

  return (
    <section aria-label="Tournaments" className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="font-semibold">Tournaments</h3>
      <form onSubmit={addTournament} className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-sm">
          Tournament name
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          New tournament format
          <FormatSelect value={newFormat} onChange={setNewFormat} />
        </label>
        <Button type="submit" disabled={!name.trim()}>Add Tournament</Button>
      </form>
      {selected && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid min-w-0 gap-1 text-sm">
            Saved tournament
            <select className="max-w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1"
              value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              {tournaments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Tournament format
            <FormatSelect value={selected.format} onChange={(nextFormat) =>
              save(tournaments.map((item) => item.id === selectedId ? { ...item, format: nextFormat } : item))
            } />
          </label>
          <Button onClick={() => onApply(selected.format, selected)}
            disabled={format === selected.format && tournament?.id === selected.id}>Apply</Button>
        </div>
      )}
      {storageError && <p role="alert" className="text-sm text-red-300">Could not save tournaments in this browser.</p>}
    </section>
  );
}

function FormatSelect({ value, onChange }) {
  return (
    <select className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1"
      value={value} onChange={(event) => onChange(DRAFT_FORMATS.find(({ id }) => String(id) === event.target.value).id)}>
      {DRAFT_FORMATS.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
    </select>
  );
}
