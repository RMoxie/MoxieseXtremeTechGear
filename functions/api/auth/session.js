import { jsonResponse, sessionUser } from "../../_shared/auth.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return jsonResponse({ error: "Authentication is temporarily unavailable" }, 503);
  try {
    const user = await sessionUser(request, env);
    return jsonResponse({ user: user ? { id: user.id, email: user.email } : null });
  } catch {
    return jsonResponse({ error: "Authentication is temporarily unavailable" }, 503);
  }
}