"use client";

import { useEffect, useRef } from "react";

const TARGETS = [
  "main h1",
  "main h2",
  "main h3",
  "main section > p",
  "main section > div > p:first-child",
  "main [data-motion-card]",
  ".atelier-shell .atelier-main [class*='rounded-2xl'][class*='border']:not(button):not(a)",
  ".atelier-shell .atelier-main [class*='rounded-xl'][class*='border']:not(button):not(a)",
];

function shouldSkip(element: HTMLElement) {
  return Boolean(
    element.closest(
      [
        "[data-ss-motion-ignore]",
        "[aria-live]",
        "[contenteditable='true']",
        "form",
        ".ss-neural-tutor",
        ".ss-chat-messages",
        ".ss-message-content",
        ".ss-streaming-response",
        "textarea",
        "input",
        "select",
        "button",
        "a",
      ].join(","),
    ),
  );
}

export default function SiteMotion() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      root.querySelectorAll<HTMLElement>("[data-ss-motion-pending]").forEach((node) => {
        node.classList.add("ss-motion-visible");
        node.removeAttribute("data-ss-motion-pending");
      });
      return;
    }

    const observed = new WeakSet<Element>();
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const element = entry.target as HTMLElement;
          element.classList.add("ss-motion-visible");
          element.removeAttribute("data-ss-motion-pending");
          revealObserver.unobserve(element);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -7% 0px" },
    );

    const scan = (scope: ParentNode) => {
      TARGETS.forEach((selector) => {
        scope.querySelectorAll<HTMLElement>(selector).forEach((element) => {
          if (observed.has(element) || shouldSkip(element)) return;
          observed.add(element);
          element.classList.add("ss-motion-reveal");
          element.setAttribute("data-ss-motion-pending", "true");
          revealObserver.observe(element);
        });
      });
      if (scope instanceof HTMLElement && scope.matches(TARGETS.join(",")) && !observed.has(scope) && !shouldSkip(scope)) {
        observed.add(scope);
        scope.classList.add("ss-motion-reveal");
        scope.setAttribute("data-ss-motion-pending", "true");
        revealObserver.observe(scope);
      }
    };

    scan(root);
    const mutationObserver = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) scan(node);
        });
      });
    });
    mutationObserver.observe(root, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      revealObserver.disconnect();
    };
  }, []);

  return <div ref={rootRef} className="ss-motion-root" style={{ display: "contents" }}>{/* Motion is applied to eligible page text as it enters view. */}</div>;
}
