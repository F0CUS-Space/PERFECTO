import "server-only";

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

import { requireEnv } from "@/env";

let adminApp: App | undefined;
let adminFirestore: Firestore | undefined;

export function getFirebaseAdminApp(): App {
  if (getApps().length) {
    adminApp = getApp();
    return adminApp;
  }

  adminApp = initializeApp({
    credential: cert({
      projectId: requireEnv("FIREBASE_PROJECT_ID"),
      clientEmail: requireEnv("FIREBASE_CLIENT_EMAIL"),
      // Private keys stored in env have literal "\n" that must be unescaped.
      privateKey: requireEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
  });

  return adminApp;
}

export function getFirebaseAdminAuth(): Auth {
  return getAuth(getFirebaseAdminApp());
}

export function getFirebaseAdminFirestore(): Firestore {
  if (!adminFirestore) {
    adminFirestore = getFirestore(getFirebaseAdminApp());
  }
  return adminFirestore;
}

/** Verifies a Firebase ID token and returns the decoded claims (uid, phone, email...). */
export async function verifyIdToken(idToken: string) {
  return getFirebaseAdminAuth().verifyIdToken(idToken);
}

const SESSION_EXPIRES_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

/** Exchange a fresh ID token for a long-lived Firebase session cookie. */
export async function createSessionCookie(idToken: string) {
  return getFirebaseAdminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_EXPIRES_MS,
  });
}

/** Verify a Firebase session cookie issued by createSessionCookie. */
export async function verifySessionCookie(sessionCookie: string) {
  return getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true);
}

/** Get or create a Firebase Auth user by E.164 phone (Admin SDK — no SMS). */
export async function getOrCreateFirebaseUserByPhone(phone: string) {
  const auth = getFirebaseAdminAuth();
  try {
    return await auth.getUserByPhoneNumber(phone);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "auth/user-not-found") {
      return auth.createUser({ phoneNumber: phone });
    }
    throw error;
  }
}

/** Issue a custom token for the client to exchange via signInWithCustomToken. */
export async function createCustomTokenForUid(uid: string) {
  return getFirebaseAdminAuth().createCustomToken(uid);
}

export { SESSION_EXPIRES_MS };
