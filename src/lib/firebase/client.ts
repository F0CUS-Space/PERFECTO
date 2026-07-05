"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

import { isAuthDevMode } from "@/features/auth/firebase-test-phones";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
let firestore: Firestore | undefined;
let authConfigured = false;

export function getFirebaseApp(): FirebaseApp {
  if (!firebaseConfig.apiKey) {
    throw new Error("Firebase web config is missing. Set NEXT_PUBLIC_FIREBASE_* env vars.");
  }
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseAuth(): Auth {
  const auth = getAuth(getFirebaseApp());
  // Dev-only: skip reCAPTCHA app verification so Firebase test phone numbers work locally.
  if (!authConfigured && isAuthDevMode() && typeof window !== "undefined") {
    auth.settings.appVerificationDisabledForTesting = true;
    authConfigured = true;
  }
  return auth;
}

/** Firestore client — used for realtime notification signals. */
export function getFirebaseFirestore(): Firestore {
  if (!firebaseConfig.projectId) {
    throw new Error("Firebase project ID is missing.");
  }
  if (!firestore) {
    firestore = getFirestore(getFirebaseApp());
  }
  return firestore;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}
