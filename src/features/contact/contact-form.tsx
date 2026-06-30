"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { contactSchema, type ContactInput } from "@/features/contact/schema";
import { submitContactForm } from "@/features/contact/actions";

export function ContactForm() {
  const [serverMessage, setServerMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
  });

  async function onSubmit(values: ContactInput) {
    const result = await submitContactForm(values);
    setServerMessage({ ok: result.success, text: result.message });
    if (result.success) reset();
  }

  if (serverMessage?.ok) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-10 text-center shadow-card">
        <CheckCircle2 className="h-10 w-10 text-brand-green" />
        <h3 className="mt-4 text-lg font-semibold text-brand-navy">Message sent</h3>
        <p className="mt-1 text-sm text-muted-foreground">{serverMessage.text}</p>
        <Button className="mt-6" variant="outline" onClick={() => setServerMessage(null)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8"
      noValidate
    >
      <div className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" placeholder="Jane Doe" {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="jane@email.com" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" {...register("phone")} />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="message">How can we help?</Label>
          <Textarea id="message" placeholder="Tell us about your space and what you need..." {...register("message")} />
          {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
        </div>

        {serverMessage && !serverMessage.ok ? (
          <p className="text-sm text-destructive">{serverMessage.text}</p>
        ) : null}

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Sending...
            </>
          ) : (
            "Send message"
          )}
        </Button>
      </div>
    </form>
  );
}
