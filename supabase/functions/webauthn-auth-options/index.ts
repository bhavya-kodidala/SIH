import { generateAuthenticationOptions } from "npm:@simplewebauthn/server@^10.0.0";
import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { RP_ID } from "../_shared/config.ts";
import { handleOptions, isValidIndianPhone, json } from "../_shared/http.ts";

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const { phone } = await req.json();
    if (!isValidIndianPhone(phone)) {
      return json({ error: "invalid_phone" }, 400);
    }

    const normalizedPhone = phone.trim();
    const supabase = getSupabaseAdmin();

    const { data: user } = await supabase
      .from("rakshanet_users")
      .select("id")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    if (!user) {
      return json({ error: "user_not_found" }, 404);
    }

    const { data: creds } = await supabase
      .from("webauthn_credentials")
      .select("credential_id, transports")
      .eq("user_id", user.id);

    if (!creds || creds.length === 0) {
      return json({ error: "no_passkey" }, 404);
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      userVerification: "preferred",
      allowCredentials: creds.map((cred) => ({
        id: cred.credential_id,
        type: "public-key",
        transports: Array.isArray(cred.transports) && cred.transports.length > 0 ? cred.transports : undefined,
      })),
    });

    const { error: challengeErr } = await supabase
      .from("webauthn_challenges")
      .upsert(
        {
          phone: normalizedPhone,
          purpose: "authentication",
          challenge: options.challenge,
          created_at: new Date().toISOString(),
        },
        { onConflict: "phone,purpose" }
      );

    if (challengeErr) {
      console.error("webauthn-auth-options (challenge store):", challengeErr.message);
      return json({ error: "server_error" }, 500);
    }

    return json(options);
  } catch (err) {
    console.error("webauthn-auth-options:", err);
    return json({ error: "bad_request" }, 400);
  }
});
