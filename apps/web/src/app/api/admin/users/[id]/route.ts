import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin";
import { adminDb } from "@/lib/firebase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId } = await params;
  const userDoc = await adminDb.collection("users").doc(userId).get();

  if (!userDoc.exists) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userData = userDoc.data()!;

  // Recent jobs
  const jobsSnap = await adminDb
    .collection("jobs")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .limit(20)
    .get();

  const jobs = jobsSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      type: data.type,
      status: data.status,
      inputFileName: data.inputFileName,
      creditsCharged: data.creditsCharged,
      errorMessage: data.errorMessage || null,
      processingTimeMs: data.processingTimeMs || null,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    };
  });

  // Recent credit transactions
  const txSnap = await adminDb
    .collection("creditTransactions")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .limit(20)
    .get();

  const transactions = txSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      type: data.type,
      amount: data.amount,
      balanceBefore: data.balanceBefore,
      balanceAfter: data.balanceAfter,
      description: data.description,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    };
  });

  return NextResponse.json({
    user: {
      id: userDoc.id,
      email: userData.email || null,
      displayName: userData.displayName || null,
      photoUrl: userData.photoUrl || null,
      credits: userData.credits ?? 0,
      totalCreditsUsed: userData.totalCreditsUsed ?? 0,
      subscription: userData.subscription || null,
      createdAt: userData.createdAt?.toDate?.()?.toISOString() || null,
    },
    jobs,
    transactions,
  });
}
