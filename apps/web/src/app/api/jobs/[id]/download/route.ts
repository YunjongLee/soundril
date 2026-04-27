import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { adminDb, adminStorage, verifySession } from "@/lib/firebase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifySession(
      (await cookies()).get("__session")?.value ?? ""
    );
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobId } = await params;
    const path = request.nextUrl.searchParams.get("path");
    const filename = request.nextUrl.searchParams.get("filename");

    if (!path || !filename) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    if (!path.startsWith(`results/${session.uid}/${jobId}/`)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const jobDoc = await adminDb.collection("jobs").doc(jobId).get();
    if (!jobDoc.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (jobDoc.data()!.userId !== session.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const bucket = adminStorage.bucket(
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    );
    const [signedUrl] = await bucket.file(path).getSignedUrl({
      action: "read",
      expires: Date.now() + 10 * 60 * 1000,
      responseDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    });

    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
