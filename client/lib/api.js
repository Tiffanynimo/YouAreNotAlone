// Thin fetch wrapper that includes credentials (cookies) for session auth

const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, data) =>
    request(path, { method: "POST", body: JSON.stringify(data) }),
  put: (path, data) =>
    request(path, { method: "PUT", body: JSON.stringify(data) }),
  delete: (path) => request(path, { method: "DELETE" }),
};

// Activity logging helper
export async function logActivity(action, target = null, userRole = "user") {
  try {
    await api.post("/activity-logs", { action, target, userRole });
  } catch (err) {
    console.error("Error logging activity:", err);
  }
}
