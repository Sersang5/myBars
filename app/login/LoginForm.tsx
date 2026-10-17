"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useState } from "react";

const LINK_ERROR =
  "No se pudo validar el enlace. Ábrelo en el mismo navegador donde lo pediste, o usa el código de 6 dígitos.";

function browserSupabase() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export function LoginForm({ linkError }: { linkError: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await browserSupabase().auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: false,
      },
    });
    setState(error ? "error" : "sent");
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setCodeError(null);
    try {
      const { error } = await browserSupabase().auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "email",
      });
      if (error) {
        setCodeError("Código no válido o caducado.");
        return;
      }
      router.replace("/bars");
    } catch {
      setCodeError("No se pudo comprobar el código. Inténtalo de nuevo.");
    } finally {
      setVerifying(false);
    }
  }

  const input = "min-h-11 rounded border px-3 py-2";
  const button = "min-h-11 rounded bg-black px-3 py-2 text-white disabled:opacity-50";
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">MyBars</h1>
      {linkError && state === "idle" && (
        <p role="alert" className="text-red-600">
          {LINK_ERROR}
        </p>
      )}
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          autoComplete="email"
          aria-label="Email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={input}
        />
        <button type="submit" disabled={state === "sending"} className={button}>
          Enviar enlace
        </button>
      </form>
      {state === "error" && <p role="alert">No se pudo enviar el enlace. Inténtalo de nuevo.</p>}
      {state === "sent" && (
        <>
          <p>Revisa tu correo: abre el enlace o escribe el código.</p>
          <form onSubmit={onVerify} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span>Código del correo</span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={input}
              />
            </label>
            <button type="submit" disabled={verifying} className={button}>
              Entrar
            </button>
          </form>
          {codeError && <p role="alert">{codeError}</p>}
        </>
      )}
    </main>
  );
}
