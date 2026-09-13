import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.resolve(__dirname, ".webauthn_dev_db.json");

// Load persistent DB
function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        users: parsed.users || {},
        credentials: parsed.credentials || {},
        challenges: parsed.challenges || {},
        sessions: parsed.sessions || {},
      };
    }
  } catch (e) {
    console.error("[Local Dev WebAuthn] Failed to load DB file:", e.message);
  }
  return { users: {}, credentials: {}, challenges: {}, sessions: {} };
}

// Save persistent DB
function saveDb(db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("[Local Dev WebAuthn] Failed to save DB file:", e.message);
  }
}

// Local development WebAuthn server plugin for Vite.
// Executes real WebAuthn cryptography locally with persistent JSON database storage.
function webauthnDevPlugin() {
  const db = loadDb();
  console.log(
    `[Local Dev WebAuthn] Database loaded from ${DB_FILE}. Users: ${Object.keys(db.users).length}, Credentials: ${Object.keys(db.credentials).length}, Active Sessions: ${Object.keys(db.sessions).length}`
  );

  const parseBody = (req) =>
    new Promise((resolve, reject) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (e) {
          reject(e);
        }
      });
      req.on("error", reject);
    });

  const sendJson = (res, data, status = 200) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.end(JSON.stringify(data));
  };

  return {
    name: "vite-webauthn-dev-plugin",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0];
        if (!url || !url.startsWith("/functions/v1/webauthn-")) {
          return next();
        }

        if (req.method === "OPTIONS") {
          res.statusCode = 200;
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
          res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
          return res.end("ok");
        }

        if (req.method !== "POST") {
          return next();
        }

        try {
          const body = await parseBody(req);
          const rawHost = req.headers.host || "localhost:5173";
          const clientOrigin =
            body?.clientOrigin ||
            req.headers.origin ||
            (req.headers.referer ? new URL(req.headers.referer).origin : `http://${rawHost}`);

          const originUrl = new URL(clientOrigin);
          const rpID = originUrl.hostname;
          const expectedOrigin = clientOrigin;
          const rpName = "RakshaNet";

          console.log(`[SERVER WebAuthn] ${url} | rpID: ${rpID} | expectedOrigin: ${expectedOrigin}`);

          // 1. webauthn-check-user
          if (url === "/functions/v1/webauthn-check-user") {
            const { phone } = body;
            if (!phone) return sendJson(res, { error: "invalid_phone", message: "Phone number is required" }, 400);
            const normalizedPhone = phone.trim();
            const user = db.users[normalizedPhone];
            const creds = user
              ? Object.values(db.credentials).filter((c) => c.userId === user.id)
              : [];
            const hasCreds = creds.length > 0;
            console.log(`[SERVER WebAuthn] check-user: ${normalizedPhone} -> exists: ${!!user}, hasPasskey: ${hasCreds} (credentials found: ${creds.length})`);
            return sendJson(res, { exists: !!user, hasPasskey: hasCreds, credentialCount: creds.length });
          }

          // 2. webauthn-register-options
          if (url === "/functions/v1/webauthn-register-options") {
            const { phone } = body;
            if (!phone) return sendJson(res, { error: "invalid_phone", message: "Phone number is required" }, 400);
            const normalizedPhone = phone.trim();

            let user = db.users[normalizedPhone];
            if (!user) {
              user = {
                id: crypto.randomUUID(),
                phone: normalizedPhone,
                createdAt: new Date().toISOString(),
              };
              db.users[normalizedPhone] = user;
              saveDb(db);
            }

            const existingCreds = Object.values(db.credentials).filter((c) => c.userId === user.id);

            const options = await generateRegistrationOptions({
              rpName,
              rpID,
              userName: normalizedPhone,
              userDisplayName: `RakshaNet (${normalizedPhone})`,
              userID: new TextEncoder().encode(user.id),
              attestationType: "none",
              excludeCredentials: existingCreds.map((c) => ({
                id: c.credentialId,
                type: "public-key",
                transports: Array.isArray(c.transports) && c.transports.length > 0 ? c.transports : undefined,
              })),
              authenticatorSelection: {
                residentKey: "preferred",
                userVerification: "preferred",
              },
            });

            db.challenges[`${normalizedPhone}:registration`] = {
              challenge: options.challenge,
              createdAt: new Date().toISOString(),
            };
            saveDb(db);

            console.log(`[SERVER WebAuthn] register-options generated for ${normalizedPhone}: challenge=${options.challenge}`);
            return sendJson(res, options);
          }

          // 3. webauthn-register-verify
          if (url === "/functions/v1/webauthn-register-verify") {
            const { phone, attestationResponse } = body;
            if (!phone || !attestationResponse) {
              console.error("[SERVER WebAuthn] register-verify: missing phone or attestationResponse");
              return sendJson(res, { error: "invalid_request", message: "Missing phone or attestationResponse" }, 400);
            }
            const normalizedPhone = phone.trim();

            const user = db.users[normalizedPhone];
            if (!user) {
              console.error(`[SERVER WebAuthn] register-verify: user not found for ${normalizedPhone}`);
              return sendJson(res, { error: "user_not_found", message: "User account does not exist" }, 404);
            }

            const challengeEntry = db.challenges[`${normalizedPhone}:registration`];
            if (!challengeEntry) {
              console.error(`[SERVER WebAuthn] register-verify: challenge expired or not found for ${normalizedPhone}`);
              return sendJson(res, { error: "challenge_expired", message: "Challenge expired or not found. Please try again." }, 400);
            }

            let verification;
            try {
              verification = await verifyRegistrationResponse({
                response: attestationResponse,
                expectedChallenge: challengeEntry.challenge,
                expectedOrigin: [expectedOrigin, "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
                expectedRPID: rpID,
                requireUserVerification: false,
              });
            } catch (err) {
              console.error("[SERVER WebAuthn] Register verify cryptographic error:", err.message, err);
              return sendJson(res, { error: "verification_failed", message: err.message }, 400);
            }

            if (!verification.verified || !verification.registrationInfo) {
              console.error("[SERVER WebAuthn] Register verify returned verified=false");
              return sendJson(res, { verified: false, error: "verification_failed", message: "Cryptographic attestation check failed" }, 400);
            }

            const {
              credentialID,
              credentialPublicKey,
              counter,
              credentialDeviceType,
              credentialBackedUp,
            } = verification.registrationInfo;

            const transportsRaw = attestationResponse.response?.transports;
            const transports = Array.isArray(transportsRaw) && transportsRaw.length > 0 ? transportsRaw : undefined;
            const publicKeyBase64 = Buffer.from(credentialPublicKey).toString("base64");

            // Save credential persistently in DB
            db.credentials[credentialID] = {
              id: crypto.randomUUID(),
              userId: user.id,
              credentialId: credentialID,
              publicKey: publicKeyBase64,
              counter: counter ?? 0,
              transports: transports ?? null,
              deviceType: credentialDeviceType || "singleDevice",
              backedUp: !!credentialBackedUp,
              createdAt: new Date().toISOString(),
              lastUsedAt: new Date().toISOString(),
            };

            // Clean up challenge
            delete db.challenges[`${normalizedPhone}:registration`];

            // Create persistent authenticated session
            const sessionToken = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            const session = {
              token: sessionToken,
              userId: user.id,
              phone: user.phone,
              createdAt: new Date().toISOString(),
              expiresAt,
            };
            db.sessions[sessionToken] = session;
            saveDb(db);

            console.log("\n==========================================");
            console.log("USER REGISTERED SUCCESSFULLY:");
            console.log(`  phone: ${user.phone}`);
            console.log(`  userId: ${user.id}`);
            console.log(`  credentialId: ${credentialID}`);
            console.log(`  credentialId byte length: ${Buffer.from(credentialID, "base64url").length}`);
            console.log(`  publicKey byte length: ${credentialPublicKey.byteLength}`);
            console.log(`  counter: ${counter}`);
            console.log(`  transports: ${JSON.stringify(transports ?? null)}`);
            console.log(`  sessionToken: ${sessionToken}`);
            console.log("==========================================\n");

            return sendJson(res, {
              verified: true,
              user: { id: user.id, phone: user.phone },
              session: {
                token: sessionToken,
                user: { id: user.id, phone: user.phone },
                expiresAt,
              },
            });
          }

          // 4. webauthn-auth-options
          if (url === "/functions/v1/webauthn-auth-options") {
            const { phone } = body;
            if (!phone) return sendJson(res, { error: "invalid_phone", message: "Phone number is required" }, 400);
            const normalizedPhone = phone.trim();

            const user = db.users[normalizedPhone];
            if (!user) {
              console.warn(`[SERVER WebAuthn] auth-options: User not found for ${normalizedPhone}`);
              return sendJson(res, { error: "no_passkey", message: "No passkey registered for this phone number" }, 404);
            }

            const userCreds = Object.values(db.credentials).filter((c) => c.userId === user.id);
            if (!userCreds.length) {
              console.warn(`[SERVER WebAuthn] auth-options: No credentials stored for user ${user.id} (${normalizedPhone})`);
              return sendJson(res, { error: "no_passkey", message: "No passkey registered for this phone number" }, 404);
            }

            console.log("\n==========================================");
            console.log("LOGIN USER (auth-options):");
            console.log(`  phone: ${user.phone}`);
            console.log(`  userId: ${user.id}`);
            console.log(`  stored credential count: ${userCreds.length}`);
            console.log(`  stored credential IDs: ${userCreds.map((c) => c.credentialId).join(", ")}`);
            console.log("==========================================\n");

            const options = await generateAuthenticationOptions({
              rpID,
              userVerification: "preferred",
              allowCredentials: userCreds.map((c) => ({
                id: c.credentialId,
                type: "public-key",
                transports: Array.isArray(c.transports) && c.transports.length > 0 ? c.transports : undefined,
              })),
            });

            db.challenges[`${normalizedPhone}:authentication`] = {
              challenge: options.challenge,
              createdAt: new Date().toISOString(),
            };
            saveDb(db);

            console.log(`[SERVER WebAuthn] auth-options generated for ${normalizedPhone} (${userCreds.length} creds allowed): challenge=${options.challenge}`);
            return sendJson(res, options);
          }

          // 5. webauthn-auth-verify
          if (url === "/functions/v1/webauthn-auth-verify") {
            const { phone, authenticationResponse } = body;
            if (!phone || !authenticationResponse) {
              console.error("[SERVER WebAuthn] auth-verify: Missing phone or authenticationResponse");
              return sendJson(res, { error: "invalid_request", message: "Missing phone or authentication response" }, 400);
            }
            const normalizedPhone = phone.trim();

            const user = db.users[normalizedPhone];
            if (!user) {
              console.error(`[SERVER WebAuthn] auth-verify: User not found for ${normalizedPhone}`);
              return sendJson(res, { error: "user_not_found", message: "User not found" }, 404);
            }

            const challengeEntry = db.challenges[`${normalizedPhone}:authentication`];
            if (!challengeEntry) {
              console.error(`[SERVER WebAuthn] auth-verify: Challenge expired or missing for ${normalizedPhone}`);
              return sendJson(res, { error: "challenge_expired", message: "Authentication challenge expired" }, 400);
            }

            // Look up credential by ID or fallback search in user's credentials
            let cred = db.credentials[authenticationResponse.id];
            if (!cred) {
              cred = Object.values(db.credentials).find(
                (c) => c.credentialId === authenticationResponse.id && c.userId === user.id
              );
            }

            if (!cred || cred.userId !== user.id) {
              console.error(`[SERVER WebAuthn] auth-verify: Credential not found in DB! Requested ID: ${authenticationResponse.id}`);
              return sendJson(res, { error: "credential_not_found", message: "Credential not found on this account" }, 404);
            }

            const pubKeyBuffer = Buffer.from(cred.publicKey, "base64");
            const transports = Array.isArray(cred.transports) && cred.transports.length > 0 ? cred.transports : undefined;

            let verification;
            try {
              verification = await verifyAuthenticationResponse({
                response: authenticationResponse,
                expectedChallenge: challengeEntry.challenge,
                expectedOrigin: [expectedOrigin, "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
                expectedRPID: rpID,
                authenticator: {
                  credentialID: cred.credentialId,
                  credentialPublicKey: new Uint8Array(pubKeyBuffer),
                  counter: Number(cred.counter ?? 0),
                  transports,
                },
                requireUserVerification: false,
              });
            } catch (err) {
              console.error("[SERVER WebAuthn] Auth verify cryptographic error:", err.message, err);
              return sendJson(res, { error: "verification_failed", message: err.message }, 400);
            }

            if (!verification.verified || !verification.authenticationInfo) {
              console.error("[SERVER WebAuthn] Auth verify returned verified=false");
              return sendJson(res, { verified: false, error: "verification_failed", message: "Signature verification failed" }, 400);
            }

            // Update signature counter and last used
            cred.counter = verification.authenticationInfo.newCounter;
            cred.lastUsedAt = new Date().toISOString();
            delete db.challenges[`${normalizedPhone}:authentication`];

            // Create persistent authenticated session
            const sessionToken = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            const session = {
              token: sessionToken,
              userId: user.id,
              phone: user.phone,
              createdAt: new Date().toISOString(),
              expiresAt,
            };
            db.sessions[sessionToken] = session;
            saveDb(db);

            console.log(`[SERVER WebAuthn] Authentication successful & session created for ${normalizedPhone}: token=${sessionToken}`);
            return sendJson(res, {
              verified: true,
              user: { id: user.id, phone: user.phone },
              session: {
                token: sessionToken,
                user: { id: user.id, phone: user.phone },
                expiresAt,
              },
            });
          }

          // 6. webauthn-verify-session
          if (url === "/functions/v1/webauthn-verify-session") {
            const { token } = body;
            if (!token) return sendJson(res, { valid: false, error: "missing_token" }, 401);
            const session = db.sessions[token];
            if (!session) return sendJson(res, { valid: false, error: "invalid_session" }, 401);

            if (new Date(session.expiresAt) <= new Date()) {
              delete db.sessions[token];
              saveDb(db);
              return sendJson(res, { valid: false, error: "expired_session" }, 401);
            }

            console.log(`[SERVER WebAuthn] Session verified for user ${session.phone}`);
            return sendJson(res, {
              valid: true,
              session: {
                token: session.token,
                user: { id: session.userId, phone: session.phone },
                phone: session.phone,
                expiresAt: session.expiresAt,
              },
            });
          }

          // 7. webauthn-logout
          if (url === "/functions/v1/webauthn-logout") {
            const { token } = body;
            if (token && db.sessions[token]) {
              delete db.sessions[token];
              saveDb(db);
              console.log(`[SERVER WebAuthn] Session logged out: ${token}`);
            }
            return sendJson(res, { success: true });
          }

          return next();
        } catch (err) {
          console.error("[Local Dev WebAuthn] Server error:", err);
          return sendJson(res, { error: "server_error", message: err?.message }, 500);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), webauthnDevPlugin()],
});
