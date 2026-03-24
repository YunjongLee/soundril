import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin";
import { adminDb } from "@/lib/firebase/server";
import { refundCredits } from "@/lib/credits";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: jobId } = await params;
  const jobRef = adminDb.collection("jobs").doc(jobId);
  const jobDoc = await jobRef.get();

  if (!jobDoc.exists) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const job = jobDoc.data()!;
  if (job.status !== "queued" && job.status !== "processing") {
    return NextResponse.json(
      { error: `Cannot cancel job with status: ${job.status}` },
      { status: 400 }
    );
  }

  // Update job status
  await jobRef.update({
    status: "canceled",
    errorMessage: "Canceled by admin",
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Refund credits
  if (job.creditsCharged > 0) {
    await refundCredits(
      job.userId,
      job.creditsCharged,
      jobId,
      `Admin canceled job — refunded ${job.creditsCharged} credits`
    );
  }

  return NextResponse.json({ success: true });
}
