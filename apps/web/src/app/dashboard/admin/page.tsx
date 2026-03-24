"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Coins,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Activity,
} from "lucide-react";
import { Waveform } from "@/components/waveform";

interface Stats {
  today: {
    total: number;
    byStatus: Record<string, number>;
    credits: number;
  };
  week: {
    total: number;
    byStatus: Record<string, number>;
    credits: number;
  };
  processing: {
    total: number;
    stuck: number;
  };
  totalUsers: number;
  recentFailed: {
    id: string;
    inputFileName: string;
    userEmail: string;
    errorMessage: string | null;
    createdAt: string | null;
  }[];
}

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  alert,
}: {
  label: string;
  value: string | number;
  icon: typeof Coins;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-card p-4 ${
        alert ? "border-orange-500/50" : "border-border/60"
      }`}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className={`h-3.5 w-3.5 ${alert ? "text-orange-500" : ""}`} />
        {label}
      </div>
      <p className={`text-2xl font-bold ${alert ? "text-orange-500" : ""}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Waveform bars={5} size="md" />
      </div>
    );
  }

  if (!stats) return null;

  const todayFailed = stats.today.byStatus.failed || 0;
  const todayCompleted = stats.today.byStatus.completed || 0;
  const todayFailRate =
    todayFailed + todayCompleted > 0
      ? Math.round((todayFailed / (todayFailed + todayCompleted)) * 100)
      : 0;

  const weekFailed = stats.week.byStatus.failed || 0;
  const weekCompleted = stats.week.byStatus.completed || 0;
  const weekFailRate =
    weekFailed + weekCompleted > 0
      ? Math.round((weekFailed / (weekFailed + weekCompleted)) * 100)
      : 0;

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <LayoutDashboard className="h-4.5 w-4.5 text-primary" />
          </div>
          Admin Dashboard
        </h1>
      </div>

      {/* Today stats */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Today
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard
          label="Jobs"
          value={stats.today.total}
          icon={Activity}
          sub={`${todayCompleted} done · ${stats.today.byStatus.queued || 0} queued`}
        />
        <StatCard
          label="Failed"
          value={todayFailed}
          icon={XCircle}
          sub={todayFailRate > 0 ? `${todayFailRate}% fail rate` : "0%"}
          alert={todayFailed > 0}
        />
        <StatCard
          label="Credits Used"
          value={stats.today.credits}
          icon={Coins}
        />
        <StatCard
          label="Processing"
          value={stats.processing.total}
          icon={Loader2}
          sub={
            stats.processing.stuck > 0
              ? `${stats.processing.stuck} stuck`
              : "All healthy"
          }
          alert={stats.processing.stuck > 0}
        />
      </div>

      {/* Week stats */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Last 7 Days
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard
          label="Total Jobs"
          value={stats.week.total}
          icon={TrendingUp}
        />
        <StatCard
          label="Completed"
          value={weekCompleted}
          icon={CheckCircle2}
        />
        <StatCard
          label="Failed"
          value={weekFailed}
          icon={XCircle}
          sub={weekFailRate > 0 ? `${weekFailRate}% fail rate` : "0%"}
          alert={weekFailRate > 10}
        />
        <StatCard
          label="Credits Used"
          value={stats.week.credits}
          icon={Coins}
        />
      </div>

      {/* General */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <StatCard
          label="Total Users"
          value={stats.totalUsers}
          icon={Users}
        />
        <StatCard
          label="Stuck Jobs"
          value={stats.processing.stuck}
          icon={AlertTriangle}
          sub="Processing > 30 min"
          alert={stats.processing.stuck > 0}
        />
      </div>

      {/* Recent failures */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Recent Failures
          </h2>
          <Link
            href="/dashboard/admin/jobs?status=failed"
            className="text-xs text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        {stats.recentFailed.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-card p-6 text-center">
            <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No recent failures</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stats.recentFailed.map((job) => (
              <Link
                key={job.id}
                href={`/dashboard/admin/jobs`}
                className="flex items-start gap-3 rounded-lg border border-border/60 bg-card p-3 hover:border-red-500/30 transition-colors"
              >
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {job.inputFileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {job.userEmail}
                    {job.createdAt
                      ? ` · ${new Date(job.createdAt).toLocaleString()}`
                      : ""}
                  </p>
                  {job.errorMessage && (
                    <p className="text-xs text-red-500 mt-0.5 truncate">
                      {job.errorMessage}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/dashboard/admin/jobs"
          className="rounded-xl border border-border/60 bg-card p-4 hover:border-primary/30 transition-colors text-center"
        >
          <Activity className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-sm font-medium">Job Monitor</p>
        </Link>
        <Link
          href="/dashboard/admin/users"
          className="rounded-xl border border-border/60 bg-card p-4 hover:border-primary/30 transition-colors text-center"
        >
          <Users className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-sm font-medium">Users</p>
        </Link>
      </div>
    </div>
  );
}
