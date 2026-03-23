import { NextResponse } from "next/server";
import { getPolar } from "@/lib/polar";
import { verifySession, adminDb } from "@/lib/firebase/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const session = await verifySession(
      (await cookies()).get("__session")?.value ?? ""
    );
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userDoc = await adminDb.collection("users").doc(session.uid).get();
    const polarCustomerId = userDoc.data()?.subscription?.polarCustomerId;

    if (!polarCustomerId) {
      return NextResponse.json({ orders: [] });
    }

    const result = await getPolar().orders.list({
      customerId: polarCustomerId,
      sorting: ["-created_at"],
      limit: 20,
    });

    const orders = (result.result?.items ?? []).map((order) => ({
      id: order.id,
      createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : String(order.createdAt),
      status: order.status,
      totalAmount: order.totalAmount,
      currency: order.currency,
      billingReason: order.billingReason,
    }));

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Invoices error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}
