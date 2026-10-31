"use client";

import { useEffect, useRef, useState } from "react";
import { TURNSTILE_SITE_KEY } from "@/lib/security-config";

declare global {
  interface Window {
    turnstile?: {
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
  const [loadError, setLoadError] = useState(false);
  onTokenRef.current = onToken;
  const siteKey = TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    let script = document.querySelector<HTMLScriptElement>('script[data-studyspace-turnstile="true"]');
    let disposed = false;

    const render = () => {
      if (disposed || !window.turnstile || !containerRef.current || widgetIdRef.current) return;
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "dark",
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(""),
          "error-callback": () => onTokenRef.current(""),
        });
        setLoadError(false);
      } catch {
        setLoadError(true);
      }
    };
    const handleScriptError = () => setLoadError(true);

    if (window.turnstile) {
      render();
    } else {
      if (!script) {
        script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.dataset.studyspaceTurnstile = "true";
        document.head.appendChild(script);
      }
      script.addEventListener("load", render);
      script.addEventListener("error", handleScriptError);
    }

    return () => {
      disposed = true;
      script?.removeEventListener("load", render);
      script?.removeEventListener("error", handleScriptError);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  if (!siteKey) {
    return <p role="alert" className="text-xs leading-5 text-amber-200/80">Bot protection is not configured. Please contact the StudySpace administrator.</p>;
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="min-h-[66px]" aria-label="Bot protection challenge" />
      {loadError && (
        <p role="alert" className="text-xs leading-5 text-red-300">
          Bot protection could not load. Check your connection or browser content blocker, then reload this page.
        </p>
      )}
    </div>
  );
}
