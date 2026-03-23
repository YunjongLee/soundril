import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/firebase/server";
import { sendContactEmail } from "@/lib/email";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession(
      (await cookies()).get("__session")?.value ?? ""
    );

    const { email, subject, description } = await request.json();

    const userEmail = session?.email || email;
    if (!userEmail || !subject || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await sendContactEmail({ userEmail, subject, description });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact email error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
