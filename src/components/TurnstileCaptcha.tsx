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

const SCRIPT_ID = "studyspace-cloudflare-turnstile";
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export default function TurnstileCaptcha({ onToken }: { onToken: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) {
      setStatus("error");
      return;
    }

    let disposed = false;
    let widgetId: string | null = null;
    let intervalId: number | undefined;
    let timeoutId: number | undefined;

    const fail = () => {
      if (disposed) return;
      setStatus("error");
      onTokenRef.current("");
    };

    // Cloudflare's ready() API throws when its script is loaded with async/defer.
    // The explicit-render API is available as soon as window.turnstile exists,
    // so render directly instead of invoking ready().
    const render = () => {
      if (disposed || widgetId || !window.turnstile || !containerRef.current) return;

      try {
        const api = window.turnstile;
        widgetId = api.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "dark",
          callback: (token) => {
            if (!disposed) onTokenRef.current(token);
          },
          "expired-callback": () => onTokenRef.current(""),
          "error-callback": fail,
        });
        if (widgetId) setStatus("ready");
        else fail();
      } catch {
        fail();
      }
    };

    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onerror = fail;
      document.head.appendChild(script);
    } else {
      existingScript.addEventListener("error", fail, { once: true });
    }

    // Handles cached scripts, late execution, and SPA navigation without
    // calling turnstile.ready(), which is incompatible with async/defer.
    render();
    intervalId = window.setInterval(() => {
      render();
      if (widgetId && intervalId) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    }, 150);

    timeoutId = window.setTimeout(() => {
      if (!widgetId) fail();
    }, 12000);

    return () => {
      disposed = true;
      if (intervalId) window.clearInterval(intervalId);
      if (timeoutId) window.clearTimeout(timeoutId);
      if (widgetId && window.turnstile) {
        try { window.turnstile.remove(widgetId); } catch { /* widget may already be removed */ }
      }
    };
  }, []);

  if (!TURNSTILE_SITE_KEY) {
    return <p role="alert" className="text-xs leading-5 text-amber-200/80">Bot protection is not configured. Please contact the StudySpace administrator.</p>;
  }

  return (
    <div className="min-h-[76px] space-y-2" aria-live="polite">
      <div ref={containerRef} className="min-h-[66px]" aria-label="Bot protection challenge" />
      {status === "loading" && <p className="text-xs text-zinc-500">Loading bot protection…</p>}
      {status === "error" && (
        <p role="alert" className="text-xs leading-5 text-red-300">
          Bot protection could not load. Allow challenges.cloudflare.com in your browser or network settings and reload this page.
        </p>
      )}
    </div>
  );
}
