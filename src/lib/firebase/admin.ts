import "server-only";

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

import { requireEnv } from "@/env";

let adminApp: App | undefined;

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

/** Verifies a Firebase ID token and returns the decoded claims (uid, phone, email...). */
export async function verifyIdToken(idToken: string) {
  return getFirebaseAdminAuth().verifyIdToken(idToken);
}
