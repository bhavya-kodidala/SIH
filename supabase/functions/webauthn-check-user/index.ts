import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { handleOptions, isValidIndianPhone, json } from "../_shared/http.ts";

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const { phone } = await req.json();
    if (!isValidIndianPhone(phone)) {
      return json({ error: "invalid_phone" }, 400);
    }

    const supabase = getSupabaseAdmin();
    const { data: user, error: userError } = await supabase
      .from("rakshanet_users")
      .select("id")
      .eq("phone", phone.trim())
      .maybeSingle();

    if (userError) {
      console.error("webauthn-check-user (user lookup):", userError.message);
      return json({ error: "server_error" }, 500);
    }

    if (!user) {
      return json({ exists: false, hasPasskey: false });
    }

    const { count, error: credError } = await supabase
      .from("webauthn_credentials")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (credError) {
      console.error("webauthn-check-user (cred lookup):", credError.message);
      return json({ error: "server_error" }, 500);
    }

    return json({ exists: true, hasPasskey: (count ?? 0) > 0 });
  } catch (err) {
    console.error("webauthn-check-user:", err);
    return json({ error: "bad_request" }, 400);
  }
});
