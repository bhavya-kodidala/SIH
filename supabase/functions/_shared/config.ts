// WebAuthn configuration for RakshaNet
// RP_ID has no scheme or port — just the hostname (e.g. "localhost" or "rakshanet.app").
export const RP_NAME = "RakshaNet";
export const RP_ID = Deno.env.get("WEBAUTHN_RP_ID") ?? "localhost";

const defaultOrigin = Deno.env.get("WEBAUTHN_ORIGIN") ?? "http://localhost:5173";

export const ALLOWED_ORIGINS = [
  defaultOrigin,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

export function getExpectedOrigin(req: Request): string | string[] {
  const originHeader = req.headers.get("origin");
  if (originHeader && ALLOWED_ORIGINS.includes(originHeader)) {
    return originHeader;
  }
  return ALLOWED_ORIGINS;
}
