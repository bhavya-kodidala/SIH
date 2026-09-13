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

// Client holds only the public anon key. Privileged operations are performed via Edge Functions.
export const supabase = createClient(supabaseUrl || "https://placeholder.supabase.co", supabaseAnonKey || "placeholder");

/**
 * Invokes a WebAuthn Edge Function.
 * In development, if remote Supabase Edge Functions return 404 (not deployed yet),
 * it seamlessly routes to the local Vite WebAuthn endpoint.
 */
export async function invokeEdgeFunction(fnName, body) {
  const isLocalHost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "[::1]");

  // In local dev, first try the local Vite dev server endpoint if running on localhost
  if (isLocalHost) {
    try {
      const localRes = await fetch(`/functions/v1/${fnName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify(body),
      });

      if (localRes.ok) {
        return await localRes.json();
      }

      const errData = await localRes.json().catch(() => ({}));
      if (errData?.error) {
        const error = new Error(errData.error);
        error.serverError = errData.error;
        error.statusCode = localRes.status;
        throw error;
      }
    } catch (localErr) {
      if (localErr.serverError) throw localErr;
      // If local dev server didn't handle it, fall through to supabase client
    }
  }

  // Remote Supabase Edge Function invocation
  const { data, error } = await supabase.functions.invoke(fnName, { body });

  if (error) {
    let serverError;
    try {
      if (error.context && typeof error.context.json === "function") {
        const parsed = await error.context.json();
        serverError = parsed?.error || parsed?.message;
      }
    } catch {
      /* non-json */
    }

    const err = new Error(serverError || error.message || "Failed to invoke edge function");
    err.serverError = serverError;
    err.context = error.context;
    throw err;
  }

  return data;
}
