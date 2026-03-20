import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb, adminStorage } from "@/lib/firebase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;

    // Auth
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.slice(7);
    const decoded = await adminAuth.verifyIdToken(idToken);

    // Get job
    const jobDoc = await adminDb.collection("jobs").doc(jobId).get();
    if (!jobDoc.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = jobDoc.data()!;
    if (job.userId !== decoded.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if download requested
    const downloadPath = request.nextUrl.searchParams.get("download");
    if (downloadPath) {
      // Verify path belongs to this job
      if (
        !downloadPath.startsWith(`results/${decoded.uid}/${jobId}/`)
      ) {
        return NextResponse.json({ error: "Invalid path" }, { status: 400 });
      }

      const bucket = adminStorage.bucket();
      const file = bucket.file(downloadPath);
      const [url] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      });

      return NextResponse.json({ url });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error("Job fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch job" },
      { status: 500 }
    );
  }
}
