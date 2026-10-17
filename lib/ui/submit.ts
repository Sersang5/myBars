export const SAVE_FAILED = "No se pudo guardar. Inténtalo de nuevo.";

/** Runs a form submit; a thrown action (e.g. network failure) becomes a retryable error message. */
export async function safeSubmit(fn: () => Promise<string | null>): Promise<string | null> {
  try {
    return await fn();
  } catch {
    return SAVE_FAILED;
  }
}
