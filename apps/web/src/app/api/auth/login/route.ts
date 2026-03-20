import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/server";
import { FieldValue } from "firebase-admin/firestore";
import { grantSignupBonus } from "@/lib/credits";

const SESSION_EXPIRY = 60 * 60 * 24 * 14 * 1000; // 14 days

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    // Verify ID token
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // Create session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRY,
    });

    // Check if user exists, create if first login
    const userRef = adminDb.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // New user - create profile + grant signup bonus
      await userRef.set({
        email: decoded.email || null,
        displayName: decoded.name || null,
        photoUrl: decoded.picture || null,
        plan: "free",
        credits: 0,
        totalCreditsUsed: 0,
        subscription: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      await grantSignupBonus(uid);
    } else {
      // Existing user - update last login info
      await userRef.update({
        email: decoded.email || null,
        displayName: decoded.name || null,
        photoUrl: decoded.picture || null,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Set session cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set("__session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_EXPIRY / 1000,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }
}
