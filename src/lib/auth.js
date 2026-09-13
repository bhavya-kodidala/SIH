import { startRegistration, startAuthentication, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { invokeEdgeFunction } from "./supabaseClient";

const SESSION_STORAGE_KEY = "rakshanet_auth_session";

/**
 * User-facing, non-technical error. `code` is for internal branching/logging;
 * `message` is always safe to show directly in the UI.
 */
export class AuthError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

/** True only when the browser exposes a real WebAuthn implementation. */
export function isWebAuthnSupported() {
  if (typeof window === "undefined") return false;
  try {
    const supported =
      browserSupportsWebAuthn() &&
      typeof window.PublicKeyCredential !== "undefined" &&
      typeof navigator !== "undefined" &&
      !!navigator.credentials &&
      typeof navigator.credentials.create === "function" &&
      typeof navigator.credentials.get === "function";

    return supported;
  } catch (err) {
    console.error("[AUTH] WebAuthn support check failed:", err);
    return false;
  }
}

/** Best-effort check for a platform authenticator (Face ID / Touch ID / Windows Hello / fingerprint). */
export async function isPlatformAuthenticatorAvailable() {
  try {
    if (!isWebAuthnSupported() || !window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) {
      return false;
    }
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (err) {
    console.warn("[AUTH] isUserVerifyingPlatformAuthenticatorAvailable failed:", err);
    return false;
  }
}

/** Normalizes Indian 10-digit mobile number to E.164 (+91XXXXXXXXXX) */
export function toIndianE164(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }
  const last10 = digits.slice(-10);
  return `+91${last10}`;
}

/** Validates 10-digit Indian mobile number */
export function isValidIndianMobile(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  return /^[6-9]\d{9}$/.test(last10);
}

/** Maps a thrown WebAuthn / DOMException into a friendly AuthError */
function mapWebAuthnError(err) {
  const name = err?.name;
  const msg = err?.message || "";

  console.error(`[AUTH-ERROR] WebAuthn exception: name="${name}", message="${msg}"`, err);

  if (name === "NotAllowedError") {
    return new AuthError("cancelled", "Passkey ceremony was cancelled, timed out, or permission was denied.");
  }
  if (name === "InvalidStateError") {
    return new AuthError("duplicate_credential", "A passkey already exists for this account on this device.");
  }
  if (name === "SecurityError") {
    return new AuthError("security", "Passkeys can't be used in this context. Ensure you are on HTTPS or localhost.");
  }
  if (name === "AbortError") {
    return new AuthError("aborted", "Passkey request was aborted or interrupted. Please try again.");
  }
  if (name === "NotSupportedError") {
    return new AuthError("unsupported", "Passkeys are not supported on this browser or device.");
  }
  if (name === "ConstraintError") {
    return new AuthError("constraint", "The authenticator does not meet security requirements.");
  }
  if (name === "TypeError") {
    return new AuthError("type_error", `WebAuthn type error: ${msg || "Invalid credential parameters"}`);
  }
  return new AuthError("unknown", msg || "Passkey operation failed. Please try again.");
}

/* =========================================================================
   SESSION PERSISTENCE & VERIFICATION
   ========================================================================= */

/** Saves the authenticated session returned by the server */
export function saveSession(session) {
  if (typeof window === "undefined" || !session) return;
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    console.error("[AUTH] Failed to save session to localStorage:", e);
  }
}

/** Returns the local session if present */
export function getLocalSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Clears the local session */
export function clearSession() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Cryptographically verifies current session token with the backend.
 * Returns the valid session or null. Prevents false authentication.
 */
export async function verifyCurrentSession() {
  const local = getLocalSession();
  if (!local?.token) {
    return null;
  }

  try {
    const res = await invokeEdgeFunction("webauthn-verify-session", { token: local.token });
    if (res?.valid && res?.session) {
      // Refresh local copy with server state
      saveSession(res.session);
      return res.session;
    }
    clearSession();
    return null;
  } catch (err) {
    console.warn("[AUTH] verifyCurrentSession failed, clearing session:", err?.message);
    clearSession();
    return null;
  }
}

/**
 * Logs out the user on the server and clears local session.
 */
export async function logout() {
  const local = getLocalSession();
  if (local?.token) {
    try {
      await invokeEdgeFunction("webauthn-logout", { token: local.token });
    } catch {
      /* ignore server error during logout */
    }
  }
  clearSession();
  console.log("[AUTH] Logged out successfully");
}

