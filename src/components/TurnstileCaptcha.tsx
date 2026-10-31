"use client";

import { useEffect, useRef, useState } from "react";
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
  const onTokenRef = useRef(onToken);
  const widgetIdRef = useRef<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  onTokenRef.current = onToken;

  useEffect(() => {
    const siteKey = TURNSTILE_SITE_KEY;
    if (!siteKey || !containerRef.current) {
      setStatus("error");
      return;
    }

    let disposed = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let script = document.querySelector<HTMLScriptElement>('script[data-studyspace-turnstile="true"]');

    const renderWidget = () => {
      if (disposed || !window.turnstile || !containerRef.current || widgetIdRef.current) return;
      window.turnstile.ready(() => {
        if (disposed || !window.turnstile || !containerRef.current || widgetIdRef.current) return;
        try {
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme: "dark",
            callback: (token) => onTokenRef.current(token),
            "expired-callback": () => onTokenRef.current(""),
            "error-callback": () => onTokenRef.current(""),
          });
          setStatus("ready");
        } catch {
          setStatus("error");
        }
      });
    };

    const handleScriptError = () => setStatus("error");

    if (!script) {
      script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.studyspaceTurnstile = "true";
      script.addEventListener("error", handleScriptError);
      document.head.appendChild(script);
    } else {
      script.addEventListener("error", handleScriptError);
    }

    // Polling also covers the case where another render inserted the script
    // and it finished loading before this component attached its load listener.
    intervalId = setInterval(() => {
      if (window.turnstile) {
        renderWidget();
        if (widgetIdRef.current) {
          if (intervalId) clearInterval(intervalId);
          if (timeoutId) clearTimeout(timeoutId);
        }
      }
    }, 150);

    timeoutId = setTimeout(() => {
      if (!window.turnstile && !disposed) setStatus("error");
      if (intervalId) clearInterval(intervalId);
    }, 15000);

    script.addEventListener("load", renderWidget);
    renderWidget();

    return () => {
      disposed = true;
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
      script?.removeEventListener("load", renderWidget);
      script?.removeEventListener("error", handleScriptError);
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
      <div ref={containerRef} className="min-h-[66px]" aria-label="Bot protection challenge" />
      {status === "loading" && (
        <p className="text-xs text-zinc-500">Loading bot protection…</p>
      )}
      {status === "error" && (
        <p role="alert" className="text-xs leading-5 text-red-300">
          Bot protection could not load. Refresh the page or check whether your browser or network is blocking challenges.cloudflare.com.
        </p>
      )}
    </div>
  );
}
