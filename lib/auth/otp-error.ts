type OtpError = { code?: string; status?: number; message?: string } | null | undefined;

/** User-facing (Spanish) reason why `signInWithOtp` could not send the magic link. */
export function otpSendErrorMessage(error: OtpError): string {
  const message = error?.message ?? "";
  if (error?.code === "otp_disabled" || /signups not allowed/i.test(message)) {
    return "Ese email no tiene cuenta en MyBars. Revisa que esté bien escrito (debe ser el de ALLOWED_EMAIL y existir en Supabase > Authentication > Users).";
  }
  if (error?.code === "over_email_send_rate_limit" || error?.status === 429) {
    return "Demasiados correos pedidos seguidos. Espera un rato o usa el código del último correo.";
  }
  if (/sending .*email/i.test(message)) {
    return "Supabase no pudo enviar el correo (revisa el servidor de correo / SMTP en Supabase).";
  }
  return message ? `No se pudo enviar el enlace (${message}). Inténtalo de nuevo.` : "No se pudo enviar el enlace. Inténtalo de nuevo.";
}
