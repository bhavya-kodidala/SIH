// vite.config.js
import { defineConfig } from "file:///D:/projects/SIH/rakshanet-app/node_modules/vite/dist/node/index.js";
import react from "file:///D:/projects/SIH/rakshanet-app/node_modules/@vitejs/plugin-react/dist/index.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from "file:///D:/projects/SIH/rakshanet-app/node_modules/@simplewebauthn/server/esm/index.js";
var __vite_injected_original_import_meta_url = "file:///D:/projects/SIH/rakshanet-app/vite.config.js";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = path.dirname(__filename);
var DB_FILE = path.resolve(__dirname, ".webauthn_dev_db.json");
function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        users: parsed.users || {},
        credentials: parsed.credentials || {},
        challenges: parsed.challenges || {},
        sessions: parsed.sessions || {}
      };
    }
  } catch (e) {
    console.error("[Local Dev WebAuthn] Failed to load DB file:", e.message);
  }
  return { users: {}, credentials: {}, challenges: {}, sessions: {} };
}
function saveDb(db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("[Local Dev WebAuthn] Failed to save DB file:", e.message);
  }
}
function webauthnDevPlugin() {
  const db = loadDb();
  console.log(
    `[Local Dev WebAuthn] Database loaded from ${DB_FILE}. Users: ${Object.keys(db.users).length}, Credentials: ${Object.keys(db.credentials).length}, Active Sessions: ${Object.keys(db.sessions).length}`
  );
  const parseBody = (req) => new Promise((resolve, reject) => {
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
          const clientOrigin = body?.clientOrigin || req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : `http://${rawHost}`);
          const originUrl = new URL(clientOrigin);
          const rpID = originUrl.hostname;
          const expectedOrigin = clientOrigin;
          const rpName = "RakshaNet";
          console.log(`[SERVER WebAuthn] ${url} | rpID: ${rpID} | expectedOrigin: ${expectedOrigin}`);
          if (url === "/functions/v1/webauthn-check-user") {
            const { phone } = body;
            if (!phone) return sendJson(res, { error: "invalid_phone" }, 400);
            const normalizedPhone = phone.trim();
            const user = db.users[normalizedPhone];
            const hasCreds = user ? Object.values(db.credentials).some((c) => c.userId === user.id) : false;
            console.log(`[SERVER WebAuthn] check-user: ${normalizedPhone} -> exists: ${!!user}, hasPasskey: ${hasCreds}`);
            return sendJson(res, { exists: !!user, hasPasskey: hasCreds });
          }
          if (url === "/functions/v1/webauthn-register-options") {
            const { phone } = body;
            if (!phone) return sendJson(res, { error: "invalid_phone" }, 400);
            const normalizedPhone = phone.trim();
            let user = db.users[normalizedPhone];
            if (!user) {
              user = {
                id: crypto.randomUUID(),
                phone: normalizedPhone,
                createdAt: (/* @__PURE__ */ new Date()).toISOString()
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
                transports: c.transports
              })),
              authenticatorSelection: {
                residentKey: "preferred",
                userVerification: "preferred"
              }
            });
            db.challenges[`${normalizedPhone}:registration`] = {
              challenge: options.challenge,
              createdAt: (/* @__PURE__ */ new Date()).toISOString()
            };
            saveDb(db);
            console.log(`[SERVER WebAuthn] register-options generated for ${normalizedPhone}`);
            return sendJson(res, options);
          }
          if (url === "/functions/v1/webauthn-register-verify") {
            const { phone, attestationResponse } = body;
            if (!phone || !attestationResponse) return sendJson(res, { error: "invalid_request" }, 400);
            const normalizedPhone = phone.trim();
            const user = db.users[normalizedPhone];
            if (!user) return sendJson(res, { error: "user_not_found" }, 404);
            const challengeEntry = db.challenges[`${normalizedPhone}:registration`];
            if (!challengeEntry) return sendJson(res, { error: "challenge_expired" }, 400);
            let verification;
            try {
              verification = await verifyRegistrationResponse({
                response: attestationResponse,
                expectedChallenge: challengeEntry.challenge,
                expectedOrigin,
                expectedRPID: rpID,
                requireUserVerification: false
              });
            } catch (err) {
              console.error("[SERVER WebAuthn] Register verify cryptographic error:", err);
              return sendJson(res, { error: "verification_failed", message: err.message }, 400);
            }
            if (!verification.verified || !verification.registrationInfo) {
              return sendJson(res, { verified: false, error: "verification_failed" }, 400);
            }
            const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
            db.credentials[credential.id] = {
              id: crypto.randomUUID(),
              userId: user.id,
              credentialId: credential.id,
              publicKey: Buffer.from(credential.publicKey).toString("base64"),
              counter: credential.counter,
              transports: attestationResponse.response?.transports ?? null,
              deviceType: credentialDeviceType,
              backedUp: credentialBackedUp,
              createdAt: (/* @__PURE__ */ new Date()).toISOString(),
              lastUsedAt: (/* @__PURE__ */ new Date()).toISOString()
            };
            delete db.challenges[`${normalizedPhone}:registration`];
            const sessionToken = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString();
            const session = {
              token: sessionToken,
              userId: user.id,
              phone: user.phone,
              createdAt: (/* @__PURE__ */ new Date()).toISOString(),
              expiresAt
            };
            db.sessions[sessionToken] = session;
            saveDb(db);
            console.log(`[SERVER WebAuthn] Registration successful & session created for ${normalizedPhone}: ${sessionToken}`);
            return sendJson(res, {
              verified: true,
              user: { id: user.id, phone: user.phone },
              session: {
                token: sessionToken,
                user: { id: user.id, phone: user.phone },
                expiresAt
              }
            });
          }
          if (url === "/functions/v1/webauthn-auth-options") {
            const { phone } = body;
            if (!phone) return sendJson(res, { error: "invalid_phone" }, 400);
            const normalizedPhone = phone.trim();
            const user = db.users[normalizedPhone];
            if (!user) return sendJson(res, { error: "no_passkey" }, 404);
            const userCreds = Object.values(db.credentials).filter((c) => c.userId === user.id);
            if (!userCreds.length) return sendJson(res, { error: "no_passkey" }, 404);
            const options = await generateAuthenticationOptions({
              rpID,
              userVerification: "preferred",
              allowCredentials: userCreds.map((c) => ({
                id: c.credentialId,
                type: "public-key",
                transports: c.transports
              }))
            });
            db.challenges[`${normalizedPhone}:authentication`] = {
              challenge: options.challenge,
              createdAt: (/* @__PURE__ */ new Date()).toISOString()
            };
            saveDb(db);
            console.log(`[SERVER WebAuthn] auth-options generated for ${normalizedPhone} (${userCreds.length} creds allowed)`);
            return sendJson(res, options);
          }
          if (url === "/functions/v1/webauthn-auth-verify") {
            const { phone, authenticationResponse } = body;
            if (!phone || !authenticationResponse) return sendJson(res, { error: "invalid_request" }, 400);
            const normalizedPhone = phone.trim();
            const user = db.users[normalizedPhone];
            if (!user) return sendJson(res, { error: "user_not_found" }, 404);
            const challengeEntry = db.challenges[`${normalizedPhone}:authentication`];
            if (!challengeEntry) return sendJson(res, { error: "challenge_expired" }, 400);
            const cred = db.credentials[authenticationResponse.id];
            if (!cred || cred.userId !== user.id) return sendJson(res, { error: "credential_not_found" }, 404);
            let verification;
            try {
              verification = await verifyAuthenticationResponse({
                response: authenticationResponse,
                expectedChallenge: challengeEntry.challenge,
                expectedOrigin,
                expectedRPID: rpID,
                authenticator: {
                  credentialID: cred.credentialId,
                  credentialPublicKey: new Uint8Array(Buffer.from(cred.publicKey, "base64")),
                  counter: Number(cred.counter),
                  transports: cred.transports ?? void 0
                },
                requireUserVerification: false
              });
            } catch (err) {
              console.error("[SERVER WebAuthn] Auth verify cryptographic error:", err);
              return sendJson(res, { error: "verification_failed", message: err.message }, 400);
            }
            if (!verification.verified || !verification.authenticationInfo) {
              return sendJson(res, { verified: false, error: "verification_failed" }, 400);
            }
            cred.counter = verification.authenticationInfo.newCounter;
            cred.lastUsedAt = (/* @__PURE__ */ new Date()).toISOString();
            delete db.challenges[`${normalizedPhone}:authentication`];
            const sessionToken = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString();
            const session = {
              token: sessionToken,
              userId: user.id,
              phone: user.phone,
              createdAt: (/* @__PURE__ */ new Date()).toISOString(),
              expiresAt
            };
            db.sessions[sessionToken] = session;
            saveDb(db);
            console.log(`[SERVER WebAuthn] Authentication successful & session created for ${normalizedPhone}: ${sessionToken}`);
            return sendJson(res, {
              verified: true,
              user: { id: user.id, phone: user.phone },
              session: {
                token: sessionToken,
                user: { id: user.id, phone: user.phone },
                expiresAt
              }
            });
          }
          if (url === "/functions/v1/webauthn-verify-session") {
            const { token } = body;
            if (!token) return sendJson(res, { valid: false, error: "missing_token" }, 401);
            const session = db.sessions[token];
            if (!session) return sendJson(res, { valid: false, error: "invalid_session" }, 401);
            if (new Date(session.expiresAt) <= /* @__PURE__ */ new Date()) {
              delete db.sessions[token];
              saveDb(db);
              return sendJson(res, { valid: false, error: "expired_session" }, 401);
            }
            console.log(`[SERVER WebAuthn] Session verified for user ${session.phone}`);
            return sendJson(res, { valid: true, session });
          }
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
    }
  };
}
var vite_config_default = defineConfig({
  plugins: [react(), webauthnDevPlugin()]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxwcm9qZWN0c1xcXFxTSUhcXFxccmFrc2hhbmV0LWFwcFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxccHJvamVjdHNcXFxcU0lIXFxcXHJha3NoYW5ldC1hcHBcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L3Byb2plY3RzL1NJSC9yYWtzaGFuZXQtYXBwL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIjtcbmltcG9ydCBmcyBmcm9tIFwiZnNcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgY3J5cHRvIGZyb20gXCJjcnlwdG9cIjtcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tIFwidXJsXCI7XG5pbXBvcnQge1xuICBnZW5lcmF0ZVJlZ2lzdHJhdGlvbk9wdGlvbnMsXG4gIHZlcmlmeVJlZ2lzdHJhdGlvblJlc3BvbnNlLFxuICBnZW5lcmF0ZUF1dGhlbnRpY2F0aW9uT3B0aW9ucyxcbiAgdmVyaWZ5QXV0aGVudGljYXRpb25SZXNwb25zZSxcbn0gZnJvbSBcIkBzaW1wbGV3ZWJhdXRobi9zZXJ2ZXJcIjtcblxuY29uc3QgX19maWxlbmFtZSA9IGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKTtcbmNvbnN0IF9fZGlybmFtZSA9IHBhdGguZGlybmFtZShfX2ZpbGVuYW1lKTtcbmNvbnN0IERCX0ZJTEUgPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi53ZWJhdXRobl9kZXZfZGIuanNvblwiKTtcblxuLy8gTG9hZCBwZXJzaXN0ZW50IERCXG5mdW5jdGlvbiBsb2FkRGIoKSB7XG4gIHRyeSB7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoREJfRklMRSkpIHtcbiAgICAgIGNvbnN0IHJhdyA9IGZzLnJlYWRGaWxlU3luYyhEQl9GSUxFLCBcInV0Zi04XCIpO1xuICAgICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShyYXcpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdXNlcnM6IHBhcnNlZC51c2VycyB8fCB7fSxcbiAgICAgICAgY3JlZGVudGlhbHM6IHBhcnNlZC5jcmVkZW50aWFscyB8fCB7fSxcbiAgICAgICAgY2hhbGxlbmdlczogcGFyc2VkLmNoYWxsZW5nZXMgfHwge30sXG4gICAgICAgIHNlc3Npb25zOiBwYXJzZWQuc2Vzc2lvbnMgfHwge30sXG4gICAgICB9O1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJbTG9jYWwgRGV2IFdlYkF1dGhuXSBGYWlsZWQgdG8gbG9hZCBEQiBmaWxlOlwiLCBlLm1lc3NhZ2UpO1xuICB9XG4gIHJldHVybiB7IHVzZXJzOiB7fSwgY3JlZGVudGlhbHM6IHt9LCBjaGFsbGVuZ2VzOiB7fSwgc2Vzc2lvbnM6IHt9IH07XG59XG5cbi8vIFNhdmUgcGVyc2lzdGVudCBEQlxuZnVuY3Rpb24gc2F2ZURiKGRiKSB7XG4gIHRyeSB7XG4gICAgZnMud3JpdGVGaWxlU3luYyhEQl9GSUxFLCBKU09OLnN0cmluZ2lmeShkYiwgbnVsbCwgMiksIFwidXRmLThcIik7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiW0xvY2FsIERldiBXZWJBdXRobl0gRmFpbGVkIHRvIHNhdmUgREIgZmlsZTpcIiwgZS5tZXNzYWdlKTtcbiAgfVxufVxuXG4vLyBMb2NhbCBkZXZlbG9wbWVudCBXZWJBdXRobiBzZXJ2ZXIgcGx1Z2luIGZvciBWaXRlLlxuLy8gRXhlY3V0ZXMgcmVhbCBXZWJBdXRobiBjcnlwdG9ncmFwaHkgbG9jYWxseSB3aXRoIHBlcnNpc3RlbnQgSlNPTiBkYXRhYmFzZSBzdG9yYWdlLlxuZnVuY3Rpb24gd2ViYXV0aG5EZXZQbHVnaW4oKSB7XG4gIGNvbnN0IGRiID0gbG9hZERiKCk7XG4gIGNvbnNvbGUubG9nKFxuICAgIGBbTG9jYWwgRGV2IFdlYkF1dGhuXSBEYXRhYmFzZSBsb2FkZWQgZnJvbSAke0RCX0ZJTEV9LiBVc2VyczogJHtPYmplY3Qua2V5cyhkYi51c2VycykubGVuZ3RofSwgQ3JlZGVudGlhbHM6ICR7T2JqZWN0LmtleXMoZGIuY3JlZGVudGlhbHMpLmxlbmd0aH0sIEFjdGl2ZSBTZXNzaW9uczogJHtPYmplY3Qua2V5cyhkYi5zZXNzaW9ucykubGVuZ3RofWBcbiAgKTtcblxuICBjb25zdCBwYXJzZUJvZHkgPSAocmVxKSA9PlxuICAgIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGxldCBib2R5ID0gXCJcIjtcbiAgICAgIHJlcS5vbihcImRhdGFcIiwgKGNodW5rKSA9PiB7XG4gICAgICAgIGJvZHkgKz0gY2h1bms7XG4gICAgICB9KTtcbiAgICAgIHJlcS5vbihcImVuZFwiLCAoKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmVzb2x2ZShib2R5ID8gSlNPTi5wYXJzZShib2R5KSA6IHt9KTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICByZXEub24oXCJlcnJvclwiLCByZWplY3QpO1xuICAgIH0pO1xuXG4gIGNvbnN0IHNlbmRKc29uID0gKHJlcywgZGF0YSwgc3RhdHVzID0gMjAwKSA9PiB7XG4gICAgcmVzLnN0YXR1c0NvZGUgPSBzdGF0dXM7XG4gICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XG4gICAgcmVzLnNldEhlYWRlcihcIkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpblwiLCBcIipcIik7XG4gICAgcmVzLnNldEhlYWRlcihcIkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnNcIiwgXCJhdXRob3JpemF0aW9uLCB4LWNsaWVudC1pbmZvLCBhcGlrZXksIGNvbnRlbnQtdHlwZVwiKTtcbiAgICByZXMuc2V0SGVhZGVyKFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kc1wiLCBcIlBPU1QsIEdFVCwgT1BUSU9OU1wiKTtcbiAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KGRhdGEpKTtcbiAgfTtcblxuICByZXR1cm4ge1xuICAgIG5hbWU6IFwidml0ZS13ZWJhdXRobi1kZXYtcGx1Z2luXCIsXG4gICAgY29uZmlndXJlU2VydmVyKHNlcnZlcikge1xuICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgICAgY29uc3QgdXJsID0gcmVxLnVybD8uc3BsaXQoXCI/XCIpWzBdO1xuICAgICAgICBpZiAoIXVybCB8fCAhdXJsLnN0YXJ0c1dpdGgoXCIvZnVuY3Rpb25zL3YxL3dlYmF1dGhuLVwiKSkge1xuICAgICAgICAgIHJldHVybiBuZXh0KCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJPUFRJT05TXCIpIHtcbiAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDIwMDtcbiAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luXCIsIFwiKlwiKTtcbiAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVyc1wiLCBcImF1dGhvcml6YXRpb24sIHgtY2xpZW50LWluZm8sIGFwaWtleSwgY29udGVudC10eXBlXCIpO1xuICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzXCIsIFwiUE9TVCwgR0VULCBPUFRJT05TXCIpO1xuICAgICAgICAgIHJldHVybiByZXMuZW5kKFwib2tcIik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVxLm1ldGhvZCAhPT0gXCJQT1NUXCIpIHtcbiAgICAgICAgICByZXR1cm4gbmV4dCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBib2R5ID0gYXdhaXQgcGFyc2VCb2R5KHJlcSk7XG4gICAgICAgICAgY29uc3QgcmF3SG9zdCA9IHJlcS5oZWFkZXJzLmhvc3QgfHwgXCJsb2NhbGhvc3Q6NTE3M1wiO1xuICAgICAgICAgIGNvbnN0IGNsaWVudE9yaWdpbiA9XG4gICAgICAgICAgICBib2R5Py5jbGllbnRPcmlnaW4gfHxcbiAgICAgICAgICAgIHJlcS5oZWFkZXJzLm9yaWdpbiB8fFxuICAgICAgICAgICAgKHJlcS5oZWFkZXJzLnJlZmVyZXIgPyBuZXcgVVJMKHJlcS5oZWFkZXJzLnJlZmVyZXIpLm9yaWdpbiA6IGBodHRwOi8vJHtyYXdIb3N0fWApO1xuXG4gICAgICAgICAgY29uc3Qgb3JpZ2luVXJsID0gbmV3IFVSTChjbGllbnRPcmlnaW4pO1xuICAgICAgICAgIGNvbnN0IHJwSUQgPSBvcmlnaW5VcmwuaG9zdG5hbWU7XG4gICAgICAgICAgY29uc3QgZXhwZWN0ZWRPcmlnaW4gPSBjbGllbnRPcmlnaW47XG4gICAgICAgICAgY29uc3QgcnBOYW1lID0gXCJSYWtzaGFOZXRcIjtcblxuICAgICAgICAgIGNvbnNvbGUubG9nKGBbU0VSVkVSIFdlYkF1dGhuXSAke3VybH0gfCBycElEOiAke3JwSUR9IHwgZXhwZWN0ZWRPcmlnaW46ICR7ZXhwZWN0ZWRPcmlnaW59YCk7XG5cbiAgICAgICAgICAvLyAxLiB3ZWJhdXRobi1jaGVjay11c2VyXG4gICAgICAgICAgaWYgKHVybCA9PT0gXCIvZnVuY3Rpb25zL3YxL3dlYmF1dGhuLWNoZWNrLXVzZXJcIikge1xuICAgICAgICAgICAgY29uc3QgeyBwaG9uZSB9ID0gYm9keTtcbiAgICAgICAgICAgIGlmICghcGhvbmUpIHJldHVybiBzZW5kSnNvbihyZXMsIHsgZXJyb3I6IFwiaW52YWxpZF9waG9uZVwiIH0sIDQwMCk7XG4gICAgICAgICAgICBjb25zdCBub3JtYWxpemVkUGhvbmUgPSBwaG9uZS50cmltKCk7XG4gICAgICAgICAgICBjb25zdCB1c2VyID0gZGIudXNlcnNbbm9ybWFsaXplZFBob25lXTtcbiAgICAgICAgICAgIGNvbnN0IGhhc0NyZWRzID0gdXNlclxuICAgICAgICAgICAgICA/IE9iamVjdC52YWx1ZXMoZGIuY3JlZGVudGlhbHMpLnNvbWUoKGMpID0+IGMudXNlcklkID09PSB1c2VyLmlkKVxuICAgICAgICAgICAgICA6IGZhbHNlO1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFtTRVJWRVIgV2ViQXV0aG5dIGNoZWNrLXVzZXI6ICR7bm9ybWFsaXplZFBob25lfSAtPiBleGlzdHM6ICR7ISF1c2VyfSwgaGFzUGFzc2tleTogJHtoYXNDcmVkc31gKTtcbiAgICAgICAgICAgIHJldHVybiBzZW5kSnNvbihyZXMsIHsgZXhpc3RzOiAhIXVzZXIsIGhhc1Bhc3NrZXk6IGhhc0NyZWRzIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIDIuIHdlYmF1dGhuLXJlZ2lzdGVyLW9wdGlvbnNcbiAgICAgICAgICBpZiAodXJsID09PSBcIi9mdW5jdGlvbnMvdjEvd2ViYXV0aG4tcmVnaXN0ZXItb3B0aW9uc1wiKSB7XG4gICAgICAgICAgICBjb25zdCB7IHBob25lIH0gPSBib2R5O1xuICAgICAgICAgICAgaWYgKCFwaG9uZSkgcmV0dXJuIHNlbmRKc29uKHJlcywgeyBlcnJvcjogXCJpbnZhbGlkX3Bob25lXCIgfSwgNDAwKTtcbiAgICAgICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRQaG9uZSA9IHBob25lLnRyaW0oKTtcblxuICAgICAgICAgICAgbGV0IHVzZXIgPSBkYi51c2Vyc1tub3JtYWxpemVkUGhvbmVdO1xuICAgICAgICAgICAgaWYgKCF1c2VyKSB7XG4gICAgICAgICAgICAgIHVzZXIgPSB7XG4gICAgICAgICAgICAgICAgaWQ6IGNyeXB0by5yYW5kb21VVUlEKCksXG4gICAgICAgICAgICAgICAgcGhvbmU6IG5vcm1hbGl6ZWRQaG9uZSxcbiAgICAgICAgICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgZGIudXNlcnNbbm9ybWFsaXplZFBob25lXSA9IHVzZXI7XG4gICAgICAgICAgICAgIHNhdmVEYihkYik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nQ3JlZHMgPSBPYmplY3QudmFsdWVzKGRiLmNyZWRlbnRpYWxzKS5maWx0ZXIoKGMpID0+IGMudXNlcklkID09PSB1c2VyLmlkKTtcblxuICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IGF3YWl0IGdlbmVyYXRlUmVnaXN0cmF0aW9uT3B0aW9ucyh7XG4gICAgICAgICAgICAgIHJwTmFtZSxcbiAgICAgICAgICAgICAgcnBJRCxcbiAgICAgICAgICAgICAgdXNlck5hbWU6IG5vcm1hbGl6ZWRQaG9uZSxcbiAgICAgICAgICAgICAgdXNlckRpc3BsYXlOYW1lOiBgUmFrc2hhTmV0ICgke25vcm1hbGl6ZWRQaG9uZX0pYCxcbiAgICAgICAgICAgICAgdXNlcklEOiBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUodXNlci5pZCksXG4gICAgICAgICAgICAgIGF0dGVzdGF0aW9uVHlwZTogXCJub25lXCIsXG4gICAgICAgICAgICAgIGV4Y2x1ZGVDcmVkZW50aWFsczogZXhpc3RpbmdDcmVkcy5tYXAoKGMpID0+ICh7XG4gICAgICAgICAgICAgICAgaWQ6IGMuY3JlZGVudGlhbElkLFxuICAgICAgICAgICAgICAgIHR5cGU6IFwicHVibGljLWtleVwiLFxuICAgICAgICAgICAgICAgIHRyYW5zcG9ydHM6IGMudHJhbnNwb3J0cyxcbiAgICAgICAgICAgICAgfSkpLFxuICAgICAgICAgICAgICBhdXRoZW50aWNhdG9yU2VsZWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgcmVzaWRlbnRLZXk6IFwicHJlZmVycmVkXCIsXG4gICAgICAgICAgICAgICAgdXNlclZlcmlmaWNhdGlvbjogXCJwcmVmZXJyZWRcIixcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBkYi5jaGFsbGVuZ2VzW2Ake25vcm1hbGl6ZWRQaG9uZX06cmVnaXN0cmF0aW9uYF0gPSB7XG4gICAgICAgICAgICAgIGNoYWxsZW5nZTogb3B0aW9ucy5jaGFsbGVuZ2UsXG4gICAgICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNhdmVEYihkYik7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbU0VSVkVSIFdlYkF1dGhuXSByZWdpc3Rlci1vcHRpb25zIGdlbmVyYXRlZCBmb3IgJHtub3JtYWxpemVkUGhvbmV9YCk7XG4gICAgICAgICAgICByZXR1cm4gc2VuZEpzb24ocmVzLCBvcHRpb25zKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyAzLiB3ZWJhdXRobi1yZWdpc3Rlci12ZXJpZnlcbiAgICAgICAgICBpZiAodXJsID09PSBcIi9mdW5jdGlvbnMvdjEvd2ViYXV0aG4tcmVnaXN0ZXItdmVyaWZ5XCIpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgcGhvbmUsIGF0dGVzdGF0aW9uUmVzcG9uc2UgfSA9IGJvZHk7XG4gICAgICAgICAgICBpZiAoIXBob25lIHx8ICFhdHRlc3RhdGlvblJlc3BvbnNlKSByZXR1cm4gc2VuZEpzb24ocmVzLCB7IGVycm9yOiBcImludmFsaWRfcmVxdWVzdFwiIH0sIDQwMCk7XG4gICAgICAgICAgICBjb25zdCBub3JtYWxpemVkUGhvbmUgPSBwaG9uZS50cmltKCk7XG5cbiAgICAgICAgICAgIGNvbnN0IHVzZXIgPSBkYi51c2Vyc1tub3JtYWxpemVkUGhvbmVdO1xuICAgICAgICAgICAgaWYgKCF1c2VyKSByZXR1cm4gc2VuZEpzb24ocmVzLCB7IGVycm9yOiBcInVzZXJfbm90X2ZvdW5kXCIgfSwgNDA0KTtcblxuICAgICAgICAgICAgY29uc3QgY2hhbGxlbmdlRW50cnkgPSBkYi5jaGFsbGVuZ2VzW2Ake25vcm1hbGl6ZWRQaG9uZX06cmVnaXN0cmF0aW9uYF07XG4gICAgICAgICAgICBpZiAoIWNoYWxsZW5nZUVudHJ5KSByZXR1cm4gc2VuZEpzb24ocmVzLCB7IGVycm9yOiBcImNoYWxsZW5nZV9leHBpcmVkXCIgfSwgNDAwKTtcblxuICAgICAgICAgICAgbGV0IHZlcmlmaWNhdGlvbjtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIHZlcmlmaWNhdGlvbiA9IGF3YWl0IHZlcmlmeVJlZ2lzdHJhdGlvblJlc3BvbnNlKHtcbiAgICAgICAgICAgICAgICByZXNwb25zZTogYXR0ZXN0YXRpb25SZXNwb25zZSxcbiAgICAgICAgICAgICAgICBleHBlY3RlZENoYWxsZW5nZTogY2hhbGxlbmdlRW50cnkuY2hhbGxlbmdlLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkT3JpZ2luLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkUlBJRDogcnBJRCxcbiAgICAgICAgICAgICAgICByZXF1aXJlVXNlclZlcmlmaWNhdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbU0VSVkVSIFdlYkF1dGhuXSBSZWdpc3RlciB2ZXJpZnkgY3J5cHRvZ3JhcGhpYyBlcnJvcjpcIiwgZXJyKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHNlbmRKc29uKHJlcywgeyBlcnJvcjogXCJ2ZXJpZmljYXRpb25fZmFpbGVkXCIsIG1lc3NhZ2U6IGVyci5tZXNzYWdlIH0sIDQwMCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghdmVyaWZpY2F0aW9uLnZlcmlmaWVkIHx8ICF2ZXJpZmljYXRpb24ucmVnaXN0cmF0aW9uSW5mbykge1xuICAgICAgICAgICAgICByZXR1cm4gc2VuZEpzb24ocmVzLCB7IHZlcmlmaWVkOiBmYWxzZSwgZXJyb3I6IFwidmVyaWZpY2F0aW9uX2ZhaWxlZFwiIH0sIDQwMCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHsgY3JlZGVudGlhbCwgY3JlZGVudGlhbERldmljZVR5cGUsIGNyZWRlbnRpYWxCYWNrZWRVcCB9ID0gdmVyaWZpY2F0aW9uLnJlZ2lzdHJhdGlvbkluZm87XG5cbiAgICAgICAgICAgIC8vIFNhdmUgY3JlZGVudGlhbCBwZXJzaXN0ZW50bHlcbiAgICAgICAgICAgIGRiLmNyZWRlbnRpYWxzW2NyZWRlbnRpYWwuaWRdID0ge1xuICAgICAgICAgICAgICBpZDogY3J5cHRvLnJhbmRvbVVVSUQoKSxcbiAgICAgICAgICAgICAgdXNlcklkOiB1c2VyLmlkLFxuICAgICAgICAgICAgICBjcmVkZW50aWFsSWQ6IGNyZWRlbnRpYWwuaWQsXG4gICAgICAgICAgICAgIHB1YmxpY0tleTogQnVmZmVyLmZyb20oY3JlZGVudGlhbC5wdWJsaWNLZXkpLnRvU3RyaW5nKFwiYmFzZTY0XCIpLFxuICAgICAgICAgICAgICBjb3VudGVyOiBjcmVkZW50aWFsLmNvdW50ZXIsXG4gICAgICAgICAgICAgIHRyYW5zcG9ydHM6IGF0dGVzdGF0aW9uUmVzcG9uc2UucmVzcG9uc2U/LnRyYW5zcG9ydHMgPz8gbnVsbCxcbiAgICAgICAgICAgICAgZGV2aWNlVHlwZTogY3JlZGVudGlhbERldmljZVR5cGUsXG4gICAgICAgICAgICAgIGJhY2tlZFVwOiBjcmVkZW50aWFsQmFja2VkVXAsXG4gICAgICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICBsYXN0VXNlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBDbGVhbiB1cCBjaGFsbGVuZ2VcbiAgICAgICAgICAgIGRlbGV0ZSBkYi5jaGFsbGVuZ2VzW2Ake25vcm1hbGl6ZWRQaG9uZX06cmVnaXN0cmF0aW9uYF07XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSBwZXJzaXN0ZW50IGF1dGhlbnRpY2F0ZWQgc2Vzc2lvblxuICAgICAgICAgICAgY29uc3Qgc2Vzc2lvblRva2VuID0gY3J5cHRvLnJhbmRvbVVVSUQoKTtcbiAgICAgICAgICAgIGNvbnN0IGV4cGlyZXNBdCA9IG5ldyBEYXRlKERhdGUubm93KCkgKyAzMCAqIDI0ICogNjAgKiA2MCAqIDEwMDApLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICBjb25zdCBzZXNzaW9uID0ge1xuICAgICAgICAgICAgICB0b2tlbjogc2Vzc2lvblRva2VuLFxuICAgICAgICAgICAgICB1c2VySWQ6IHVzZXIuaWQsXG4gICAgICAgICAgICAgIHBob25lOiB1c2VyLnBob25lLFxuICAgICAgICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgICAgZXhwaXJlc0F0LFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGRiLnNlc3Npb25zW3Nlc3Npb25Ub2tlbl0gPSBzZXNzaW9uO1xuICAgICAgICAgICAgc2F2ZURiKGRiKTtcblxuICAgICAgICAgICAgY29uc29sZS5sb2coYFtTRVJWRVIgV2ViQXV0aG5dIFJlZ2lzdHJhdGlvbiBzdWNjZXNzZnVsICYgc2Vzc2lvbiBjcmVhdGVkIGZvciAke25vcm1hbGl6ZWRQaG9uZX06ICR7c2Vzc2lvblRva2VufWApO1xuICAgICAgICAgICAgcmV0dXJuIHNlbmRKc29uKHJlcywge1xuICAgICAgICAgICAgICB2ZXJpZmllZDogdHJ1ZSxcbiAgICAgICAgICAgICAgdXNlcjogeyBpZDogdXNlci5pZCwgcGhvbmU6IHVzZXIucGhvbmUgfSxcbiAgICAgICAgICAgICAgc2Vzc2lvbjoge1xuICAgICAgICAgICAgICAgIHRva2VuOiBzZXNzaW9uVG9rZW4sXG4gICAgICAgICAgICAgICAgdXNlcjogeyBpZDogdXNlci5pZCwgcGhvbmU6IHVzZXIucGhvbmUgfSxcbiAgICAgICAgICAgICAgICBleHBpcmVzQXQsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyA0LiB3ZWJhdXRobi1hdXRoLW9wdGlvbnNcbiAgICAgICAgICBpZiAodXJsID09PSBcIi9mdW5jdGlvbnMvdjEvd2ViYXV0aG4tYXV0aC1vcHRpb25zXCIpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgcGhvbmUgfSA9IGJvZHk7XG4gICAgICAgICAgICBpZiAoIXBob25lKSByZXR1cm4gc2VuZEpzb24ocmVzLCB7IGVycm9yOiBcImludmFsaWRfcGhvbmVcIiB9LCA0MDApO1xuICAgICAgICAgICAgY29uc3Qgbm9ybWFsaXplZFBob25lID0gcGhvbmUudHJpbSgpO1xuXG4gICAgICAgICAgICBjb25zdCB1c2VyID0gZGIudXNlcnNbbm9ybWFsaXplZFBob25lXTtcbiAgICAgICAgICAgIGlmICghdXNlcikgcmV0dXJuIHNlbmRKc29uKHJlcywgeyBlcnJvcjogXCJub19wYXNza2V5XCIgfSwgNDA0KTtcblxuICAgICAgICAgICAgY29uc3QgdXNlckNyZWRzID0gT2JqZWN0LnZhbHVlcyhkYi5jcmVkZW50aWFscykuZmlsdGVyKChjKSA9PiBjLnVzZXJJZCA9PT0gdXNlci5pZCk7XG4gICAgICAgICAgICBpZiAoIXVzZXJDcmVkcy5sZW5ndGgpIHJldHVybiBzZW5kSnNvbihyZXMsIHsgZXJyb3I6IFwibm9fcGFzc2tleVwiIH0sIDQwNCk7XG5cbiAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSBhd2FpdCBnZW5lcmF0ZUF1dGhlbnRpY2F0aW9uT3B0aW9ucyh7XG4gICAgICAgICAgICAgIHJwSUQsXG4gICAgICAgICAgICAgIHVzZXJWZXJpZmljYXRpb246IFwicHJlZmVycmVkXCIsXG4gICAgICAgICAgICAgIGFsbG93Q3JlZGVudGlhbHM6IHVzZXJDcmVkcy5tYXAoKGMpID0+ICh7XG4gICAgICAgICAgICAgICAgaWQ6IGMuY3JlZGVudGlhbElkLFxuICAgICAgICAgICAgICAgIHR5cGU6IFwicHVibGljLWtleVwiLFxuICAgICAgICAgICAgICAgIHRyYW5zcG9ydHM6IGMudHJhbnNwb3J0cyxcbiAgICAgICAgICAgICAgfSkpLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGRiLmNoYWxsZW5nZXNbYCR7bm9ybWFsaXplZFBob25lfTphdXRoZW50aWNhdGlvbmBdID0ge1xuICAgICAgICAgICAgICBjaGFsbGVuZ2U6IG9wdGlvbnMuY2hhbGxlbmdlLFxuICAgICAgICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzYXZlRGIoZGIpO1xuXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgW1NFUlZFUiBXZWJBdXRobl0gYXV0aC1vcHRpb25zIGdlbmVyYXRlZCBmb3IgJHtub3JtYWxpemVkUGhvbmV9ICgke3VzZXJDcmVkcy5sZW5ndGh9IGNyZWRzIGFsbG93ZWQpYCk7XG4gICAgICAgICAgICByZXR1cm4gc2VuZEpzb24ocmVzLCBvcHRpb25zKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyA1LiB3ZWJhdXRobi1hdXRoLXZlcmlmeVxuICAgICAgICAgIGlmICh1cmwgPT09IFwiL2Z1bmN0aW9ucy92MS93ZWJhdXRobi1hdXRoLXZlcmlmeVwiKSB7XG4gICAgICAgICAgICBjb25zdCB7IHBob25lLCBhdXRoZW50aWNhdGlvblJlc3BvbnNlIH0gPSBib2R5O1xuICAgICAgICAgICAgaWYgKCFwaG9uZSB8fCAhYXV0aGVudGljYXRpb25SZXNwb25zZSkgcmV0dXJuIHNlbmRKc29uKHJlcywgeyBlcnJvcjogXCJpbnZhbGlkX3JlcXVlc3RcIiB9LCA0MDApO1xuICAgICAgICAgICAgY29uc3Qgbm9ybWFsaXplZFBob25lID0gcGhvbmUudHJpbSgpO1xuXG4gICAgICAgICAgICBjb25zdCB1c2VyID0gZGIudXNlcnNbbm9ybWFsaXplZFBob25lXTtcbiAgICAgICAgICAgIGlmICghdXNlcikgcmV0dXJuIHNlbmRKc29uKHJlcywgeyBlcnJvcjogXCJ1c2VyX25vdF9mb3VuZFwiIH0sIDQwNCk7XG5cbiAgICAgICAgICAgIGNvbnN0IGNoYWxsZW5nZUVudHJ5ID0gZGIuY2hhbGxlbmdlc1tgJHtub3JtYWxpemVkUGhvbmV9OmF1dGhlbnRpY2F0aW9uYF07XG4gICAgICAgICAgICBpZiAoIWNoYWxsZW5nZUVudHJ5KSByZXR1cm4gc2VuZEpzb24ocmVzLCB7IGVycm9yOiBcImNoYWxsZW5nZV9leHBpcmVkXCIgfSwgNDAwKTtcblxuICAgICAgICAgICAgY29uc3QgY3JlZCA9IGRiLmNyZWRlbnRpYWxzW2F1dGhlbnRpY2F0aW9uUmVzcG9uc2UuaWRdO1xuICAgICAgICAgICAgaWYgKCFjcmVkIHx8IGNyZWQudXNlcklkICE9PSB1c2VyLmlkKSByZXR1cm4gc2VuZEpzb24ocmVzLCB7IGVycm9yOiBcImNyZWRlbnRpYWxfbm90X2ZvdW5kXCIgfSwgNDA0KTtcblxuICAgICAgICAgICAgbGV0IHZlcmlmaWNhdGlvbjtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIHZlcmlmaWNhdGlvbiA9IGF3YWl0IHZlcmlmeUF1dGhlbnRpY2F0aW9uUmVzcG9uc2Uoe1xuICAgICAgICAgICAgICAgIHJlc3BvbnNlOiBhdXRoZW50aWNhdGlvblJlc3BvbnNlLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkQ2hhbGxlbmdlOiBjaGFsbGVuZ2VFbnRyeS5jaGFsbGVuZ2UsXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWRPcmlnaW4sXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWRSUElEOiBycElELFxuICAgICAgICAgICAgICAgIGF1dGhlbnRpY2F0b3I6IHtcbiAgICAgICAgICAgICAgICAgIGNyZWRlbnRpYWxJRDogY3JlZC5jcmVkZW50aWFsSWQsXG4gICAgICAgICAgICAgICAgICBjcmVkZW50aWFsUHVibGljS2V5OiBuZXcgVWludDhBcnJheShCdWZmZXIuZnJvbShjcmVkLnB1YmxpY0tleSwgXCJiYXNlNjRcIikpLFxuICAgICAgICAgICAgICAgICAgY291bnRlcjogTnVtYmVyKGNyZWQuY291bnRlciksXG4gICAgICAgICAgICAgICAgICB0cmFuc3BvcnRzOiBjcmVkLnRyYW5zcG9ydHMgPz8gdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVxdWlyZVVzZXJWZXJpZmljYXRpb246IGZhbHNlLFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW1NFUlZFUiBXZWJBdXRobl0gQXV0aCB2ZXJpZnkgY3J5cHRvZ3JhcGhpYyBlcnJvcjpcIiwgZXJyKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHNlbmRKc29uKHJlcywgeyBlcnJvcjogXCJ2ZXJpZmljYXRpb25fZmFpbGVkXCIsIG1lc3NhZ2U6IGVyci5tZXNzYWdlIH0sIDQwMCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghdmVyaWZpY2F0aW9uLnZlcmlmaWVkIHx8ICF2ZXJpZmljYXRpb24uYXV0aGVudGljYXRpb25JbmZvKSB7XG4gICAgICAgICAgICAgIHJldHVybiBzZW5kSnNvbihyZXMsIHsgdmVyaWZpZWQ6IGZhbHNlLCBlcnJvcjogXCJ2ZXJpZmljYXRpb25fZmFpbGVkXCIgfSwgNDAwKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXBkYXRlIHNpZ25hdHVyZSBjb3VudGVyIGFuZCBsYXN0IHVzZWRcbiAgICAgICAgICAgIGNyZWQuY291bnRlciA9IHZlcmlmaWNhdGlvbi5hdXRoZW50aWNhdGlvbkluZm8ubmV3Q291bnRlcjtcbiAgICAgICAgICAgIGNyZWQubGFzdFVzZWRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgIGRlbGV0ZSBkYi5jaGFsbGVuZ2VzW2Ake25vcm1hbGl6ZWRQaG9uZX06YXV0aGVudGljYXRpb25gXTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIHBlcnNpc3RlbnQgYXV0aGVudGljYXRlZCBzZXNzaW9uXG4gICAgICAgICAgICBjb25zdCBzZXNzaW9uVG9rZW4gPSBjcnlwdG8ucmFuZG9tVVVJRCgpO1xuICAgICAgICAgICAgY29uc3QgZXhwaXJlc0F0ID0gbmV3IERhdGUoRGF0ZS5ub3coKSArIDMwICogMjQgKiA2MCAqIDYwICogMTAwMCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgIGNvbnN0IHNlc3Npb24gPSB7XG4gICAgICAgICAgICAgIHRva2VuOiBzZXNzaW9uVG9rZW4sXG4gICAgICAgICAgICAgIHVzZXJJZDogdXNlci5pZCxcbiAgICAgICAgICAgICAgcGhvbmU6IHVzZXIucGhvbmUsXG4gICAgICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICBleHBpcmVzQXQsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZGIuc2Vzc2lvbnNbc2Vzc2lvblRva2VuXSA9IHNlc3Npb247XG4gICAgICAgICAgICBzYXZlRGIoZGIpO1xuXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgW1NFUlZFUiBXZWJBdXRobl0gQXV0aGVudGljYXRpb24gc3VjY2Vzc2Z1bCAmIHNlc3Npb24gY3JlYXRlZCBmb3IgJHtub3JtYWxpemVkUGhvbmV9OiAke3Nlc3Npb25Ub2tlbn1gKTtcbiAgICAgICAgICAgIHJldHVybiBzZW5kSnNvbihyZXMsIHtcbiAgICAgICAgICAgICAgdmVyaWZpZWQ6IHRydWUsXG4gICAgICAgICAgICAgIHVzZXI6IHsgaWQ6IHVzZXIuaWQsIHBob25lOiB1c2VyLnBob25lIH0sXG4gICAgICAgICAgICAgIHNlc3Npb246IHtcbiAgICAgICAgICAgICAgICB0b2tlbjogc2Vzc2lvblRva2VuLFxuICAgICAgICAgICAgICAgIHVzZXI6IHsgaWQ6IHVzZXIuaWQsIHBob25lOiB1c2VyLnBob25lIH0sXG4gICAgICAgICAgICAgICAgZXhwaXJlc0F0LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gNi4gd2ViYXV0aG4tdmVyaWZ5LXNlc3Npb25cbiAgICAgICAgICBpZiAodXJsID09PSBcIi9mdW5jdGlvbnMvdjEvd2ViYXV0aG4tdmVyaWZ5LXNlc3Npb25cIikge1xuICAgICAgICAgICAgY29uc3QgeyB0b2tlbiB9ID0gYm9keTtcbiAgICAgICAgICAgIGlmICghdG9rZW4pIHJldHVybiBzZW5kSnNvbihyZXMsIHsgdmFsaWQ6IGZhbHNlLCBlcnJvcjogXCJtaXNzaW5nX3Rva2VuXCIgfSwgNDAxKTtcbiAgICAgICAgICAgIGNvbnN0IHNlc3Npb24gPSBkYi5zZXNzaW9uc1t0b2tlbl07XG4gICAgICAgICAgICBpZiAoIXNlc3Npb24pIHJldHVybiBzZW5kSnNvbihyZXMsIHsgdmFsaWQ6IGZhbHNlLCBlcnJvcjogXCJpbnZhbGlkX3Nlc3Npb25cIiB9LCA0MDEpO1xuXG4gICAgICAgICAgICBpZiAobmV3IERhdGUoc2Vzc2lvbi5leHBpcmVzQXQpIDw9IG5ldyBEYXRlKCkpIHtcbiAgICAgICAgICAgICAgZGVsZXRlIGRiLnNlc3Npb25zW3Rva2VuXTtcbiAgICAgICAgICAgICAgc2F2ZURiKGRiKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHNlbmRKc29uKHJlcywgeyB2YWxpZDogZmFsc2UsIGVycm9yOiBcImV4cGlyZWRfc2Vzc2lvblwiIH0sIDQwMSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbU0VSVkVSIFdlYkF1dGhuXSBTZXNzaW9uIHZlcmlmaWVkIGZvciB1c2VyICR7c2Vzc2lvbi5waG9uZX1gKTtcbiAgICAgICAgICAgIHJldHVybiBzZW5kSnNvbihyZXMsIHsgdmFsaWQ6IHRydWUsIHNlc3Npb24gfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gNy4gd2ViYXV0aG4tbG9nb3V0XG4gICAgICAgICAgaWYgKHVybCA9PT0gXCIvZnVuY3Rpb25zL3YxL3dlYmF1dGhuLWxvZ291dFwiKSB7XG4gICAgICAgICAgICBjb25zdCB7IHRva2VuIH0gPSBib2R5O1xuICAgICAgICAgICAgaWYgKHRva2VuICYmIGRiLnNlc3Npb25zW3Rva2VuXSkge1xuICAgICAgICAgICAgICBkZWxldGUgZGIuc2Vzc2lvbnNbdG9rZW5dO1xuICAgICAgICAgICAgICBzYXZlRGIoZGIpO1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW1NFUlZFUiBXZWJBdXRobl0gU2Vzc2lvbiBsb2dnZWQgb3V0OiAke3Rva2VufWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHNlbmRKc29uKHJlcywgeyBzdWNjZXNzOiB0cnVlIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBuZXh0KCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbTG9jYWwgRGV2IFdlYkF1dGhuXSBTZXJ2ZXIgZXJyb3I6XCIsIGVycik7XG4gICAgICAgICAgcmV0dXJuIHNlbmRKc29uKHJlcywgeyBlcnJvcjogXCJzZXJ2ZXJfZXJyb3JcIiwgbWVzc2FnZTogZXJyPy5tZXNzYWdlIH0sIDUwMCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0sXG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpLCB3ZWJhdXRobkRldlBsdWdpbigpXSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFpUixTQUFTLG9CQUFvQjtBQUM5UyxPQUFPLFdBQVc7QUFDbEIsT0FBTyxRQUFRO0FBQ2YsT0FB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
