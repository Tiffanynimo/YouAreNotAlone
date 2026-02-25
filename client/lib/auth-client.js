// Auth helpers — uses BetterAuth's REST API directly (no Node.js imports needed)

const BASE = "/api/auth";

// ── Sign up ────────────────────────────────────────────────────────
export async function signUp({ email, password, name, fullname, role, phone }) {
  const res = await fetch(`${BASE}/sign-up/email`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name, fullname, role, phone }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data };
  return { data };
}

// ── Sign in ────────────────────────────────────────────────────────
export async function signIn({ email, password }) {
  const res = await fetch(`${BASE}/sign-in/email`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data };
  return { data };
}

// ── Get current session ────────────────────────────────────────────
export async function getSession() {
  try {
    const res = await fetch(`${BASE}/get-session`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data || null;
  } catch {
    return null;
  }
}

// ── Sign out ───────────────────────────────────────────────────────
export async function signOut() {
  await fetch(`${BASE}/sign-out`, {
    method: "POST",
    credentials: "include",
  });
}

// ── Check auth and redirect if not logged in ───────────────────────
export async function requireSession() {
  const session = await getSession();
  if (!session || !session.user) {
    window.location.href = "/auth/login.html";
    return null;
  }
  return session;
}

// ── Sign out and redirect ──────────────────────────────────────────
export async function signOutAndRedirect() {
  await signOut();
  window.location.href = "/auth/login.html";
}

// ── Redirect user to correct dashboard based on role ──────────────
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
      alert("Unknown role: " + role);
  }
}
