"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Loader2, Paperclip } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { jobOpenings } from "@/content/careers";

import { submitJobApplication } from "../actions";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export function JobApplicationForm({ defaultPosition }: { defaultPosition?: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState(defaultPosition ?? jobOpenings[0]?.title ?? "");
  const [coverNote, setCoverNote] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      let resumeS3Key: string | undefined;
      let resumeUrl: string | undefined;

      if (resumeFile) {
        const formData = new FormData();
        formData.append("file", resumeFile);
        const uploadRes = await fetch("/api/uploads/resume", { method: "POST", body: formData });
        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) {
          throw new Error(
            typeof uploadData.error === "string" ? uploadData.error : "Resume upload failed.",
          );
        }
        resumeS3Key = uploadData.key;
        resumeUrl = uploadData.viewUrl;
      }

      const result = await submitJobApplication({
        fullName,
        email,
        phone,
        position,
        coverNote: coverNote || undefined,
        resumeS3Key,
        resumeUrl,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push(`/careers/apply/success?id=${result.applicationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-5">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="position">Position</Label>
        <select
          id="position"
          required
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm"
        >
          {jobOpenings.map((job) => (
            <option key={job.title} value={job.title}>
              {job.title}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="coverNote">Cover note (optional)</Label>
        <Textarea
          id="coverNote"
          rows={4}
          value={coverNote}
          onChange={(e) => setCoverNote(e.target.value)}
          placeholder="Tell us about your experience and why you'd be a great fit."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="resume">Resume (PDF, optional)</Label>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
            <Paperclip className="h-4 w-4" />
            {resumeFile ? resumeFile.name : "Attach resume"}
          </Button>
          {resumeFile && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setResumeFile(null)}>
              Remove
            </Button>
          )}
        </div>
        <input
          ref={fileRef}
          id="resume"
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > MAX_RESUME_BYTES) {
              setError("Resume must be under 5 MB.");
              return;
            }
            setResumeFile(file);
            setError(null);
          }}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting…
          </>
        ) : (
          "Submit application"
        )}
      </Button>
    </form>
  );
}
