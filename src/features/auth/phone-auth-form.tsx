"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  RecaptchaVerifier,
  signInWithCustomToken,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { AlertTriangle, ArrowLeft, Loader2, Mail, Phone, UserPlus } from "lucide-react";

import { getFirebaseAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProfile } from "@/features/auth/actions";
import {
  ADMIN_TEST_PHONE,
  CUSTOMER_TEST_PHONES,
  FIREBASE_TEST_PHONES,
  formatFirebaseAuthError,
  isAdminTestPhone,
  isAuthDevMode,
  isCustomerTestPhone,
  isFirebaseTestPhone,
} from "@/features/auth/firebase-test-phones";
import type { PublicUser } from "@/features/auth/types";

type LoginStep = "phone" | "otp";
type RegisterStep = "details" | "otp";
type AuthMode = "login" | "register";

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw.trim().startsWith("+") ? raw.trim() : `+${digits}`;
}

const COPY: Record<
  AuthMode,
  { title: string; description: string; alternate: { href: string; label: string } }
> = {
  login: {
    title: "Sign in with your phone",
    description: "Admin: use +10000000000 and OTP 123123 in development.",
    alternate: { href: "/register", label: "New customer? Create an account" },
  },
  register: {
    title: "Create your account",
    description: "Use a customer test number (+10000000001 or +10000000002) in development.",
    alternate: { href: "/login", label: "Already have an account? Sign in" },
  },
};