/* =========================================================================
   WEBAUTHN REGISTRATION & AUTHENTICATION CEREMONIES
   ========================================================================= */

/**
 * Checks whether an account exists and has a registered passkey.
 */
export async function checkUserExists(phone) {
  if (!isValidIndianMobile(phone)) {
    throw new AuthError("invalid_phone", "Enter a valid 10-digit mobile number.");
  }
  const normalized = toIndianE164(phone);
  try {
    const data = await invokeEdgeFunction("webauthn-check-user", { phone: normalized });
    return {
      exists: !!data?.exists,
      hasPasskey: !!data?.hasPasskey,
      credentialCount: data?.credentialCount ?? 0,
    };
  } catch (err) {
    console.error("[AUTH] checkUserExists error:", err);
    throw new AuthError(
      "server_unavailable",
      "RakshaNet authentication service is temporarily unavailable."
    );
  }
}

/**
 * Registers a new WebAuthn passkey (TEST 1 — NEW USER flow):
 */
export async function registerPasskey(phone) {
  if (!isValidIndianMobile(phone)) {
    throw new AuthError("invalid_phone", "Enter a valid 10-digit mobile number.");
  }
  if (!isWebAuthnSupported()) {
    throw new AuthError("unsupported", "Passkeys are not supported on this device or browser.");
  }

  const normalized = toIndianE164(phone);
  const clientOrigin = window.location.origin;

  console.log("\n==========================================");
  console.log("[AUTH-REGISTER] phone:", normalized);
  console.log("[AUTH-REGISTER] Browser origin:", clientOrigin, "hostname:", window.location.hostname);

  let options;
  try {
    options = await invokeEdgeFunction("webauthn-register-options", {
      phone: normalized,
      clientOrigin,
    });
    console.log("[AUTH-REGISTER] register-options response:", options);
  } catch (err) {
    console.error("[AUTH-REGISTER] register-options error:", err);
    throw new AuthError("server_error", "RakshaNet authentication service is temporarily unavailable.");
  }

  let attestationResponse;
  try {
    console.log("[AUTH-REGISTER] navigator.credentials.create started");
    attestationResponse = await startRegistration(options);
    console.log("[AUTH-REGISTER] navigator.credentials.create completed:", { id: attestationResponse.id });
  } catch (err) {
    throw mapWebAuthnError(err);
  }

  let verifyData;
  try {
    console.log("[AUTH-REGISTER] register-verify request:", { phone: normalized, id: attestationResponse.id });
    verifyData = await invokeEdgeFunction("webauthn-register-verify", {
      phone: normalized,
      attestationResponse,
      clientOrigin,
    });
    console.log("[AUTH-REGISTER] register-verify response:", verifyData);
  } catch (err) {
    console.error("[AUTH-REGISTER] register-verify error:", err);
    if (err.serverError === "duplicate_credential") {
      throw new AuthError("duplicate_credential", "A passkey already exists for this device.");
    }
    throw new AuthError("registration_failed", err?.message || "We couldn't save your passkey. Please try again.");
  }

  if (!verifyData?.verified || !verifyData?.session) {
    throw new AuthError("registration_failed", "Passkey verification failed. Please try again.");
  }

  saveSession(verifyData.session);
  console.log("[AUTH-REGISTER] session created:", {
    token: verifyData.session.token ? "valid_token" : "missing",
    user: verifyData.session.user,
    expiresAt: verifyData.session.expiresAt,
  });
  console.log("[AUTH-REGISTER] final authentication state: AUTHENTICATED");

  // Debug inspection prints
  console.log("\nUSER:");
  console.log("phone:", normalized);
  console.log("userId:", verifyData.session?.user?.id);
  console.log("credentialId:", attestationResponse.id);
  console.log("credentialId byte length:", attestationResponse.rawId ? attestationResponse.rawId.length : "N/A");
  console.log("publicKey byte length: valid (verified by server)");
  console.log("counter: 0");
  console.log("transports:", attestationResponse.response?.transports ?? null);
  console.log("==========================================\n");

  return verifyData.session;
}

/**
 * Authenticates an existing user with their passkey (TEST 2 — EXISTING USER flow):
 */
