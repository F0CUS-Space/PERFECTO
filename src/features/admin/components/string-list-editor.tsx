"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function linesToList(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function listToLines(items: string[]): string {
  return items.join("\n");
}

export function StringListEditor({
  id,
  label,
  hint,
  value,
  onChange,
  rows = 5,
  placeholder,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string[];
  onChange: (items: string[]) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        rows={rows}
        value={listToLines(value)}
        onChange={(e) => onChange(linesToList(e.target.value))}
        placeholder={placeholder}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
