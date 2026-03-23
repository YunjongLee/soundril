import { NextResponse, type NextRequest } from "next/server";
import { getPolar, PLAN_PRODUCT_IDS } from "@/lib/polar";
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

    const productId = PLAN_PRODUCT_IDS[plan][period as "monthly" | "yearly"]?.trim();
    if (!productId) {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://soundril.com").trim();

    const checkout = await getPolar().checkouts.create({
      products: [productId],
      successUrl: `${appUrl}/dashboard/subscription?success=true`,
      customerEmail: session.email ?? undefined,
      metadata: {
        firebaseUid: session.uid,
      },
    });

    const url = checkout.url;
    if (!url) {
      console.error("Checkout response missing url:", JSON.stringify(checkout));
      return NextResponse.json({ error: "Checkout URL not returned" }, { status: 500 });
    }

    const darkUrl = url.includes("?") ? `${url}&theme=dark` : `${url}?theme=dark`;
    return NextResponse.json({ url: darkUrl });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout" },
      { status: 500 }
    );
  }
}
