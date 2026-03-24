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
  isAdmin?: boolean;
  subscription?: {
    polarSubscriptionId: string;
    polarCustomerId: string;
    productId: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    status: string;
    pendingUpdate?: {
      productId: string | null;
      appliesAt: string;
    } | null;
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

    const unsub = onSnapshot(doc(getClientDb(), "users", user.uid), async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        // admin claim 확인
        const tokenResult = await user.getIdTokenResult(true);
        const isAdmin = tokenResult.claims.admin === true;

        setProfile({
          credits: data.credits ?? 0,
          totalCreditsUsed: data.totalCreditsUsed ?? 0,
          isAdmin,
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
  const sub = ctx.profile?.subscription;
  // active 또는 canceled(기간 내)일 때 유료 플랜 유지
  const isWithinPeriod = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).getTime() > Date.now()
    : false;
  const isAdmin = ctx.profile?.isAdmin === true;
  const productId = isAdmin
    ? "admin"
    : sub && (sub.status === "active" || (sub.status === "canceled" && isWithinPeriod))
      ? sub.productId
      : null;
  return { ...ctx, productId };
}
