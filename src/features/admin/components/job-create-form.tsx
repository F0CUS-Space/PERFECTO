"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createJobPosting } from "@/features/admin/actions";
import { slugifyServiceName } from "@/features/admin/service-slug";

export function JobCreateForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState("Full-time");
  const [location, setLocation] = useState("Local");
  const [summary, setSummary] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onTitleChange = (value: string) => {
    setTitle(value);
    if (!slug || slug === slugifyServiceName(title)) {
      setSlug(slugifyServiceName(value));
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createJobPosting({
        title,
        slug: slug || undefined,
        type,
        location,
        summary,
        isActive,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push(result.serviceId ? `/admin/jobs/${result.serviceId}` : "/admin/jobs");
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto max-w-xl space-y-4 rounded-2xl border border-border bg-card p-5"
    >
      <div className="space-y-2">
        <Label htmlFor="new-job-title">Job title</Label>
        <Input
          id="new-job-title"
          required
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-job-slug">URL slug</Label>
        <Input
          id="new-job-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="residential-cleaning-professional"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="new-job-type">Employment type</Label>
          <Input
            id="new-job-type"
            required
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="Full-time / Part-time"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-job-location">Location</Label>
          <Input
            id="new-job-location"
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-job-summary">Summary</Label>
        <Textarea
          id="new-job-summary"
          required
          rows={4}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        Active on careers page
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create job"}
      </Button>
    </form>
  );
}
