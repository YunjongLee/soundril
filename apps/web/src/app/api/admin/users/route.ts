import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin";
import { adminDb } from "@/lib/firebase/server";

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || "";
  const limitParam = Math.min(Number(searchParams.get("limit")) || 50, 100);
  const startAfter = searchParams.get("startAfter");

  let q = adminDb.collection("users").orderBy("createdAt", "desc").limit(limitParam + 1);

  if (search) {
    q = adminDb
      .collection("users")
      .where("email", ">=", search)
      .where("email", "<=", search + "\uf8ff")
      .orderBy("email")
      .limit(limitParam + 1);
  }

  if (startAfter) {
    const cursorDoc = await adminDb.collection("users").doc(startAfter).get();
    if (cursorDoc.exists) {
      q = q.startAfter(cursorDoc);
    }
  }

  const snap = await q.get();
  const docs = snap.docs.slice(0, limitParam);
  const hasMore = snap.docs.length > limitParam;

  const users = docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      email: data.email || null,
      displayName: data.displayName || null,
      photoUrl: data.photoUrl || null,
      credits: data.credits ?? 0,
      totalCreditsUsed: data.totalCreditsUsed ?? 0,
      subscription: data.subscription
        ? {
            productId: data.subscription.productId,
            status: data.subscription.status,
          }
        : null,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    };
  });

  return NextResponse.json({ users, hasMore });
}
