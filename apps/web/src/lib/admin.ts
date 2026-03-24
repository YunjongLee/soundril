import { cookies } from "next/headers";
import { verifySession } from "./firebase/server";

/**
 * Verify that the request comes from an admin user.
 * Uses session cookie (__session) → verifySession → admin custom claim check.
 * Returns decoded claims if admin, null otherwise.
 */
export async function verifyAdmin() {
  const session = (await cookies()).get("__session")?.value ?? "";
  if (!session) return null;

  const decoded = await verifySession(session);
  if (!decoded || decoded.admin !== true) return null;

  return decoded;
}