export function PhoneAuthForm({ mode = "login" }: { mode?: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const copy = COPY[mode];
  const devMode = isAuthDevMode();

  const [loginStep, setLoginStep] = useState<LoginStep>("phone");
  const [registerStep, setRegisterStep] = useState<RegisterStep>("details");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
    return recaptchaRef.current;
  }, []);

  const finishAndRedirect = (user: PublicUser) => {
    if (user.role === "ADMIN") {
      router.replace(nextPath.startsWith("/admin") ? nextPath : "/admin");
      router.refresh();
      return;
    }
    router.replace(nextPath.startsWith("/admin") ? "/dashboard" : nextPath);
    router.refresh();
  };

  const establishSession = async (idToken: string) => {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Could not sign you in.");
    }
    return data as { user: PublicUser; needsProfile: boolean };
  };

  const devPhoneSignIn = async (payload: {
    phone: string;
    otp: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  }) => {
    const res = await fetch("/api/auth/dev-phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Dev sign-in failed.");
    }

    const auth = getFirebaseAuth();
    await signInWithCustomToken(auth, data.customToken as string);
    const idToken = await auth.currentUser!.getIdToken(true);
    const session = await establishSession(idToken);
    finishAndRedirect(session.user);
  };

  const validatePhoneForMode = (normalized: string) => {
    if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
      throw new Error("Enter a valid phone number with country code (e.g. +10000000000).");
    }

    if (devMode) {
      if (!isFirebaseTestPhone(normalized)) {
        throw new Error("Development mode: use a configured test phone number.");
      }
      if (mode === "login" && !isAdminTestPhone(normalized) && !isCustomerTestPhone(normalized)) {
        throw new Error("Use +10000000000 (admin) or an existing customer test number to login.");
      }
      if (mode === "register") {
        if (isAdminTestPhone(normalized)) {
          throw new Error("Admin uses Login at /login with +10000000000 — not Sign Up.");
        }
        if (!isCustomerTestPhone(normalized)) {
          throw new Error("Customer signup: use +10000000001 or +10000000002.");
        }
      }
    }
  };

  const handleLoginSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const normalized = normalizePhone(phone);
      validatePhoneForMode(normalized);
      setPhone(normalized);

      if (devMode) {
        setLoginStep("otp");
        return;
      }

      const auth = getFirebaseAuth();
      const verifier = await ensureRecaptcha();
      const result = await signInWithPhoneNumber(auth, normalized, verifier);
      setConfirmation(result);
      setLoginStep("otp");
    } catch (err) {
      cleanupRecaptcha();
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!firstName.trim() || !lastName.trim()) {
        throw new Error("First name and last name are required.");
      }

      const normalized = normalizePhone(phone);
      validatePhoneForMode(normalized);
      setPhone(normalized);
      setRegisterStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (devMode) {
        await devPhoneSignIn({
          phone,
          otp,
          ...(mode === "register"
            ? {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim() || undefined,
              }
            : {}),
        });
        return;
      }

      if (!confirmation) {
        throw new Error("Verification session expired. Go back and request a new code.");
      }
      await confirmation.confirm(otp);
      const auth = getFirebaseAuth();
      const idToken = await auth.currentUser!.getIdToken(true);
      const { user, needsProfile } = await establishSession(idToken);

      if (mode === "register") {
        const result = await updateProfile({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim() || "",
        });
        if (!result.ok) {
          throw new Error(result.error);
        }
      }

      if (needsProfile && mode === "login") {
        throw new Error("Please complete sign up first.");
      }

      finishAndRedirect(user);
    } catch (err) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const phoneIcon =
    mode === "register" ? <UserPlus className="h-5 w-5" /> : <Phone className="h-5 w-5" />;

  const testPhoneButtons =
    mode === "login"
      ? FIREBASE_TEST_PHONES.filter((t) => t.phone === ADMIN_TEST_PHONE)
      : FIREBASE_TEST_PHONES.filter((t) =>
          (CUSTOMER_TEST_PHONES as readonly string[]).includes(t.phone),
        );

  return (
    <div className="mx-auto w-full max-w-md">
      <div ref={recaptchaContainerRef} id="recaptcha-container" />

      {/* ---- LOGIN: phone ---- */}
      {mode === "login" && loginStep === "phone" ? (
        <Card className="shadow-soft">
          <CardHeader className="text-center">
            <span className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue to-brand-green text-white">
              {phoneIcon}
            </span>
            <CardTitle className="text-brand-navy">{copy.title}</CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLoginSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder={ADMIN_TEST_PHONE}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                {devMode ? (
                  <div className="space-y-2 rounded-xl border border-brand-green/30 bg-brand-green/5 p-3">
                    <p className="text-xs font-medium text-brand-navy">
                      Dev login — admin OTP 123123
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {testPhoneButtons.map((t) => (
                        <button
                          key={t.phone}
                          type="button"
                          onClick={() => setPhone(t.phone)}
                          className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-brand-navy hover:border-brand-blue"
                        >
                          {t.phone}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sending code…
                  </>
                ) : (
                  "Send verification code"
                )}
              </Button>
              <p className="text-center text-sm">
                <Link href={copy.alternate.href} className="font-medium text-brand-blue hover:underline">
                  {copy.alternate.label}
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* ---- REGISTER: details (name + email + phone) ---- */}
      {mode === "register" && registerStep === "details" ? (
        <Card className="shadow-soft">
          <CardHeader className="text-center">
            <span className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue to-brand-green text-white">
              {phoneIcon}
            </span>
            <CardTitle className="text-brand-navy">{copy.title}</CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegisterContinue} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name *</Label>
                  <Input
                    id="firstName"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name *</Label>
                  <Input
                    id="lastName"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Email (optional)
                  </span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="flex gap-3 rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-3 text-xs text-foreground/80">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-blue" />
                <p>
                  Email is optional — your account works after phone verification. Adding one
                  helps with receipts and recovery.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-phone">Phone number *</Label>
                <Input
                  id="reg-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+10000000001"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                {devMode ? (
                  <div className="space-y-2 rounded-xl border border-brand-green/30 bg-brand-green/5 p-3">
                    <p className="text-xs font-medium text-brand-navy">
                      Dev signup — customer test numbers, OTP 123123
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {testPhoneButtons.map((t) => (
                        <button
                          key={t.phone}
                          type="button"
                          onClick={() => setPhone(t.phone)}
                          className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-brand-navy hover:border-brand-blue"
                        >
                          {t.phone}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Continuing…
                  </>
                ) : (
                  "Continue to verification"
                )}
              </Button>
              <p className="text-center text-sm">
                <Link href={copy.alternate.href} className="font-medium text-brand-blue hover:underline">
                  {copy.alternate.label}
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* ---- OTP (login or register) ---- */}
      {(mode === "login" && loginStep === "otp") || (mode === "register" && registerStep === "otp") ? (
        <Card className="shadow-soft">
          <CardHeader>
            <button
              type="button"
              onClick={() => {
                setOtp("");
                setError(null);
                cleanupRecaptcha();
                if (mode === "login") setLoginStep("phone");
                else setRegisterStep("details");
              }}
              className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-navy"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <CardTitle className="text-brand-navy">Enter verification code</CardTitle>
            <CardDescription>
              {devMode ? (
                <>
                  Test number <span className="font-medium text-foreground">{phone}</span> — enter OTP{" "}
                  <span className="font-medium text-foreground">123123</span>
                </>
              ) : (
                <>
                  Sent to <span className="font-medium text-foreground">{phone}</span>
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">6-digit code</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123123"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" className="w-full" size="lg" disabled={loading || otp.length !== 6}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
                  </>
                ) : mode === "register" ? (
                  "Create account"
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
