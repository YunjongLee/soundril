import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/server";
import { FieldValue } from "firebase-admin/firestore";
import { calculateCredits, chargeCredits, refundCredits } from "@/lib/credits";
import { createProcessingTask } from "@/lib/cloudTasks";

export async function POST(request: NextRequest) {
  let jobId: string | null = null;
  let userId: string | null = null;
  let creditsCharged = 0;
  let charged = false;

  try {
    // 1. Auth
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.slice(7);
    const decoded = await adminAuth.verifyIdToken(idToken);
    userId = decoded.uid;

    // 2. Parse request body
    const body = await request.json();
    const type = body.type as "mr" | "lrc" | "lrc_mr";
    const durationSeconds = Number(body.durationSeconds);
    const inputStoragePath = body.inputStoragePath as string;
    const inputFileName = body.inputFileName as string;
    const lyrics = (body.lyrics as string) || null;
    const coverStoragePath = (body.coverStoragePath as string) || null;
    const coverUrl = (body.coverUrl as string) || null;

    if (!type || !durationSeconds || !inputStoragePath || !inputFileName) {
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

    // 3. Validate storage path belongs to user
    if (!inputStoragePath.startsWith(`uploads/${userId}/`)) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 403 });
    }

    // 4. Calculate credits
    creditsCharged = calculateCredits(durationSeconds, type);

    // 5. Create job doc
    const jobRef = adminDb.collection("jobs").doc();
    jobId = jobRef.id;

    // 6. Charge credits (Firestore transaction)
    await chargeCredits(
      userId,
      creditsCharged,
      jobId,
      `${type.toUpperCase()} - ${inputFileName}`
    );
    charged = true;

    // 7. Create job document
    await jobRef.set({
      userId,
      type,
      status: "queued",
      progress: 0,
      progressStep: "",
      inputStoragePath,
      inputFileName,
      inputDurationSeconds: durationSeconds,
      coverStoragePath,
      coverUrl,
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
      coverStoragePath,
    });

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error("Job creation error:", error);

    // Rollback: refund credits only if actually charged
    if (userId && jobId && charged) {
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
