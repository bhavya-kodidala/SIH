import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[RakshaNet] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. " +
      "Check your .env file to ensure your Supabase project URL and anon key are present."
  );
}

// Client holds only the public anon key.
// Privileged operations are performed via Edge Functions.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder"
);

/**
 * Invokes a WebAuthn Edge Function.
 *
 * In development (localhost / 127.0.0.1), requests go directly to the local
 * Vite middleware at /functions/v1/<fnName> — the Supabase SDK always routes
 * to the remote Supabase Cloud URL and would bypass the local dev server.
 *
 * In production, the Supabase SDK is used as normal.
 */
export async function invokeEdgeFunction(fnName, body) {
  const isLocalDev =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  if (isLocalDev) {
    // Direct fetch to the local Vite middleware — avoids the Supabase SDK
    // routing to remote Supabase Cloud.
    const url = `/functions/v1/${fnName}`;
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (networkErr) {
      const err = new Error(`Network error reaching local dev server: ${networkErr.message}`);
      err.serverError = "network_error";
      throw err;
    }

    let data;
    try {
      data = await res.json();
    } catch {
      const err = new Error(`Local dev server returned non-JSON response (HTTP ${res.status})`);
      err.serverError = "invalid_response";
      throw err;
    }

    if (!res.ok) {
      const err = new Error(data?.message || data?.error || `HTTP ${res.status} from local dev server`);
      err.serverError = data?.error || data?.message;
      err.statusCode = res.status;
      throw err;
    }

    return data;
  }

  // Production path: use the Supabase SDK which routes to Supabase Cloud.
  const { data, error } = await supabase.functions.invoke(fnName, { body });

  if (error) {
    let serverError;
    try {
      if (error.context && typeof error.context.json === "function") {
        const parsed = await error.context.json();
        serverError = parsed?.error || parsed?.message;
      }
    } catch {
      /* non-json response */
    }

    const err = new Error(serverError || error.message || "Failed to invoke edge function");
    err.serverError = serverError;
    err.context = error.context;
    throw err;
  }

  return data;
}