import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin";
import { adminDb } from "@/lib/firebase/server";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") || "all";
  const limitParam = Math.min(Number(searchParams.get("limit")) || 50, 100);
  const startAfter = searchParams.get("startAfter");

  let q = adminDb
    .collection("jobs")
    .orderBy("createdAt", "desc")
    .limit(limitParam + 1);

  if (status !== "all") {
    q = adminDb
      .collection("jobs")
      .where("status", "==", status)
      .orderBy("createdAt", "desc")
      .limit(limitParam + 1);
  }

  if (startAfter) {
    const cursorDoc = await adminDb.collection("jobs").doc(startAfter).get();
    if (cursorDoc.exists) {
      q = q.startAfter(cursorDoc);
    }
  }

  const snap = await q.get();
  const docs = snap.docs.slice(0, limitParam);
  const hasMore = snap.docs.length > limitParam;

  // Batch fetch user emails
  const userIds = [...new Set(docs.map((d) => d.data().userId as string))];
  const userMap: Record<string, { email?: string; displayName?: string }> = {};

  if (userIds.length > 0) {
    // Firestore 'in' query supports up to 30
    for (let i = 0; i < userIds.length; i += 30) {
      const batch = userIds.slice(i, i + 30);
      const userSnap = await adminDb
        .collection("users")
        .where("__name__", "in", batch)
        .get();
      userSnap.docs.forEach((d) => {
        userMap[d.id] = {
          email: d.data().email,
          displayName: d.data().displayName,
        };
      });
    }
  }

  const jobs = docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      userId: data.userId,
      userEmail: userMap[data.userId]?.email || null,
      type: data.type,
      status: data.status,
      progress: data.progress,
      progressStep: data.progressStep,
      inputFileName: data.inputFileName,
      inputDurationSeconds: data.inputDurationSeconds,
      creditsCharged: data.creditsCharged,
      errorMessage: data.errorMessage || null,
      processingTimeMs: data.processingTimeMs || null,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      completedAt: data.completedAt?.toDate?.()?.toISOString() || null,
    };
  });

  return NextResponse.json({ jobs, hasMore });
}
