import { NextResponse, type NextRequest } from "next/server";
import { getPolar } from "@/lib/polar";
import { verifySession } from "@/lib/firebase/server";
import { cookies } from "next/headers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifySession(
      (await cookies()).get("__session")?.value ?? ""
    );
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const invoice = await getPolar().orders.invoice({ id });

    return NextResponse.json({ url: invoice.url });
  } catch (error) {
    console.error("Invoice download error:", error);
    return NextResponse.json(
      { error: "Failed to get invoice" },
      { status: 500 }
    );
  }
}
