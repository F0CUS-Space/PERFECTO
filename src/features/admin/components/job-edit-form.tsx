"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateJobPosting } from "@/features/admin/actions";
import type { AdminJobPostingDetail } from "@/features/admin/types";
import { EMPLOYMENT_TYPES, JOB_LOCATIONS, isEmploymentType, isJobLocation } from "@/features/recruitment/job-options";

const selectClassName =
  "flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm";

export function JobEditForm({ job }: { job: AdminJobPostingDetail }) {
  const router = useRouter();
  const [title, setTitle] = useState(job.title);
  const [type, setType] = useState(job.type);
  const [location, setLocation] = useState(job.location);
  const [compensation, setCompensation] = useState(job.compensation);
  const [summary, setSummary] = useState(job.summary);
  const [isActive, setIsActive] = useState(job.isActive);
  const [sortOrder, setSortOrder] = useState(String(job.sortOrder));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSave = () => {
    if (!isEmploymentType(type) || !isJobLocation(location)) {
      setError("Select a valid employment type and location.");
      return;
    }

    if (!compensation.trim()) {
      setError("Enter compensation.");
      return;
    }

    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await updateJobPosting(job.id, {
        title,
        type,
        location,
        compensation,
        summary,
        isActive,
        sortOrder: Number(sortOrder),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSuccess(true);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-brand-navy">{job.slug}</p>
          <p className="text-xs text-muted-foreground">
            {job.applicationCount} application{job.applicationCount === 1 ? "" : "s"}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Active
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`job-title-${job.id}`}>Job title</Label>
          <Input
            id={`job-title-${job.id}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`job-type-${job.id}`}>Employment type</Label>
          <select
            id={`job-type-${job.id}`}
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={selectClassName}
          >
            {!isEmploymentType(type) && (
              <option value={type}>{type} (update required)</option>
            )}
            {EMPLOYMENT_TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`job-location-${job.id}`}>Location</Label>
          <select
            id={`job-location-${job.id}`}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={selectClassName}
          >
            {!isJobLocation(location) && (
              <option value={location}>{location} (update required)</option>
            )}
            {JOB_LOCATIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`job-compensation-${job.id}`}>Compensation</Label>
          <Input
            id={`job-compensation-${job.id}`}
            required
            value={compensation}
            onChange={(e) => setCompensation(e.target.value)}
            placeholder="Up to $30/hour"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`job-summary-${job.id}`}>Summary</Label>
          <Textarea
            id={`job-summary-${job.id}`}
            rows={4}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`job-sort-${job.id}`}>Sort order</Label>
          <Input
            id={`job-sort-${job.id}`}
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={onSave} disabled={pending}>
          {pending ? "Saving…" : "Save job"}
        </Button>
        {success && <p className="text-sm text-brand-green">Saved.</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
