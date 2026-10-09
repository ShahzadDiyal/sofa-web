"use client";

/* Firebase Web SDK (client). Initialised from the NEXT_PUBLIC_* env vars.
   The storefront reads/writes through the API routes (server), so the site
   works fully with or without this. These exports exist for client-side
   features: product photo uploads (Storage) and future admin auth (Auth). */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";

let app: FirebaseApp | null = null;

export function firebaseApp(): FirebaseApp | null {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApps()[0]!;
    return app;
  }
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) return null;
  try {
    app = initializeApp({
      apiKey,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    });
    return app;
  } catch {
    return null;
  }
}

export function isFirebaseClientConfigured(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
}

export function clientDb(): Firestore | null {
  const a = firebaseApp();
  return a ? getFirestore(a) : null;
}

export function clientAuth(): Auth | null {
  const a = firebaseApp();
  return a ? getAuth(a) : null;
}

export function clientStorage(): FirebaseStorage | null {
  const a = firebaseApp();
  return a ? getStorage(a) : null;
}
