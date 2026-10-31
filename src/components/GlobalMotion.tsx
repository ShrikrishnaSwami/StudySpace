"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type SplitRecord = {
  element: HTMLElement;
  html: string;
  ariaLabel: string | null;
};

function splitHeading(element: HTMLElement): HTMLElement[] {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.textContent?.trim()) nodes.push(node);
  }

  const chars: HTMLElement[] = [];
  nodes.forEach((node) => {
    const fragment = document.createDocumentFragment();
    Array.from(node.textContent ?? "").forEach((character) => {
      if (character === " ") {
        fragment.appendChild(document.createTextNode(" "));
        return;
      }
      const mask = document.createElement("span");
      const glyph = document.createElement("span");
      mask.className = "ss-motion-char-mask";
      mask.setAttribute("aria-hidden", "true");
      glyph.className = "ss-motion-char";
      glyph.textContent = character;
      mask.appendChild(glyph);
      fragment.appendChild(mask);
      chars.push(glyph);
    });
    node.parentNode?.replaceChild(fragment, node);
  });

  return chars;
}

function isMotionExcluded(element: HTMLElement) {
  return Boolean(element.closest([
    "form", "button", "a", "input", "textarea", "select",
    "[aria-live]", "[role='dialog']", "[contenteditable='true']",
    "[data-ss-motion-ignore]", ".ss-chat-messages", ".ss-streaming-response",
    ".ss-neural-tutor", ".ss-jarvis-chatlog",
  ].join(",")));
}

