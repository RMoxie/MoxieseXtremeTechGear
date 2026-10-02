const SESSION_COOKIE = "__Host-moxie_session";

export function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

export function appOrigin(env) {
  if (!env.APP_ORIGIN) throw new Error("APP_ORIGIN is required");
  const parsed = new URL(env.APP_ORIGIN);
  if (parsed.origin !== env.APP_ORIGIN || (parsed.protocol !== "https:" && parsed.hostname !== "localhost")) {
    throw new Error("APP_ORIGIN must be an origin using HTTPS");
  }
  return parsed.origin;
}

export function hasValidPostOrigin(request, env) {
  try {
    return request.headers.get("Origin") === appOrigin(env);
  } catch {
    return false;
  }
}

export function isJsonPost(request) {
  return request.method === "POST" && request.headers.get("Content-Type")?.split(";", 1)[0].trim().toLowerCase() === "application/json";
}

export async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function cookieValue(request, name) {
  const cookies = request.headers.get("Cookie") || "";
  for (const item of cookies.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0 || item.slice(0, separator).trim() !== name) continue;
    return item.slice(separator + 1).trim();
  }
  return null;
}

export async function sessionUser(request, env) {
  const sessionId = cookieValue(request, SESSION_COOKIE);
  if (!sessionId || !env.DB) return null;
  const sessionHash = await sha256Hex(sessionId);
  const now = Math.floor(Date.now() / 1000);
  return env.DB.prepare(
    "SELECT users.id, users.email FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.session_hash = ? AND sessions.expires_at > ?"
  ).bind(sessionHash, now).first();
}

export function sessionCookie(value, maxAge) {
  return `${SESSION_COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;