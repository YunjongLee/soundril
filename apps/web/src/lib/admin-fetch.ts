import { getClientAuth } from "@/lib/firebase/client";

let refreshPromise: Promise<void> | null = null;

async function refreshSession() {
  const user = getClientAuth().currentUser;
  if (!user) throw new Error("Not authenticated");

  const idToken = await user.getIdToken(true);
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error("Session refresh failed");
}

/**
 * fetch wrapper for admin API calls.
 * On 401, refreshes the session cookie (gets fresh ID token → re-login) and retries once.
 */
export async function adminFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  let res = await fetch(input, init);

  if (res.status === 401) {
    if (!refreshPromise) {
      refreshPromise = refreshSession().finally(() => {
        refreshPromise = null;
      });
    }
    await refreshPromise;
    res = await fetch(input, init);
  }

  return res;
}
