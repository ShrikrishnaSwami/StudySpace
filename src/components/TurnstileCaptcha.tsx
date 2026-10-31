"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { TURNSTILE_SITE_KEY } from "@/lib/security-config";

declare global {
  interface Window {
    turnstile?: {
      ready: (callback: () => void) => void;
      render: (container: HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        "expired-callback"?: () => void;
        "error-callback"?: () => void;
        theme?: "light" | "dark" | "auto";
      }) => string;
      remove: (widgetId: string) => void;
    };
  }
}

export default function TurnstileCaptcha({ onToken }: { onToken: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  onTokenRef.current = onToken;

  const renderWidget = useCallback(() => {
    const turnstile = window.turnstile;
    const container = containerRef.current;
    if (!turnstile || !container || widgetIdRef.current) return;

    turnstile.ready(() => {
      if (!containerRef.current || widgetIdRef.current || !window.turnstile) return;
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "dark",
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(""),
          "error-callback": () => {
            onTokenRef.current("");
            setStatus("error");
          },
        });
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    });
  }, []);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) {
      setStatus("error");
      return;
    }

    const timeout = window.setTimeout(() => {
      if (!widgetIdRef.current) setStatus("error");
    }, 20000);

    // The script is loaded by next/script below. This effect only owns cleanup
    // and the safety timeout; onReady handles both first load and cached loads.
    return () => {
      window.clearTimeout(timeout);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  if (!TURNSTILE_SITE_KEY) {
    return <p role="alert" className="text-xs leading-5 text-amber-200/80">Bot protection is not configured. Please contact the StudySpace administrator.</p>;
  }

  return (
    <div className="min-h-[76px] space-y-2" aria-live="polite">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={renderWidget}
        onError={() => setStatus("error")}
      />
      <div ref={containerRef} className="min-h-[66px]" aria-label="Bot protection challenge" />
      {status === "loading" && <p className="text-xs text-zinc-500">Loading bot protection…</p>}
      {status === "error" && (
        <p role="alert" className="text-xs leading-5 text-red-300">
          Bot protection could not load. Check whether your browser or network is blocking challenges.cloudflare.com, then refresh the page.
        </p>
      )}
    </div>
  );
}
