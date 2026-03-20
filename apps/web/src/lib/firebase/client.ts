import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getApp(): FirebaseApp {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp(firebaseConfig);
}

let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _storage: FirebaseStorage | undefined;

function lazyAuth(): Auth {
  if (!_auth) _auth = getAuth(getApp());
  return _auth;
}

function lazyDb(): Firestore {
  if (!_db) _db = getFirestore(getApp());
  return _db;
}

function lazyStorage(): FirebaseStorage {
  if (!_storage) _storage = getStorage(getApp());
  return _storage;
}

// Proxy-based lazy singletons — safe during SSR/build
export const auth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    return (lazyAuth() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const db: Firestore = new Proxy({} as Firestore, {
  get(_, prop) {
    return (lazyDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const storage: FirebaseStorage = new Proxy({} as FirebaseStorage, {
  get(_, prop) {
    return (lazyStorage() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const googleProvider = new GoogleAuthProvider();
