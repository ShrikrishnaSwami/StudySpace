"use client";

import { useEffect } from "react";

export default function MotionSystem() {
  useEffect(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    root.classList.add("motion-ready");

    const revealSelectors = [
      ".atelier-opening-center",
      ".atelier-manifesto",
      ".atelier-chapter-copy",
      ".atelier-index-art",
      ".atelier-ritual-art",
      ".atelier-record-art",
      ".atelier-closing",
      ".atelier-footer",
      ".fr-hero-copy",
      ".fr-product-stage",
      ".fr-hero-footnote",
      ".fr-logo-strip",
      ".fr-section-intro",
      ".fr-feature-card",
      ".fr-how-heading",
      ".fr-steps article",
      ".fr-bottom-cta",
      ".fr-footer",
      ".ss-tool-card",
      ".ss-feature-item",
      ".ss-bottom-banner",
      ".ss-note-card",
      ".ss-shell main > section",
      ".ss-shell main > div > section",
      ".ss-shell main .rounded-2xl.border",
      ".ss-shell main .rounded-xl.border",
    ];

    const observed = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("motion-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -7% 0px" },
    );

    const prepare = (scope: ParentNode = document) => {
      revealSelectors.forEach((selector) => {
        scope.querySelectorAll(selector).forEach((element) => {
          if (observed.has(element)) return;
          observed.add(element);
          element.classList.add("motion-reveal");
          observer.observe(element);
        });
      });

      document.querySelectorAll(".fr-feature-grid, .fr-steps").forEach((group) => {
        Array.from(group.children).forEach((child, index) => {
          (child as HTMLElement).style.setProperty("--motion-index", String(index));
        });
      });
    };

    prepare();

    const mutationObserver = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) prepare(node);
        });
      });
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    let frame = 0;
    const updateScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const progress = max > 0 ? window.scrollY / max : 0;
        root.style.setProperty("--page-progress", String(progress));

        const stage = document.querySelector<HTMLElement>(".fr-product-stage");
        if (stage) {
          const rect = stage.getBoundingClientRect();
          const travel = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
          const bounded = Math.max(0, Math.min(1, travel));
          stage.style.setProperty("--stage-scroll", String(bounded));
        }
      });
    };
    window.addEventListener("scroll", updateScroll, { passive: true });
    updateScroll();

    const stage = document.querySelector<HTMLElement>(".fr-product-stage");
    let pointerFrame = 0;
    const onPointerMove = (event: PointerEvent) => {
      if (!stage || event.pointerType === "touch") return;
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
      pointerFrame = requestAnimationFrame(() => {
        const rect = stage.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        stage.style.setProperty("--pointer-x", String(x));
        stage.style.setProperty("--pointer-y", String(y));
      });
    };
    const onPointerLeave = () => {
      stage?.style.setProperty("--pointer-x", "0");
      stage?.style.setProperty("--pointer-y", "0");
    };
    stage?.addEventListener("pointermove", onPointerMove);
    stage?.addEventListener("pointerleave", onPointerLeave);

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("scroll", updateScroll);
      stage?.removeEventListener("pointermove", onPointerMove);
      stage?.removeEventListener("pointerleave", onPointerLeave);
      if (frame) cancelAnimationFrame(frame);
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
      root.classList.remove("motion-ready");
      root.style.removeProperty("--page-progress");
    };
  }, []);

  return null;
}
