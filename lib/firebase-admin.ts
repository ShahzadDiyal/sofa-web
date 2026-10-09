/* Firebase Admin SDK — lazily initialised, only when credentials exist.
   The whole app keeps working without Firebase: lib/db.ts falls back to a
   local seeded store, so the site is fully functional until the owner
   provides their Firebase project details. */

import admin from "firebase-admin";

let app: admin.app.App | null = null;
let attempted = false;

function tryInit(): admin.app.App | null {
  if (attempted) return app;
  attempted = true;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;
  try {
    app =
      admin.apps.length > 0
        ? admin.apps[0]!
        : admin.initializeApp({
            credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
          });
    return app;
  } catch (err) {
    console.error("[firebase-admin] init failed:", err);
    return null;
  }
}

/** Firestore instance when server credentials are configured, else null. */
export function adminDb(): admin.firestore.Firestore | null {
  const a = tryInit();
  return a ? a.firestore() : null;
}

/** True when the app is talking to real Firestore; false = local seeded store. */
export function isFirebaseConfigured(): boolean {
  return tryInit() !== null;
}
