import { generateRegistrationOptions } from "npm:@simplewebauthn/server@^10.0.0";
import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { RP_ID, RP_NAME } from "../_shared/config.ts";
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

    // Find or create the user account
    let { data: user, error: userErr } = await supabase
      .from("rakshanet_users")
      .select("id, phone")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    if (userErr) {
      console.error("webauthn-register-options (lookup):", userErr.message);
      return json({ error: "server_error" }, 500);
    }

    if (!user) {
      const { data: newUser, error: insertErr } = await supabase
        .from("rakshanet_users")
        .insert({ phone: normalizedPhone })
        .select("id, phone")
        .single();
      if (insertErr) {
        console.error("webauthn-register-options (insert):", insertErr.message);
        return json({ error: "server_error" }, 500);
      }
      user = newUser;
    }

    // Get existing credentials to exclude
    const { data: existingCreds } = await supabase
      .from("webauthn_credentials")
      .select("credential_id, transports")
      .eq("user_id", user.id);

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userName: normalizedPhone,
      userDisplayName: `RakshaNet (${normalizedPhone})`,
      userID: new TextEncoder().encode(user.id),
      attestationType: "none",
      excludeCredentials: (existingCreds ?? []).map((cred) => ({
        id: cred.credential_id,
        type: "public-key",
        transports: cred.transports ?? undefined,
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    // Store challenge in database with composite primary key (phone, purpose)
    const { error: challengeErr } = await supabase
      .from("webauthn_challenges")
      .upsert(
        {
          phone: normalizedPhone,
          purpose: "registration",
          challenge: options.challenge,
          created_at: new Date().toISOString(),
        },
        { onConflict: "phone,purpose" }
      );

    if (challengeErr) {
      console.error("webauthn-register-options (challenge store):", challengeErr.message);
      return json({ error: "server_error" }, 500);
    }

    return json(options);
  } catch (err) {
    console.error("webauthn-register-options:", err);
    return json({ error: "bad_request" }, 400);
  }
});
