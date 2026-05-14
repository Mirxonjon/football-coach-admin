"use client";
import { useEffect, useRef, useState } from "react";

type GoogleCredentialResponse = { credential?: string };

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string;
    callback: (r: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    ux_mode?: "popup" | "redirect";
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (
    el: HTMLElement,
    opts: {
      type?: "standard" | "icon";
      theme?: "outline" | "filled_blue" | "filled_black";
      size?: "small" | "medium" | "large";
      text?: "signin_with" | "signup_with" | "continue_with" | "signin";
      shape?: "rectangular" | "pill" | "circle" | "square";
      width?: number | string;
      locale?: string;
    }
  ) => void;
  prompt: (cb?: (n: unknown) => void) => void;
  disableAutoSelect: () => void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
    __gsiLoaded?: boolean;
  }
}

const GSI_SRC = "https://accounts.google.com/gsi/client";

function loadGoogleScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.__gsiLoaded && window.google?.accounts?.id) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GSI_SRC}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("GSI yuklab bo'lmadi"))
      );
      return;
    }
    const s = document.createElement("script");
    s.src = GSI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => {
      window.__gsiLoaded = true;
      resolve();
    };
    s.onerror = () => reject(new Error("GSI yuklab bo'lmadi"));
    document.head.appendChild(s);
  });
}

export function GoogleSignInButton({
  onCredential,
  autoSelect = true,
  disabled = false,
}: {
  onCredential: (idToken: string) => void;
  autoSelect?: boolean;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) {
      setErr(
        "NEXT_PUBLIC_GOOGLE_CLIENT_ID .env faylda sozlanmagan"
      );
      return;
    }
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !ref.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (r) => {
            if (r.credential) onCredential(r.credential);
          },
          auto_select: autoSelect,
          ux_mode: "popup",
          cancel_on_tap_outside: false,
        });
        window.google.accounts.id.renderButton(ref.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "rectangular",
          width: 320,
          locale: "uz",
        });
        if (autoSelect) {
          // One Tap — returning users get signed in without clicking
          window.google.accounts.id.prompt();
        }
      })
      .catch((e: Error) => !cancelled && setErr(e.message));

    return () => {
      cancelled = true;
    };
  }, [clientId, onCredential, autoSelect]);

  if (err) {
    return (
      <p className="text-center text-xs text-[var(--destructive)]">{err}</p>
    );
  }

  return (
    <div
      ref={ref}
      aria-disabled={disabled}
      className={disabled ? "pointer-events-none opacity-50" : undefined}
    />
  );
}
