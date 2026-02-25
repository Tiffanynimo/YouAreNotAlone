import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: window.location.origin,
});

// Helper: get current session
export async function getSession() {
  try {
    const session = await authClient.getSession();
    return session?.data || null;
  } catch {
    return null;
  }
}

// Helper: check auth and redirect if not logged in
export async function requireSession() {
  const session = await getSession();
  if (!session || !session.user) {
    window.location.href = "/auth/login.html";
    return null;
  }
  return session;
}

// Helper: sign out
export async function signOutAndRedirect() {
  await authClient.signOut();
  window.location.href = "/auth/login.html";
}

// Helper: redirect user to correct dashboard based on role
export function redirectToDashboard(role) {
  switch (role) {
    case "survivor":
    case "anonymous":
      window.location.href = "/survivor/survivor.html";
      break;
    case "medical":
      window.location.href = "/medical/medical.html";
      break;
    case "therapist":
      window.location.href = "/therapist/therapist.html";
      break;
    case "legal":
      window.location.href = "/legal/legal.html";
      break;
    case "admin":
      window.location.href = "/admin/admin.html";
      break;
    default:
      alert("Invalid user type.");
  }
}
