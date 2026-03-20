import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb, adminStorage } from "@/lib/firebase/server";
import { FieldValue } from "firebase-admin/firestore";
import { calculateCredits, chargeCredits, refundCredits } from "@/lib/credits";
import { createProcessingTask } from "@/lib/cloudTasks";

export async function POST(request: NextRequest) {
  let jobId: string | null = null;
  let userId: string | null = null;
  let creditsCharged = 0;

  try {
    // 1. Auth
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.slice(7);
    const decoded = await adminAuth.verifyIdToken(idToken);
    userId = decoded.uid;

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as "mr" | "lrc" | "lrc_mr";
    const durationSeconds = Number(formData.get("durationSeconds"));
    const lyrics = formData.get("lyrics") as string | null;

    if (!file || !type || !durationSeconds) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["mr", "lrc", "lrc_mr"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    if ((type === "lrc" || type === "lrc_mr") && !lyrics?.trim()) {
      return NextResponse.json(
        { error: "Lyrics required for LRC generation" },
        { status: 400 }
      );
    }

    // 3. Calculate credits
    creditsCharged = calculateCredits(durationSeconds, type);

    // 4. Create job doc
    const jobRef = adminDb.collection("jobs").doc();
    jobId = jobRef.id;

    const inputStoragePath = `uploads/${userId}/${jobId}/${file.name}`;

    // 5. Charge credits (Firestore transaction)
    await chargeCredits(
      userId,
      creditsCharged,
      jobId,
      `${type.toUpperCase()} - ${file.name}`
    );

    // 6. Upload file to Storage
    const bucket = adminStorage.bucket();
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const storageFile = bucket.file(inputStoragePath);
    await storageFile.save(fileBuffer, {
      contentType: file.type || "audio/mpeg",
    });

    // 7. Create job document
    await jobRef.set({
      userId,
      type,
      status: "queued",
      progress: 0,
      progressStep: "",
      inputStoragePath,
      inputFileName: file.name,
      inputDurationSeconds: durationSeconds,
      lyrics: lyrics || null,
      creditsCharged,
      mrStoragePath: null,
      lrcStoragePath: null,
      logStoragePath: null,
      processingTimeMs: null,
      errorMessage: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      completedAt: null,
    });

    // 8. Create Cloud Task
    await createProcessingTask({
      jobId,
      userId,
      type,
      inputStoragePath,
      lyrics: lyrics || undefined,
    });

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error("Job creation error:", error);

    // Rollback: refund credits if charged
    if (userId && jobId && creditsCharged > 0) {
      try {
        await refundCredits(userId, creditsCharged, jobId, "Job creation failed - refund");
      } catch (refundError) {
        console.error("Refund failed:", refundError);
      }
    }

    // Clean up job doc if created
    if (jobId) {
      try {
        await adminDb.collection("jobs").doc(jobId).delete();
      } catch {
        // ignore
      }
    }

    const message =
      error instanceof Error ? error.message : "Job creation failed";
    const status = message.includes("Insufficient credits") ? 402 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
