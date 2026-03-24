import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin";
import { adminDb } from "@/lib/firebase/server";
import { Timestamp } from "firebase-admin/firestore";

export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const todayTs = Timestamp.fromDate(todayStart);
  const weekTs = Timestamp.fromDate(weekStart);

  const jobsCol = adminDb.collection("jobs");

  // Run all queries in parallel
  const [
    todayJobsSnap,
    weekJobsSnap,
    processingSnap,
    recentFailedSnap,
    totalUsersSnap,
  ] = await Promise.all([
    // Today's jobs (all statuses)
    jobsCol.where("createdAt", ">=", todayTs).get(),
    // This week's jobs
    jobsCol.where("createdAt", ">=", weekTs).get(),
    // Currently processing
    jobsCol.where("status", "==", "processing").get(),
    // Recent failed (last 10)
    jobsCol
      .where("status", "==", "failed")
      .orderBy("createdAt", "desc")
      .limit(10)
      .get(),
    // Total users count
    adminDb.collection("users").count().get(),
  ]);

  // Today breakdown
  const todayByStatus: Record<string, number> = {};
  let todayCredits = 0;
  todayJobsSnap.docs.forEach((d) => {
    const s = d.data().status as string;
    todayByStatus[s] = (todayByStatus[s] || 0) + 1;
    todayCredits += (d.data().creditsCharged as number) || 0;
  });

  // Week breakdown
  const weekByStatus: Record<string, number> = {};
  let weekCredits = 0;
  weekJobsSnap.docs.forEach((d) => {
    const s = d.data().status as string;
    weekByStatus[s] = (weekByStatus[s] || 0) + 1;
    weekCredits += (d.data().creditsCharged as number) || 0;
  });

  // Stuck detection (processing > 30 min)
  const stuckThreshold = Date.now() - 30 * 60 * 1000;
  const stuckJobs = processingSnap.docs.filter((d) => {
    const updated = d.data().updatedAt?.toDate?.()?.getTime();
    return updated && updated < stuckThreshold;
  });

  // Recent failed jobs with user email
  const failedUserIds = [
    ...new Set(recentFailedSnap.docs.map((d) => d.data().userId as string)),
  ];
  const userMap: Record<string, string> = {};
  if (failedUserIds.length > 0) {
    for (let i = 0; i < failedUserIds.length; i += 30) {
      const batch = failedUserIds.slice(i, i + 30);
      const snap = await adminDb
        .collection("users")
        .where("__name__", "in", batch)
        .get();
      snap.docs.forEach((d) => {
        userMap[d.id] = d.data().email || d.id;
      });
    }
  }

  const recentFailed = recentFailedSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      inputFileName: data.inputFileName,
      userEmail: userMap[data.userId] || data.userId,
      errorMessage: data.errorMessage || null,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    };
  });

  return NextResponse.json({
    today: {
      total: todayJobsSnap.size,
      byStatus: todayByStatus,
      credits: todayCredits,
    },
    week: {
      total: weekJobsSnap.size,
      byStatus: weekByStatus,
      credits: weekCredits,
    },
    processing: {
      total: processingSnap.size,
      stuck: stuckJobs.length,
    },
    totalUsers: totalUsersSnap.data().count,
    recentFailed,
  });
}
