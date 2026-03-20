import {
  initializeApp,
  getApps,
  cert,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

function getServiceAccount(): ServiceAccount {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!encoded) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set");
  }
  return JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
}

function getApp(): App {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({ credential: cert(getServiceAccount()) });
}

// Lazy singletons — avoid initialization at build time
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: Storage | null = null;

export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    if (!_auth) _auth = getAuth(getApp());
    return (_auth as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_, prop) {
    if (!_db) _db = getFirestore(getApp());
    return (_db as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const adminStorage: Storage = new Proxy({} as Storage, {
  get(_, prop) {
    if (!_storage) _storage = getStorage(getApp());
    return (_storage as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/**
 * Verify session cookie and return decoded claims.
 * Returns null if invalid.
 */
export async function verifySession(sessionCookie: string) {
  try {
    return await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch {
    return null;
  }
}
