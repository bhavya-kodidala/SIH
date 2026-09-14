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
 * Invokes a WebAuthn Edge Function on Supabase.
 *
 * All WebAuthn operations are handled by the deployed
 * Supabase Edge Functions.
 */
export async function invokeEdgeFunction(fnName, body) {
  const { data, error } = await supabase.functions.invoke(fnName, {
    body,
  });

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

    const err = new Error(
      serverError ||
        error.message ||
        "Failed to invoke edge function"
    );

    err.serverError = serverError;
    err.context = error.context;

    throw err;
  }

  return data;
}