export default function GlobalMotion({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useGSAP((_, contextSafe) => {
    const root = containerRef.current;
    if (!root) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const main = root.querySelector<HTMLElement>("main");
    if (!main) return;

    // The landing and signed-in workspace already have dedicated cinematic
    // art direction. This shared layer handles every other route consistently.
    const hasDedicatedDirection = Boolean(main.closest(".ss-editorial, .atelier-home, .atelier-shell"));
    const splitRecords: SplitRecord[] = [];

    const headings = Array.from(main.querySelectorAll<HTMLElement>("h1, h2"))
      .filter((heading) => !isMotionExcluded(heading) && heading.textContent?.trim());

    headings.forEach((heading) => {
      const record = {
        element: heading,
        html: heading.innerHTML,
        ariaLabel: heading.getAttribute("aria-label"),
      };
      const chars = splitHeading(heading);
      if (!chars.length) return;
      splitRecords.push(record);
      if (!record.ariaLabel) heading.setAttribute("aria-label", heading.textContent ?? "");
      gsap.fromTo(chars,
        { yPercent: 118, rotateX: -58, autoAlpha: 0, willChange: "transform, opacity" },
        {
          yPercent: 0, rotateX: 0, autoAlpha: 1, duration: 0.82,
          stagger: { each: 0.018, from: "start" }, ease: "power4.out",
          clearProps: "willChange",
          scrollTrigger: { trigger: heading, start: "top 88%", once: true },
        },
      );
    });

    if (!hasDedicatedDirection) {
      const revealTargets = Array.from(main.querySelectorAll<HTMLElement>(
        ":scope > section, :scope > div > section, [data-motion-reveal], [data-motion-card]",
      )).filter((element) => !isMotionExcluded(element));
      revealTargets.forEach((element, index) => {
        gsap.fromTo(element,
          { y: 30, autoAlpha: 0, scale: 0.985, willChange: "transform, opacity" },
          {
            y: 0, autoAlpha: 1, scale: 1, duration: 0.8,
            delay: Math.min(index % 4, 3) * 0.055, ease: "power3.out",
            clearProps: "willChange",
            scrollTrigger: { trigger: element, start: "top 92%", once: true },
          },
        );
      });
    }

    // Cards use quickTo rather than creating a new tween on every pointer event.
    const tiltTargets = Array.from(root.querySelectorAll<HTMLElement>(
      "[data-motion-card], .ss-editorial-specimen, .ss-editorial-preview",
    )).filter((element) => !isMotionExcluded(element));

    const removeTiltListeners: Array<() => void> = [];
    tiltTargets.forEach((card) => {
      const rotateX = gsap.quickTo(card, "rotationX", { duration: 0.42, ease: "power3.out" });
      const rotateY = gsap.quickTo(card, "rotationY", { duration: 0.42, ease: "power3.out" });
      const onMove = contextSafe((event: PointerEvent) => {
        if (event.pointerType === "touch" || window.matchMedia("(max-width: 760px)").matches) return;
        const bounds = card.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        card.classList.add("ss-motion-tilting");
        rotateY(x * 5.5);
        rotateX(y * -5.5);
      });
      const onLeave = contextSafe(() => {
        rotateX(0);
        rotateY(0);
        card.classList.remove("ss-motion-tilting");
      });
      card.addEventListener("pointermove", onMove, { passive: true });
      card.addEventListener("pointerleave", onLeave);
      removeTiltListeners.push(() => {
        card.removeEventListener("pointermove", onMove);
        card.removeEventListener("pointerleave", onLeave);
        card.classList.remove("ss-motion-tilting");
      });
    });

    // CTAs use a restrained magnetic pull. quickTo keeps pointer movement
    // fluid without allocating a new tween for every mouse event.
    const actionTargets = Array.from(root.querySelectorAll<HTMLElement>(
      "main .ss-landing-primary, main .ss-landing-signup, main .ss-error-primary, main .ss-404-actions a",
    ));
    actionTargets.forEach((action) => {
      const xTo = gsap.quickTo(action, "x", { duration: 0.36, ease: "power3.out" });
      const yTo = gsap.quickTo(action, "y", { duration: 0.36, ease: "power3.out" });
      const rotateTo = gsap.quickTo(action, "rotationY", { duration: 0.36, ease: "power3.out" });
      const onMove = contextSafe((event: PointerEvent) => {
        if (event.pointerType === "touch" || window.matchMedia("(max-width: 760px)").matches) return;
        const bounds = action.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        action.classList.add("ss-motion-tilting");
        xTo(x * 7);
        yTo(y * 5);
        rotateTo(x * 2.8);
      });
      const onLeave = contextSafe(() => {
        xTo(0);
        yTo(0);
        rotateTo(0);
        action.classList.remove("ss-motion-tilting");
      });
      action.addEventListener("pointermove", onMove, { passive: true });
      action.addEventListener("pointerleave", onLeave);
      removeTiltListeners.push(() => {
        action.removeEventListener("pointermove", onMove);
        action.removeEventListener("pointerleave", onLeave);
        action.classList.remove("ss-motion-tilting");
      });
    });

    // A looping task-focus sequence makes the sample workspace feel active
    // without pretending to mutate real student data.
    const queueRows = Array.from(root.querySelectorAll<HTMLElement>(".ss-specimen-task"));
    if (queueRows.length > 1) {
      const queueTimeline = gsap.timeline({ repeat: -1, repeatDelay: 0.8 });
      queueRows.forEach((row) => {
        queueTimeline
          .to(row, { x: 6, duration: 0.22, ease: "power2.out" })
          .to(row, { x: 0, duration: 0.42, ease: "power3.out" });
      });
    }

    // Small status lights and marker strokes give live previews a little life.
    root.querySelectorAll<HTMLElement>("[data-live-pulse], .ss-specimen-marker").forEach((node, index) => {
      gsap.to(node, {
        scale: 1.22,
        boxShadow: "0 0 0 7px rgba(185,162,122,.11), 0 0 22px rgba(185,162,122,.2)",
        duration: 1.45 + (index % 3) * 0.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: index * 0.12,
      });
    });

    root.querySelectorAll<SVGPathElement>("svg [data-marker-path]").forEach((path) => {
      const length = path.getTotalLength();
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
      gsap.to(path, {
        strokeDashoffset: 0,
        duration: 1.1,
        ease: "power2.inOut",
        scrollTrigger: { trigger: path, start: "top 86%", once: true },
      });
    });

    // Low-amplitude parallax on selected decorative surfaces, never on forms
    // or text-heavy content, and never on touch/reduced-motion devices.
    if (!window.matchMedia("(max-width: 760px)").matches) {
      root.querySelectorAll<HTMLElement>("[data-motion-parallax], .atelier-shell .atelier-main > section, .atelier-shell .atelier-main > div > section, .ss-editorial-manifesto, .ss-editorial-method, .ss-editorial-closing").forEach((element) => {
        gsap.to(element, {
          yPercent: -4,
          ease: "none",
          scrollTrigger: {
            trigger: element,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.1,
          },
        });
      });
    }

    ScrollTrigger.refresh();

    return () => {
      removeTiltListeners.forEach((remove) => remove());
      splitRecords.forEach(({ element, html, ariaLabel }) => {
        element.innerHTML = html;
        if (ariaLabel === null) element.removeAttribute("aria-label");
        else element.setAttribute("aria-label", ariaLabel);
      });
    };
  }, { scope: containerRef, dependencies: [pathname], revertOnUpdate: true });

  return <div ref={containerRef} className="ss-motion-stage">{children}</div>;
}
