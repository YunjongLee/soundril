import { NextResponse, type NextRequest } from "next/server";
import { getPolar, PLAN_PRODUCT_IDS } from "@/lib/polar";
import { verifySession, adminDb } from "@/lib/firebase/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession(
      (await cookies()).get("__session")?.value ?? ""
    );
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan, period } = await request.json();

    if (!plan || !period || !PLAN_PRODUCT_IDS[plan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const productId = PLAN_PRODUCT_IDS[plan][period as "monthly" | "yearly"]?.trim();
    if (!productId) {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    // Firestore에서 기존 구독 ID 가져오기
    const userDoc = await adminDb.collection("users").doc(session.uid).get();
    const subscriptionId = userDoc.data()?.subscription?.polarSubscriptionId;

    if (!subscriptionId) {
      return NextResponse.json({ error: "No active subscription" }, { status: 400 });
    }

    await getPolar().subscriptions.update({
      id: subscriptionId,
      subscriptionUpdate: {
        productId,
        prorationBehavior: "invoice",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subscription update error:", error);
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    );
  }
}
