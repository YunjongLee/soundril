import { NextResponse, type NextRequest } from "next/server";
import { polar, PLAN_PRODUCT_IDS } from "@/lib/polar";
import { verifySession } from "@/lib/firebase/server";
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

    const productId = PLAN_PRODUCT_IDS[plan][period as "monthly" | "yearly"];
    if (!productId) {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://soundril.com";

    const checkout = await polar.checkouts.create({
      products: [productId],
      successUrl: `${appUrl}/dashboard/subscription?success=true`,
      customerEmail: session.email ?? undefined,
      metadata: {
        firebaseUid: session.uid,
      },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("Checkout error:", error);
    const message = error instanceof Error ? error.message : "Failed to create checkout";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
