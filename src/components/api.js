/**
 * Small helper so every React screen talks to the backend the same way.
 * - API_BASE_URL: where Express runs (dev default = port 5001).
 * - Reads JWT from localStorage (set after login) and sends Authorization header.
 * - Throws on error so try/catch in components can show a message.
 */
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  let data = null;
  try {
    data = await response.json();
  } catch (_error) {
    data = null;
  }

  if (!response.ok) {
    const msg =
      (data && data.message) ||
      (typeof data === "string" ? data : null) ||
      `Request failed (HTTP ${response.status})`;
    throw new Error(msg);
  }

  return data;
}
