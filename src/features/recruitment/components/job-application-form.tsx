"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Paperclip } from "lucide-react";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { submitJobApplication } from "../actions";
import { createJobApplicationSchema } from "../schema";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

type FormValues = Omit<
  z.infer<ReturnType<typeof createJobApplicationSchema>>,
  "resumeS3Key" | "resumeUrl"
>;

export function JobApplicationForm({
  defaultPosition,
  positions,
  uploadsEnabled,
}: {
  defaultPosition: string;
  positions: string[];
  uploadsEnabled: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const s3Ready = uploadsEnabled;
  const schema = useMemo(() => createJobApplicationSchema(positions), [positions]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema.omit({ resumeS3Key: true, resumeUrl: true })),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      position: positions.includes(defaultPosition) ? defaultPosition : (positions[0] ?? ""),
      coverNote: "",
      companyWebsite: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setResumeError(null);

    if (!resumeFile) {
      setResumeError("Attach your resume (PDF).");
      return;
    }

    if (!s3Ready) {
      setServerError("Resume uploads are temporarily unavailable. Please try again later.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("file", resumeFile);
      const uploadRes = await fetch("/api/uploads/resume", { method: "POST", body: formData });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) {
        throw new Error(
          typeof uploadData.error === "string" ? uploadData.error : "Resume upload failed.",
        );
      }

      const result = await submitJobApplication({
        ...values,
        resumeS3Key: uploadData.key,
        resumeUrl: uploadData.viewUrl,
      });

      if (!result.ok) {
        setServerError(result.error);
        return;
      }

      const params = new URLSearchParams();
      if (result.applicationId) {
        params.set("id", result.applicationId);
      }
      params.set("email", result.confirmationEmailSent ? "sent" : "skipped");
      router.push(`/careers/apply/success?${params.toString()}`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-xl space-y-5" noValidate>
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden
        {...register("companyWebsite")}
      />

      {!s3Ready && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Resume uploads are not configured in this environment. Applications cannot be submitted
          until file storage is available.
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" {...register("fullName")} />
        {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" {...register("phone")} />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="position">Position</Label>
        <select
          id="position"
          autoComplete="off"
          {...register("position")}
          className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm"
        >
          {positions.map((title) => (
            <option key={title} value={title}>
              {title}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Only active job postings from our careers page are listed here.
        </p>
        {errors.position && <p className="text-xs text-destructive">{errors.position.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="coverNote">Cover note (optional)</Label>
        <Textarea
          id="coverNote"
          rows={4}
          placeholder="Tell us about your experience and why you'd be a great fit."
          {...register("coverNote")}
        />
        {errors.coverNote && (
          <p className="text-xs text-destructive">{errors.coverNote.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="resume">Resume (PDF, required)</Label>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={!s3Ready}
            onClick={() => fileRef.current?.click()}
          >
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
              setResumeError("Resume must be under 5 MB.");
              setResumeFile(null);
              return;
            }
            setResumeFile(file);
            setResumeError(null);
          }}
        />
        {resumeError && <p className="text-xs text-destructive">{resumeError}</p>}
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" size="lg" disabled={submitting || !s3Ready} className="w-full sm:w-auto">
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
