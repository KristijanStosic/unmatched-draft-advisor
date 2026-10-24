import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export default function CsvUploader({
  onFileLoaded,
  isLoading,
  label = "Load CSV",
}) {
  const input = useRef(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            await onFileLoaded(await file.text(), file.name);
          } finally {
            e.target.value = "";
          }
        }}
      />
      <Button
        variant="outline"
        size="xs"
        disabled={isLoading}
        onClick={() => input.current?.click()}
        className="cursor-pointer"
      >
        <Upload className="h-3 w-3" />
        {label}
      </Button>
    </>
  );
}
