import { NextResponse } from "next/server";
import { getPolar } from "@/lib/polar";
import { verifySession, adminDb } from "@/lib/firebase/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const session = await verifySession(
      (await cookies()).get("__session")?.value ?? ""
    );
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Firestore에서 Polar customer ID 가져오기
    const userDoc = await adminDb.collection("users").doc(session.uid).get();
    const polarCustomerId = userDoc.data()?.subscription?.polarCustomerId;

    if (!polarCustomerId) {
      return NextResponse.json(
        { error: "No active subscription" },
        { status: 400 }
      );
    }

    const portal = await getPolar().customerSessions.create({
      customerId: polarCustomerId,
    });

    return NextResponse.json({ url: portal.customerPortalUrl });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
