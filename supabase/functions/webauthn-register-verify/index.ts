import { verifyRegistrationResponse } from "npm:@simplewebauthn/server@^10.0.0";
import { encodeBase64 } from "jsr:@std/encoding/base64";
import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { getExpectedOrigin, RP_ID } from "../_shared/config.ts";
import { handleOptions, isValidIndianPhone, json } from "../_shared/http.ts";

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const { phone, attestationResponse } = await req.json();
    if (!isValidIndianPhone(phone) || !attestationResponse) {
      return json({ error: "invalid_request" }, 400);
    }

    const normalizedPhone = phone.trim();
    const supabase = getSupabaseAdmin();

    const { data: user, error: userErr } = await supabase
      .from("rakshanet_users")
      .select("id, phone")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    if (userErr || !user) {
      return json({ error: "user_not_found" }, 404);
    }

    const { data: challengeRow } = await supabase
      .from("webauthn_challenges")
      .select("challenge")
      .eq("phone", normalizedPhone)
      .eq("purpose", "registration")
      .maybeSingle();

    if (!challengeRow) {
      return json({ error: "challenge_expired" }, 400);
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: attestationResponse,
        expectedChallenge: challengeRow.challenge,
        expectedOrigin: getExpectedOrigin(req),
        expectedRPID: RP_ID,
        requireUserVerification: false,
      });
    } catch (err) {
      console.error("webauthn-register-verify (verification error):", err);
      return json({ error: "verification_failed" }, 400);
    }

    if (!verification.verified || !verification.registrationInfo) {
      return json({ verified: false, error: "verification_failed" }, 400);
    }

    const {
      credentialID,
      credentialPublicKey,
      counter,
      credentialDeviceType,
      credentialBackedUp,
    } = verification.registrationInfo;

    // Check duplicate credential ID
    const { data: existingCred } = await supabase
      .from("webauthn_credentials")
      .select("id")
      .eq("credential_id", credentialID)
      .maybeSingle();

    if (existingCred) {
      return json({ error: "duplicate_credential" }, 409);
    }

    const transportsRaw = attestationResponse.response?.transports;
    const transports = Array.isArray(transportsRaw) && transportsRaw.length > 0 ? transportsRaw : null;

    const { error: insertErr } = await supabase.from("webauthn_credentials").insert({
      user_id: user.id,
      credential_id: credentialID,
      public_key: encodeBase64(credentialPublicKey),
      counter: counter ?? 0,
      transports,
      device_type: credentialDeviceType,
      backed_up: credentialBackedUp,
    });

    if (insertErr) {
      console.error("webauthn-register-verify (insert):", insertErr.message);
      return json({ error: "server_error" }, 500);
    }

    // Clean up consumed challenge
    await supabase
      .from("webauthn_challenges")
      .delete()
      .eq("phone", normalizedPhone)
      .eq("purpose", "registration");

    // Create session in rakshanet_sessions
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("rakshanet_sessions").insert({
      token: sessionToken,
      user_id: user.id,
      phone: user.phone,
      expires_at: expiresAt,
    });

    return json({
      verified: true,
      user: { id: user.id, phone: user.phone },
      session: {
        token: sessionToken,
        user: { id: user.id, phone: user.phone },
        expiresAt,
      },
    });
  } catch (err) {
    console.error("webauthn-register-verify:", err);
    return json({ error: "bad_request" }, 400);
  }
});
