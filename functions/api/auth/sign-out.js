import { hasValidPostOrigin, isJsonPost, jsonResponse, sessionCookie, SESSION_COOKIE_NAME, cookieValue, sha256Hex } from "../../_shared/auth.js";

export async function onRequestPost({ request, env }) {
  if (!hasValidPostOrigin(request, env)) return jsonResponse({ error: "Forbidden" }, 403);
  if (!isJsonPost(request)) return jsonResponse({ error: "Expected JSON" }, 415);
  if (!env.DB) return jsonResponse({ error: "Authentication is temporarily unavailable" }, 503);

  try {
    const sessionId = cookieValue(request, SESSION_COOKIE_NAME);
    if (sessionId) {
      const sessionHash = await sha256Hex(sessionId);
      await env.DB.prepare("DELETE FROM sessions WHERE session_hash = ?").bind(sessionHash).run();
    }
    return jsonResponse({ ok: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
  } catch {
    return jsonResponse({ error: "Authentication is temporarily unavailable" }, 503);
  }
}