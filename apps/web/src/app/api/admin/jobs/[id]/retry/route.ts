import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin";
import { adminDb } from "@/lib/firebase/server";
import { createProcessingTask } from "@/lib/cloudTasks";
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
  if (job.status !== "failed") {
    return NextResponse.json(
      { error: `Cannot retry job with status: ${job.status}` },
      { status: 400 }
    );
  }

  // Reset job status
  await jobRef.update({
    status: "queued",
    progress: 0,
    progressStep: "",
    errorMessage: null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Re-create Cloud Task (no additional credit charge)
  await createProcessingTask({
    jobId,
    userId: job.userId,
    type: job.type,
    inputStoragePath: job.inputStoragePath,
    lyrics: job.lyrics || undefined,
    coverStoragePath: job.coverStoragePath || undefined,
  });

  return NextResponse.json({ success: true });
}
