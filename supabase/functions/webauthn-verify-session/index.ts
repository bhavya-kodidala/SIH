import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { handleOptions, json } from "../_shared/http.ts";

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const { token } = await req.json();
    if (!token) {
      return json({ valid: false, error: "missing_token" }, 401);
    }

    const supabase = getSupabaseAdmin();
    const { data: session, error } = await supabase
      .from("rakshanet_sessions")
      .select("token, user_id, phone, expires_at, created_at")
      .eq("token", token)
      .maybeSingle();

    if (error || !session) {
      return json({ valid: false, error: "invalid_session" }, 401);
    }

    if (new Date(session.expires_at) <= new Date()) {
      await supabase.from("rakshanet_sessions").delete().eq("token", token);
      return json({ valid: false, error: "expired_session" }, 401);
    }

    return json({
      valid: true,
      session: {
        token: session.token,
        user: { id: session.user_id, phone: session.phone },
        expiresAt: session.expires_at,
      },
    });
  } catch (err) {
    console.error("webauthn-verify-session:", err);
    return json({ error: "bad_request" }, 400);
  }
});
