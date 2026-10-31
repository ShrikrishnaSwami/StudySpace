"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { usePathname } from "next/navigation";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import Lenis from "lenis";

gsap.registerPlugin(useGSAP, ScrollTrigger, CustomEase);

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p = p * 2.03 + 17.1;
      amplitude *= 0.5;
    }
    return value;
  }
  void main() {
    vec2 uv = vUv;
    vec2 centered = (uv - 0.5) * vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
    float time = uTime * 0.035;
    vec2 drift = uPointer * 0.045;
    float cloudA = fbm(centered * 2.1 + vec2(time, -time * 0.7) + drift);
    float cloudB = fbm(centered * 3.8 - vec2(time * 0.55, time * 0.3) - drift);
    float mist = smoothstep(0.28, 0.82, cloudA * 0.72 + cloudB * 0.36);
    float halo = exp(-length(centered - vec2(-0.23, 0.1)) * 2.2);
    float halo2 = exp(-length(centered - vec2(0.42, -0.28)) * 2.8);
    vec3 base = vec3(0.035, 0.033, 0.028);
    vec3 bronze = vec3(0.22, 0.17, 0.105);
    vec3 warm = vec3(0.34, 0.27, 0.17);
    vec3 color = base;
    color += bronze * mist * 0.42;
    color += warm * halo * (0.12 + mist * 0.2);
    color += bronze * halo2 * 0.18;
    float grain = hash(uv * uResolution + uTime) - 0.5;
    color += grain * 0.012;
    float vignette = smoothstep(1.15, 0.18, length(centered * vec2(0.82, 1.0)));
    color *= 0.68 + vignette * 0.32;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export default function CinematicExperience({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP(() => {}, { scope: rootRef, dependencies: [pathname], revertOnUpdate: true });

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    

    // Route changes get a real full-screen editorial wipe. This node is
    // created only after hydration, so it cannot alter server-rendered markup.
    const routeCurtain = document.createElement("div");
    routeCurtain.className = "ss-route-curtain";
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.body.appendChild(routeCurtain);
      routeCurtain.addEventListener("animationend", () => routeCurtain.remove(), { once: true });
    }
    const boot = contextSafe(async () => {
      try {
        if (disposed) return;

        if (CustomEase) CustomEase.create("atelier-weight", "0.22, 1, 0.36, 1");
        const premiumEase = CustomEase ? "atelier-weight" : "power3.out";

        const canvas = document.querySelector<HTMLCanvasElement>("#studyspace-atmosphere");
        let renderer: THREE.WebGLRenderer;
        let scene: THREE.Scene;
        let camera: THREE.Camera;
        let material: THREE.ShaderMaterial;
        let particleGeometry: THREE.BufferGeometry;
        let particleMaterial: THREE.PointsMaterial;
        let particleScene: THREE.Scene;
        let particleCamera: THREE.PerspectiveCamera;
        let particles: THREE.Points;
        let frame = 0;
        let pointerX = 0;
        let pointerY = 0;
        let targetX = 0;
        let targetY = 0;
        const interactionCleanups: Array<() => void> = [];

        if (canvas && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          try {
            renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "low-power" });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
            renderer.setSize(window.innerWidth, window.innerHeight, false);
            scene = new THREE.Scene();
            camera = new THREE.Camera();
            const geometry = new THREE.PlaneGeometry(2, 2);
            material = new THREE.ShaderMaterial({
              vertexShader,
              fragmentShader,
              uniforms: {
                uTime: { value: 0 },
                uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                uPointer: { value: new THREE.Vector2(0, 0) },
              },
              depthWrite: false,
              depthTest: false,
            });
            scene.add(new THREE.Mesh(geometry, material));

            // A real 3D particle field layered over the atmospheric shader.
            // The deterministic distribution avoids random render-time output.
            particleScene = new THREE.Scene();
            particleCamera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 120);
            particleCamera.position.z = 27;
            const particleCount = window.innerWidth < 700 ? 560 : 1450;
            const particlePositions = new Float32Array(particleCount * 3);
            const particleSizes = new Float32Array(particleCount);
            for (let i = 0; i < particleCount; i++) {
              const seed = i + 1;
              const randomA = Math.abs(Math.sin(seed * 127.1) * 43758.5453) % 1;
              const randomB = Math.abs(Math.sin(seed * 311.7) * 24634.6345) % 1;
              const randomC = Math.abs(Math.sin(seed * 74.7) * 56445.234) % 1;
              particlePositions[i * 3] = (randomA - 0.5) * 46;
              particlePositions[i * 3 + 1] = (randomB - 0.5) * 29;
              particlePositions[i * 3 + 2] = (randomC - 0.5) * 34;
              particleSizes[i] = 0.5 + randomC * 1.8;
            }
            particleGeometry = new THREE.BufferGeometry();
            particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
            particleGeometry.setAttribute("aSize", new THREE.BufferAttribute(particleSizes, 1));
            particleMaterial = new THREE.PointsMaterial({
              color: new THREE.Color("#b9a27a"),
              size: window.innerWidth < 700 ? 0.16 : 0.22,
              transparent: true,
              opacity: 0.68,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
              sizeAttenuation: true,
            });
            particles = new THREE.Points(particleGeometry, particleMaterial);
            particleScene.add(particles);
            renderer.autoClear = false;

            const resize = () => {
              renderer.setSize(window.innerWidth, window.innerHeight, false);
              material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
              particleCamera.aspect = window.innerWidth / window.innerHeight;
              particleCamera.updateProjectionMatrix();
            };
            const move = (event: PointerEvent) => {
              if (event.pointerType === "touch") return;
              targetX = (event.clientX / window.innerWidth - 0.5) * 2;
              targetY = (event.clientY / window.innerHeight - 0.5) * -2;
            };
            const render = (time: number) => {
              pointerX += (targetX - pointerX) * 0.025;
              pointerY += (targetY - pointerY) * 0.025;
              material.uniforms.uTime.value = time * 0.001;
              material.uniforms.uPointer.value.set(pointerX, pointerY);
              if (particles) {
                particles.rotation.y += (targetX * 0.16 + Math.sin(time * 0.00012) * 0.035 - particles.rotation.y) * 0.018;
                particles.rotation.x += (targetY * 0.12 + Math.cos(time * 0.0001) * 0.025 - particles.rotation.x) * 0.018;
                particles.rotation.z = Math.sin(time * 0.00008) * 0.045;
                particles.position.y = Math.sin(time * 0.00018) * 0.42;
                particles.position.x = Math.cos(time * 0.00013) * 0.28;
              }
              renderer.clear();
              renderer.render(scene, camera);
              renderer.render(particleScene, particleCamera);
              frame = window.requestAnimationFrame(render);
            };
            window.addEventListener("resize", resize);
            window.addEventListener("pointermove", move, { passive: true });
            frame = window.requestAnimationFrame(render);
            cleanup = () => {
              window.removeEventListener("resize", resize);
              window.removeEventListener("pointermove", move);
              window.cancelAnimationFrame(frame);
              geometry.dispose();
              material.dispose();
              particleGeometry?.dispose();
              particleMaterial?.dispose();
              renderer.dispose();
            };
          } catch (webglError) {
            console.warn("WebGL atmosphere unavailable; continuing with motion and smooth scrolling.", webglError);
          }
        }

        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let lenis: Lenis | undefined;
        let lenisFrame: ((time: number) => void) | undefined;
        if (!reduceMotion) {
          lenis = new Lenis({
            duration: 1.18,
            smoothWheel: true,
            wheelMultiplier: 0.88,
            touchMultiplier: 1.15,
            anchors: true,
          });
          lenis.on("scroll", () => ScrollTrigger.update());
          const activeLenis = lenis;
          lenisFrame = (time: number) => activeLenis.raf(time * 1000);
          gsap.ticker.add(lenisFrame);
          gsap.ticker.lagSmoothing(0);
        }

        const context = gsap.context(() => {
          if (!reduceMotion) {
            // The first viewport gets a deliberate entrance sequence. It is
            // not dependent on ScrollTrigger, so it always plays on page load.
            const intro = gsap.timeline({ defaults: { ease: premiumEase } });
            intro
              .fromTo(".atelier-header", { y: -18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.75 })
              .fromTo(".atelier-opening-meta", { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.65 }, "-=0.35")
              .fromTo(".atelier-opening-center .atelier-overline", { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.65 }, "-=0.25")
              .fromTo(".atelier-opening-center h1", { y: 48, autoAlpha: 0, filter: "blur(9px)" }, { y: 0, autoAlpha: 1, filter: "blur(0px)", duration: 1.15 }, "-=0.3")
              .fromTo(".atelier-opening-copy", { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8 }, "-=0.55")
              .fromTo(".atelier-opening-center .atelier-primary", { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7 }, "-=0.45")
              .fromTo(".atelier-opening-note, .atelier-opening-bottom", { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.65 }, "-=0.35");

            // Reveal each chapter's content independently. Avoid animating a
            // parent section and its children simultaneously; that can leave
            // nested elements hidden or make the reveal imperceptible.
            gsap.utils.toArray<HTMLElement>(".atelier-manifesto, .atelier-chapter, .atelier-closing").forEach((section: HTMLElement) => {
              const pieces = section.querySelectorAll(
                ".atelier-overline, h2, .atelier-body-copy, .atelier-feature-list li, .atelier-text-link, .atelier-chapter-heading, .atelier-index-art, .atelier-ritual-art, .atelier-record-art, .atelier-closing-note, .atelier-primary",
              );
              if (!pieces.length) return;
              gsap.fromTo(pieces,
                { y: 30, autoAlpha: 0, filter: "blur(5px)" },
                {
                  y: 0, autoAlpha: 1, filter: "blur(0px)", duration: 0.9,
                  stagger: 0.075, ease: premiumEase, immediateRender: false,
                  scrollTrigger: {
                    trigger: section,
                    start: "top 78%",
                    once: true,
                  },
                },
              );
            });

            gsap.utils.toArray<HTMLElement>(".atelier-home .atelier-index-art, .atelier-home .atelier-ritual-art, .atelier-home .atelier-record-art").forEach((art: HTMLElement, index) => {
              const chapter = art.closest(".atelier-chapter");
              const direction = index % 2 === 0 ? -1 : 1;
              gsap.fromTo(art,
                { scale: 0.78, rotateY: direction * 13, rotateX: 5, y: 110, transformPerspective: 1200 },
                {
                  scale: 1, rotateY: 0, rotateX: 0, y: -45,
                  ease: "none",
                  scrollTrigger: {
                    trigger: chapter || art,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 1.25,
                  },
                },
              );
              gsap.to(art, {
                boxShadow: "0 55px 130px rgba(0,0,0,.42)",
                ease: "none",
                scrollTrigger: { trigger: chapter || art, start: "top 75%", end: "center center", scrub: 1 },
              });
            });

            // Large editorial typography moves through a real scroll timeline,
            // rather than receiving another small opacity-only reveal.
            gsap.utils.toArray<HTMLElement>(".atelier-manifesto h2, .atelier-chapter-copy h2, .atelier-closing h2").forEach((heading: HTMLElement) => {
              gsap.fromTo(heading,
                { scale: 0.82, y: 90, rotateX: -8, transformOrigin: "50% 100%", filter: "blur(8px)" },
                {
                  scale: 1, y: 0, rotateX: 0, filter: "blur(0px)", ease: "none",
                  scrollTrigger: { trigger: heading, start: "top 92%", end: "top 38%", scrub: 1.1 },
                },
              );
            });

            gsap.utils.toArray<HTMLElement>(".atelier-chapter-heading .atelier-chapter-rule").forEach((rule: HTMLElement) => {
              gsap.fromTo(rule, { scaleX: 0, transformOrigin: "left center" }, {
                scaleX: 1, ease: "none",
                scrollTrigger: { trigger: rule, start: "top 88%", end: "top 55%", scrub: 0.8 },
              });
            });

            // A cinematic color-and-scale passage between the opening and the
            // first chapter, driven by scroll rather than a timed fade.
            const opening = document.querySelector(".atelier-opening");
            if (opening) {
              gsap.to(opening, {
                scale: 0.92,
                borderRadius: "0 0 28px 28px",
                transformOrigin: "50% 0%",
                ease: "none",
                scrollTrigger: { trigger: opening, start: "top top", end: "bottom top", scrub: 1 },
              });
            }

            // Carry the cinematic language into the signed-in product:
            // page sections, data cards, stat blocks, tables and side navigation
            // receive the same depth, scale and staggered entrance treatment.
            const workspace = document.querySelector(".atelier-shell");
            if (workspace) {
              gsap.fromTo(".atelier-shell .ss-sidebar",
                { x: -42, autoAlpha: 0, filter: "blur(8px)" },
                { x: 0, autoAlpha: 1, filter: "blur(0px)", duration: 1.05, ease: premiumEase, delay: 0.12 },
              );
              gsap.fromTo(".atelier-shell .ss-topbar",
                { y: -28, autoAlpha: 0, filter: "blur(7px)" },
                { y: 0, autoAlpha: 1, filter: "blur(0px)", duration: 0.9, ease: premiumEase, delay: 0.2 },
              );

              const workspaceCards = gsap.utils.toArray<HTMLElement>(
                ".atelier-shell main [class*='rounded-2xl'], .atelier-shell main [class*='rounded-xl'], .atelier-shell main article, .atelier-shell main tr",
              ).filter((node: HTMLElement) =>
                  !node.closest("[role='dialog']") &&
                  !node.parentElement?.closest(
                    ".atelier-shell main [class*='rounded-2xl'], .atelier-shell main [class*='rounded-xl'], .atelier-shell main article",
                  ),
                );
              workspaceCards.forEach((card: HTMLElement, index: number) => {
                gsap.fromTo(card,
                  { y: 68, scale: 0.94, rotateX: 7, transformPerspective: 1100, autoAlpha: 0, filter: "blur(7px)" },
                  {
                    y: 0, scale: 1, rotateX: 0, autoAlpha: 1, filter: "blur(0px)",
                    duration: 1.05, delay: Math.min(index % 7, 5) * 0.065,
                    ease: premiumEase, immediateRender: false,
                    scrollTrigger: { trigger: card, start: "top 94%", once: true },
                  },
                );
              });

              gsap.utils.toArray<HTMLElement>(".atelier-shell main h1, .atelier-shell main h2").forEach((heading: HTMLElement) => {
                gsap.fromTo(heading,
                  { y: 42, letterSpacing: "-.075em", autoAlpha: 0, filter: "blur(8px)" },
                  { y: 0, letterSpacing: "-.035em", autoAlpha: 1, filter: "blur(0px)", duration: 1.1, ease: premiumEase, delay: 0.12 },
                );
              });

              // Pointer-reactive depth: dashboard cards physically tilt toward
              // the cursor, then settle back when the pointer leaves.
              workspaceCards.forEach((card: HTMLElement) => {
                if (card.matches("tr")) return;
                const moveCard = contextSafe((event: PointerEvent) => {
                  if (event.pointerType === "touch") return;
                  const bounds = card.getBoundingClientRect();
                  const x = (event.clientX - bounds.left) / bounds.width - 0.5;
                  const y = (event.clientY - bounds.top) / bounds.height - 0.5;
                  gsap.to(card, {
                    rotateY: x * 5.5,
                    rotateX: y * -5.5,
                    z: 18,
                    transformPerspective: 1000,
                    duration: 0.38,
                    ease: "power2.out",
                    overwrite: "auto",
                  });
                });
                const resetCard = contextSafe(() => gsap.to(card, {
                  rotateX: 0, rotateY: 0, z: 0, duration: 0.7, ease: "elastic.out(1, 0.55)", overwrite: "auto",
                }));
                card.addEventListener("pointermove", moveCard, { passive: true });
                card.addEventListener("pointerleave", resetCard);
                interactionCleanups.push(() => {
                  card.removeEventListener("pointermove", moveCard);
                  card.removeEventListener("pointerleave", resetCard);
                });
              });
            }

            gsap.utils.toArray<HTMLElement>(".atelier-shell main button, .atelier-shell main a, .atelier-home .atelier-primary, .atelier-home .atelier-enter").forEach((item: HTMLElement) => {
              const lift = contextSafe(() => gsap.to(item, { y: -3, duration: 0.22, ease: "power2.out", overwrite: "auto" }));
              const settle = contextSafe(() => gsap.to(item, { y: 0, duration: 0.35, ease: "power3.out", overwrite: "auto" }));
              item.addEventListener("mouseenter", lift);
              item.addEventListener("mouseleave", settle);
              gsap.set(item, { clearProps: "willChange" });
            });

            // Editorial landing page: restore a layered cinematic entrance,
            // staggered chapter reveals, and lively floating feature artwork.
            const editorial = document.querySelector(".ss-editorial");
            if (editorial) {
              const intro = gsap.timeline({ defaults: { ease: premiumEase } });
              intro
                .fromTo(".ss-landing-nav", { y: -34, autoAlpha: 0, filter: "blur(8px)" }, { y: 0, autoAlpha: 1, filter: "blur(0px)", duration: .9 })
                .fromTo(".ss-editorial-opening-copy .ss-editorial-kicker", { x: -35, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: .75 }, "-=.45")
                .fromTo(".ss-editorial-opening h1", { y: 90, rotateX: -12, transformPerspective: 1000, autoAlpha: 0, filter: "blur(12px)" }, { y: 0, rotateX: 0, autoAlpha: 1, filter: "blur(0px)", duration: 1.35 }, "-=.35")
                .fromTo(".ss-editorial-deck", { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .85 }, "-=.7")
                .fromTo(".ss-editorial-actions > *", { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .7, stagger: .12 }, "-=.55")
                .fromTo(".ss-editorial-specimen", { x: 100, y: 65, rotate: 8, scale: .82, autoAlpha: 0, filter: "blur(10px)" }, { x: 0, y: 0, rotate: -2.2, scale: 1, autoAlpha: 1, filter: "blur(0px)", duration: 1.35 }, "-=1.05")
                .fromTo(".ss-editorial-bottomline", { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .65 }, "-=.55");

              gsap.to(".ss-editorial-specimen", {
                y: -13, rotate: -1, duration: 3.8, repeat: -1, yoyo: true,
                ease: "sine.inOut",
              });
              gsap.to(".ss-editorial-specimen .ss-specimen-marker", {
                scale: 1.8, boxShadow: "0 0 0 7px rgba(155,134,99,.12)",
                duration: 1.7, repeat: -1, yoyo: true, stagger: .35, ease: "sine.inOut",
              });

              gsap.utils.toArray<HTMLElement>(".ss-editorial-manifesto, .ss-editorial-workspace, .ss-editorial-method, .ss-editorial-closing").forEach((section: HTMLElement) => {
                const targets = section.querySelectorAll(".ss-editorial-kicker, h2, .ss-editorial-manifesto-grid > div, .ss-editorial-chapters button, .ss-editorial-preview, .ss-method-aside > div, .ss-editorial-closing > p, .ss-editorial-closing > a");
                if (!targets.length) return;
                gsap.fromTo(targets,
                  { y: 48, autoAlpha: 0, filter: "blur(7px)" },
                  {
                    y: 0, autoAlpha: 1, filter: "blur(0px)", duration: 1.05,
                    stagger: .085, ease: premiumEase, immediateRender: false,
                    scrollTrigger: { trigger: section, start: "top 78%", once: true },
                  },
                );
              });

              gsap.utils.toArray<HTMLElement>(".ss-editorial-preview, .ss-method-aside > div").forEach((panel: HTMLElement, index: number) => {
                gsap.fromTo(panel,
                  { y: 55, rotateY: index % 2 ? 7 : -7, scale: .94, transformPerspective: 1000 },
                  { y: 0, rotateY: 0, scale: 1, duration: 1.1, ease: premiumEase,
                    scrollTrigger: { trigger: panel, start: "top 90%", once: true } },
                );
              });

              gsap.utils.toArray<HTMLElement>(".ss-editorial-chapters button").forEach((tab: HTMLElement) => {
                const hoverIn = contextSafe(() => gsap.to(tab, { x: 8, duration: .28, ease: "power3.out", overwrite: "auto" }));
                const hoverOut = contextSafe(() => gsap.to(tab, { x: 0, duration: .42, ease: "elastic.out(1,.6)", overwrite: "auto" }));
                tab.addEventListener("mouseenter", hoverIn);
                tab.addEventListener("mouseleave", hoverOut);
                interactionCleanups.push(() => {
                  tab.removeEventListener("mouseenter", hoverIn);
                  tab.removeEventListener("mouseleave", hoverOut);
                });
              });
            }

            // A subtle continuous drift gives the opening artwork life even
            // when the visitor is not scrolling.
            gsap.to(".atelier-orbit-a", { rotation: 360, duration: 42, repeat: -1, ease: "none" });
            gsap.to(".atelier-orbit-b", { rotation: -360, duration: 58, repeat: -1, ease: "none" });
          }

          gsap.fromTo(document.body, { opacity: 0.96 }, { opacity: 1, duration: 0.55, ease: "power2.out" });
        }, rootRef.current ?? undefined);

        const routeRefresh = window.setTimeout(() => {
          ScrollTrigger.refresh();
        }, 250);
        ScrollTrigger.refresh();
        cleanup = (() => {
          const previous = cleanup;
          return () => {
            context.revert();
            interactionCleanups.forEach((remove) => remove());
            window.clearTimeout(routeRefresh);
            if (lenisFrame) gsap.ticker.remove(lenisFrame);
            lenis?.destroy();
            previous?.();
          };
        })();
      } catch (error) {
        console.warn("StudySpace cinematic layer could not initialize:", error);
      }
    });

    // Let Next.js finish hydrating the page before GSAP touches React-owned
    // elements. GSAP writes inline styles and data attributes, which otherwise
    // race with hydration and produce attribute-mismatch warnings.
    const bootTimer = window.setTimeout(() => {
      if (!disposed) void boot();
    }, 1200);

    return () => {
      disposed = true;
      if (bootTimer !== undefined) window.clearTimeout(bootTimer);
      routeCurtain.remove();
      cleanup?.();
    };
  }, [pathname, contextSafe]);

  return (
    <div ref={rootRef} className="ss-cinematic-root">
      {children}
      <canvas id="studyspace-atmosphere" className="studyspace-atmosphere" aria-hidden="true" />
      <div className="studyspace-atmosphere-vignette" aria-hidden="true" />
    </div>
  );
}
