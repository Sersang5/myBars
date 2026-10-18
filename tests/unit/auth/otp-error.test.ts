import { describe, expect, it } from "vitest";
import { otpSendErrorMessage } from "@/lib/auth/otp-error";

describe("otpSendErrorMessage", () => {
  it("explains an email with no account (signups are disabled)", () => {
    expect(otpSendErrorMessage({ code: "otp_disabled", message: "Signups not allowed for otp" })).toMatch(/no tiene cuenta/);
    expect(otpSendErrorMessage({ message: "Signups not allowed for otp" })).toMatch(/no tiene cuenta/);
  });

  it("explains the email rate limit", () => {
    expect(otpSendErrorMessage({ code: "over_email_send_rate_limit", status: 429 })).toMatch(/Demasiados/);
    expect(otpSendErrorMessage({ status: 429 })).toMatch(/Demasiados/);
  });

  it("explains an SMTP failure", () => {
    expect(otpSendErrorMessage({ message: "Error sending magic link email", status: 500 })).toMatch(/servidor de correo/);
  });

  it("falls back to a generic message with the raw reason", () => {
    expect(otpSendErrorMessage({ message: "boom" })).toBe("No se pudo enviar el enlace (boom). Inténtalo de nuevo.");
    expect(otpSendErrorMessage(null)).toBe("No se pudo enviar el enlace. Inténtalo de nuevo.");
  });
});
