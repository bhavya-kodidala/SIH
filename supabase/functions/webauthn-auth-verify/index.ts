import { verifyAuthenticationResponse } from "npm:@simplewebauthn/server@^10.0.0";
import { decodeBase64 } from "jsr:@std/encoding/base64";
import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { getExpectedOrigin, RP_ID } from "../_shared/config.ts";
import { handleOptions, isValidIndianPhone, json } from "../_shared/http.ts";

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const { phone, authenticationResponse } = await req.json();
    if (!isValidIndianPhone(phone) || !authenticationResponse) {
      return json({ error: "invalid_request" }, 400);
    }

    const normalizedPhone = phone.trim();
    const supabase = getSupabaseAdmin();

    const { data: user } = await supabase
      .from("rakshanet_users")
      .select("id, phone")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    if (!user) {
      return json({ error: "user_not_found" }, 404);
    }

    const { data: challengeRow } = await supabase
      .from("webauthn_challenges")
      .select("challenge")
      .eq("phone", normalizedPhone)
      .eq("purpose", "authentication")
      .maybeSingle();

    if (!challengeRow) {
      return json({ error: "challenge_expired" }, 400);
    }

    const { data: credRow } = await supabase
      .from("webauthn_credentials")
      .select("*")
      .eq("credential_id", authenticationResponse.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!credRow) {
      return json({ error: "credential_not_found" }, 404);
    }

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: authenticationResponse,
        expectedChallenge: challengeRow.challenge,
        expectedOrigin: getExpectedOrigin(req),
        expectedRPID: RP_ID,
        authenticator: {
          credentialID: credRow.credential_id,
          credentialPublicKey: decodeBase64(credRow.public_key),
          counter: Number(credRow.counter),
          transports: Array.isArray(credRow.transports) && credRow.transports.length > 0 ? credRow.transports : undefined,
        },
        requireUserVerification: false,
      });
    } catch (err) {
      console.error("webauthn-auth-verify (verification error):", err);
      return json({ error: "verification_failed" }, 400);
    }

    if (!verification.verified || !verification.authenticationInfo) {
      return json({ verified: false, error: "verification_failed" }, 400);
    }

    // Update signature counter to prevent replay
    await supabase
      .from("webauthn_credentials")
      .update({
        counter: verification.authenticationInfo.newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", credRow.id);

    // Clean up consumed challenge
    await supabase
      .from("webauthn_challenges")
      .delete()
      .eq("phone", normalizedPhone)
      .eq("purpose", "authentication");

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
    console.error("webauthn-auth-verify:", err);
    return json({ error: "bad_request" }, 400);
  }
});
