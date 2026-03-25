"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  User,
  Coins,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Ban,
} from "lucide-react";
import Link from "next/link";
import { Waveform } from "@/components/waveform";
import { adminFetch } from "@/lib/admin-fetch";

interface UserDetail {
  id: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  credits: number;
  totalCreditsUsed: number;
  subscription: {
    polarSubscriptionId: string;
    polarCustomerId: string;
    productId: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
  } | null;
  createdAt: string | null;
}

interface JobItem {
  id: string;
  type: string;
  status: string;
  inputFileName: string;
  creditsCharged: number;
  errorMessage: string | null;
  processingTimeMs: number | null;
  createdAt: string | null;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  createdAt: string | null;
}

const statusIcons: Record<string, typeof Clock> = {
  queued: Clock,
  processing: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
  canceled: Ban,
};

const statusColors: Record<string, string> = {
  queued: "text-yellow-500",
  processing: "text-blue-500",
  completed: "text-green-500",
  failed: "text-red-500",
  canceled: "text-muted-foreground",
};

export default function AdminUserDetailPage() {
  const { id: userId } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Credit adjustment form
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const fetchUser = useCallback(async () => {
    const res = await adminFetch(`/api/admin/users/${userId}`);
    if (!res.ok) throw new Error("Failed to fetch user");
    return res.json();
  }, [userId]);

  useEffect(() => {
    fetchUser().then((data) => {
      setUser(data.user);
      setJobs(data.jobs);
      setTransactions(data.transactions);
      setLoading(false);
    });
  }, [fetchUser]);

  const handleAdjust = async () => {
    const num = Number(amount);
    if (!num || !description.trim()) {
      toast.error("Amount and description are required");
      return;
    }
    setAdjusting(true);
    try {
      const res = await adminFetch(`/api/admin/users/${userId}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: num, description: description.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to adjust credits");
        return;
      }
      toast.success(
        `Credits adjusted: ${data.balanceBefore} → ${data.balanceAfter}`
      );
      setAmount("");
      setDescription("");
      // Refresh data
      const refreshed = await fetchUser();
      setUser(refreshed.user);
      setTransactions(refreshed.transactions);
    } finally {
      setAdjusting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Waveform bars={5} size="md" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">User not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Link
        href="/dashboard/admin/users"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to users
      </Link>

      {/* User info card */}
      <div className="rounded-xl border border-border/60 bg-card p-6 mb-8">
        <div className="flex items-start gap-4">
          {user.photoUrl ? (
            <img
              src={user.photoUrl}
              alt=""
              className="h-14 w-14 rounded-full shrink-0"
            />
          ) : (
            <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center text-lg font-medium shrink-0">
              {user.displayName?.[0] || user.email?.[0] || "?"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold">
              {user.displayName || "No name"}
            </h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              UID: {user.id}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
          <div className="rounded-lg bg-primary/5 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Coins className="h-3 w-3" />
              Credits
            </div>
            <p className="text-lg font-semibold mt-0.5">{user.credits}</p>
          </div>
          <div className="rounded-lg bg-primary/5 p-3">
            <div className="text-xs text-muted-foreground">Total Used</div>
            <p className="text-lg font-semibold mt-0.5">
              {user.totalCreditsUsed}
            </p>
          </div>
          <div className="rounded-lg bg-primary/5 p-3">
            <div className="text-xs text-muted-foreground">Subscription</div>
            <p className="text-lg font-semibold mt-0.5">
              {user.subscription ? user.subscription.status : "Free"}
            </p>
          </div>
        </div>

        {user.subscription && (
          <div className="mt-3 text-xs text-muted-foreground">
            Product: {user.subscription.productId} · Period:{" "}
            {new Date(user.subscription.currentPeriodStart).toLocaleDateString()}{" "}
            — {new Date(user.subscription.currentPeriodEnd).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Credit adjustment */}
      <div className="rounded-xl border border-border/60 bg-card p-6 mb-8">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <User className="h-4 w-4" />
          Adjust Credits
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (+ or -)"
            className="flex-1 px-3 py-2 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:border-primary/50"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Reason"
            className="flex-[2] px-3 py-2 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:border-primary/50"
          />
          <button
            onClick={handleAdjust}
            disabled={adjusting}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
          >
            {adjusting ? "Applying..." : "Apply"}
          </button>
        </div>
      </div>

      {/* Recent jobs */}
      <div className="mb-8">
        <h3 className="font-semibold mb-4">Recent Jobs ({jobs.length})</h3>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No jobs</p>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => {
              const StatusIcon = statusIcons[job.status] || Clock;
              return (
                <div
                  key={job.id}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3"
                >
                  <StatusIcon
                    className={`h-4 w-4 shrink-0 ${
                      statusColors[job.status] || ""
                    } ${job.status === "processing" ? "animate-spin" : ""}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {job.inputFileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {job.type.toUpperCase()} · {job.creditsCharged} credits
                      {job.createdAt
                        ? ` · ${new Date(job.createdAt).toLocaleString()}`
                        : ""}
                    </p>
                    {job.errorMessage && (
                      <p className="text-xs text-red-500 truncate">
                        {job.errorMessage}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Credit transactions */}
      <div>
        <h3 className="font-semibold mb-4">
          Credit Transactions ({transactions.length})
        </h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        tx.amount > 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {tx.amount > 0 ? "+" : ""}
                      {tx.amount}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {tx.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tx.description}
                    {tx.createdAt
                      ? ` · ${new Date(tx.createdAt).toLocaleString()}`
                      : ""}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {tx.balanceBefore} → {tx.balanceAfter}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