export async function loginWithPasskey(phone) {
  if (!isValidIndianMobile(phone)) {
    throw new AuthError("invalid_phone", "Enter a valid 10-digit mobile number.");
  }
  if (!isWebAuthnSupported()) {
    throw new AuthError("unsupported", "Passkeys are not supported on this device or browser.");
  }

  const normalized = toIndianE164(phone);
  const clientOrigin = window.location.origin;

  console.log("\n==========================================");
  console.log("[AUTH-LOGIN] phone:", normalized);
  console.log("[AUTH-LOGIN] Browser origin:", clientOrigin, "hostname:", window.location.hostname);

  // 1. check-user
  const checkRes = await checkUserExists(phone);
  console.log("[AUTH-LOGIN] check-user:", checkRes);
  console.log("[AUTH-LOGIN] hasPasskey:", checkRes.hasPasskey);

  if (!checkRes.hasPasskey) {
    throw new AuthError(
      "no_passkey",
      "No passkey is registered for this number. Click 'New user? Create Passkey' to register this device."
    );
  }

  // 2. auth-options
  console.log("[AUTH-LOGIN] auth-options request: phone=" + normalized);
  let options;
  try {
    options = await invokeEdgeFunction("webauthn-auth-options", {
      phone: normalized,
      clientOrigin,
    });
    console.log("[AUTH-LOGIN] auth-options response:", options);
  } catch (err) {
    console.error("[AUTH-LOGIN] auth-options error:", err);
    if (err.serverError === "no_passkey" || err.serverError === "user_not_found" || err.statusCode === 404) {
      throw new AuthError("no_passkey", "No passkey is registered for this number.");
    }
    throw new AuthError("server_error", "RakshaNet authentication service is temporarily unavailable.");
  }

  console.log("[AUTH-LOGIN] challenge:", options?.challenge);
  console.log("[AUTH-LOGIN] allowCredentials:", options?.allowCredentials);

  if (!options?.allowCredentials?.length) {
    console.error("[AUTH-LOGIN] allowCredentials empty!");
    throw new AuthError("no_passkey", "No passkey credentials found for this number.");
  }

  console.log("\nLOGIN USER:");
  console.log("phone:", normalized);
  console.log("stored credential count:", options.allowCredentials.length);
  console.log("stored credential IDs:", options.allowCredentials.map((c) => c.id).join(", "));
  console.log("==========================================\n");

  console.log("[AUTH-LOGIN] credential found: YES");
  console.log("[AUTH-LOGIN] credential ID:", options.allowCredentials[0]?.id);

  // 3. navigator.credentials.get()
  let authenticationResponse;
  try {
    console.log("[AUTH-LOGIN] navigator.credentials.get started");
    authenticationResponse = await startAuthentication(options);
    console.log("[AUTH-LOGIN] navigator.credentials.get completed");
    console.log("[AUTH-LOGIN] credential returned:", {
      id: authenticationResponse.id,
      type: authenticationResponse.type,
      rawIdLength: authenticationResponse.rawId?.length,
    });
  } catch (err) {
    throw mapWebAuthnError(err);
  }

  // 4. auth-verify
  console.log("[AUTH-LOGIN] auth-verify request:", { phone: normalized, id: authenticationResponse.id });
  let verifyData;
  try {
    verifyData = await invokeEdgeFunction("webauthn-auth-verify", {
      phone: normalized,
      authenticationResponse,
      clientOrigin,
    });
    console.log("[AUTH-LOGIN] auth-verify response:", verifyData);
    console.log("[AUTH-LOGIN] WebAuthn verification result:", verifyData?.verified ? "PASS" : "FAIL");
  } catch (err) {
    console.error("[AUTH-LOGIN] auth-verify error:", err);
    const serverErr = err?.serverError || err?.message;
    if (serverErr === "credential_not_found") {
      throw new AuthError("credential_not_found", "Credential not recognized by server for this account.");
    }
    if (serverErr === "challenge_expired") {
      throw new AuthError("challenge_expired", "Login attempt timed out. Please try again.");
    }
    if (serverErr === "verification_failed") {
      throw new AuthError("verification_failed", "Cryptographic signature verification failed.");
    }
    throw new AuthError("auth_failed", err?.message || "Passkey authentication failed. Please try again.");
  }

  if (!verifyData?.verified || !verifyData?.session) {
    throw new AuthError("auth_failed", "Passkey authentication failed on server. Please try again.");
  }

  // 5. session created
  saveSession(verifyData.session);
  console.log("[AUTH-LOGIN] session created:", {
    token: verifyData.session.token ? "valid_token" : "missing",
    user: verifyData.session.user,
    expiresAt: verifyData.session.expiresAt,
  });
  console.log("[AUTH-LOGIN] final authentication state: AUTHENTICATED");

  return verifyData.session;
}
