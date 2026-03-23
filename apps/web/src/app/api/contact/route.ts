import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/firebase/server";
import { sendContactEmail } from "@/lib/email";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession(
      (await cookies()).get("__session")?.value ?? ""
    );

    const formData = await request.formData();
    const email = (session?.email || formData.get("email") as string) ?? "";
    const subject = formData.get("subject") as string;
    const description = formData.get("description") as string;
    const files = formData.getAll("files") as File[];

    if (!email || !subject || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 파일을 Resend 첨부파일 형식으로 변환
    const attachments = await Promise.all(
      files
        .filter((f) => f.size > 0)
        .map(async (f) => ({
          filename: f.name,
          content: Buffer.from(await f.arrayBuffer()),
        }))
    );

    await sendContactEmail({ userEmail: email, subject, description, attachments });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact email error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
