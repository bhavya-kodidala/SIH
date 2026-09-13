import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { handleOptions, json } from "../_shared/http.ts";

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const { token } = await req.json();
    if (token) {
      const supabase = getSupabaseAdmin();
      await supabase.from("rakshanet_sessions").delete().eq("token", token);
    }
    return json({ success: true });
  } catch (err) {
    console.error("webauthn-logout:", err);
    return json({ success: true });
  }
});
