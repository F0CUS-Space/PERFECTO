"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function StringListEditor({
  id,
  label,
  hint,
  value,
  onChange,
  placeholder,
  multiline = false,
  maxItems = 25,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  multiline?: boolean;
  maxItems?: number;
}) {
  const rows = value.length > 0 ? value : [""];

  const updateRow = (index: number, text: string) => {
    const next = [...rows];
    next[index] = text;
    onChange(next);
  };

  const addRow = () => {
    if (rows.length >= maxItems) return;
    onChange([...rows, ""]);
  };

  const removeRow = (index: number) => {
    const next = rows.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [""]);
  };

  const Field = multiline ? Textarea : Input;
  const fieldProps = multiline ? { rows: 2 } : {};

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <ul className="space-y-2">
        {rows.map((item, index) => (
          <li key={`${id}-${index}`} className="flex gap-2">
            <Field
              id={index === 0 ? id : `${id}-${index}`}
              value={item}
              onChange={(e) => updateRow(index, e.target.value)}
              placeholder={placeholder}
              className="min-w-0 flex-1"
              {...fieldProps}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => removeRow(index)}
              disabled={rows.length === 1 && !item.trim()}
              aria-label="Remove item"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRow}
        disabled={rows.length >= maxItems}
        className="gap-1.5"
      >
        <Plus className="h-4 w-4" />
        Add another
      </Button>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Drop blank rows before saving to the server. */
export function cleanStringList(items: string[]): string[] {
  return items.map((item) => item.trim()).filter(Boolean);
}
