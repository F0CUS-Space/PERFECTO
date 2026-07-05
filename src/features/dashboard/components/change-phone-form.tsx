"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { Loader2, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatFirebaseAuthError,
  isAuthDevMode,
  isFirebaseTestPhone,
} from "@/features/auth/firebase-test-phones";
import { getFirebaseAuth } from "@/lib/firebase/client";

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw.trim().startsWith("+") ? raw.trim() : `+${digits}`;
}

interface ChangePhoneFormProps {
  currentPhone: string;
}

export function ChangePhoneForm({ currentPhone }: ChangePhoneFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [newPhone, setNewPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);

  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  const cleanupRecaptcha = useCallback(() => {
    recaptchaRef.current?.clear();
    recaptchaRef.current = null;
  }, []);

  useEffect(() => () => cleanupRecaptcha(), [cleanupRecaptcha]);

  const ensureRecaptcha = useCallback(async () => {
    if (recaptchaRef.current) return recaptchaRef.current;
    const auth = getFirebaseAuth();
    if (!recaptchaContainerRef.current) {
      throw new Error("reCAPTCHA container not ready.");
    }
    recaptchaRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
      size: "invisible",
    });
    await recaptchaRef.current.render();
    return recaptchaRef.current;
  }, []);

  const sendOtp = async () => {
    setError(null);
    setLoading(true);

    try {
      const normalized = normalizePhone(newPhone);
      if (normalized === currentPhone) {
        throw new Error("New number must be different from your current phone.");
      }

      if (isAuthDevMode() && !isFirebaseTestPhone(normalized)) {
        throw new Error("Development mode: use a configured test phone number.");
      }

      const auth = getFirebaseAuth();
      const appVerifier = await ensureRecaptcha();
      const result = await signInWithPhoneNumber(auth, normalized, appVerifier);
      setConfirmation(result);
      setStep("otp");
    } catch (err) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const verifyAndUpdate = async () => {
    if (!confirmation) return;
    setError(null);
    setLoading(true);

    try {
      const credential = await confirmation.confirm(otp);
      const idToken = await credential.user.getIdToken();

      const res = await fetch("/api/auth/change-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Could not update phone number.");
      }

      setSuccess(true);
      setExpanded(false);
      window.location.reload();
    } catch (err) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return <p className="text-sm text-brand-green">Phone number updated successfully.</p>;
  }

  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-4">
      <div className="flex items-start gap-3">
        <Phone className="mt-0.5 h-4 w-4 text-brand-blue" />
        <div className="flex-1">
          <p className="font-medium text-brand-navy">Phone number</p>
          <p className="mt-1 text-sm text-muted-foreground">{currentPhone}</p>
          {!expanded ? (
            <Button
              type="button"
              variant="link"
              className="mt-2 h-auto p-0 text-brand-blue"
              onClick={() => setExpanded(true)}
            >
              Change phone number
            </Button>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Verify your new number with a one-time code. Your account stays signed in.
              </p>

              {step === "phone" ? (
                <div className="space-y-2">
                  <Label htmlFor="new-phone">New phone number</Label>
                  <Input
                    id="new-phone"
                    type="tel"
                    placeholder="+1 202 555 1234"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                  />
                  <Button type="button" onClick={sendOtp} disabled={loading || !newPhone.trim()}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending code…
                      </>
                    ) : (
                      "Send verification code"
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="phone-otp">Verification code</Label>
                  <Input
                    id="phone-otp"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={verifyAndUpdate} disabled={loading || otp.length !== 6}>
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Verifying…
                        </>
                      ) : (
                        "Verify and update"
                      )}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setStep("phone")}>
                      Back
                    </Button>
                  </div>
                </div>
              )}

              <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <div ref={recaptchaContainerRef} />
    </div>
  );
}
