"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { getClientAuth, getClientDb } from "@/lib/firebase/client";

interface UserProfile {
  credits: number;
  totalCreditsUsed: number;
  subscription?: {
    polarSubscriptionId: string;
    polarCustomerId: string;
    productId: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    status: string;
  } | null;
}

interface AuthContext {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => void;
}

const AuthContext = createContext<AuthContext>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(getClientAuth(), (u) => {
      setUser(u);
      if (!u) setProfile(null);
      setLoading(false);
    });
  }, []);

  // Firestore 실시간 구독으로 크레딧 동기화
  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(doc(getClientDb(), "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile({
          credits: data.credits ?? 0,
          totalCreditsUsed: data.totalCreditsUsed ?? 0,
          subscription: data.subscription ?? null,
        });
      }
    });

    return unsub;
  }, [user]);

  const refreshProfile = useCallback(() => {
    // onSnapshot이 자동으로 동기화하므로 별도 작업 불필요
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  const productId = ctx.profile?.subscription?.status === "active"
    ? ctx.profile.subscription.productId
    : null;
  return { ...ctx, productId };
}
