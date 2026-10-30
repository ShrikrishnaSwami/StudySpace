"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger, CustomEase);

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

export default function CinematicExperience() {
  const pathname = usePathname();

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    let bootTimer: number | undefined;

    async function boot() {
      try {
        if (disposed) return;

        if (CustomEase) CustomEase.create("atelier-weight", "0.22, 1, 0.36, 1");
        const premiumEase = CustomEase ? "atelier-weight" : "power3.out";

        const canvas = document.querySelector<HTMLCanvasElement>("#studyspace-atmosphere");
        let renderer: any;
        let scene: any;
        let camera: any;
        let material: any;
        let frame = 0;
        let pointerX = 0;
        let pointerY = 0;
        let targetX = 0;
        let targetY = 0;

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

            const resize = () => {
              renderer.setSize(window.innerWidth, window.innerHeight, false);
              material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
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
              renderer.render(scene, camera);
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
              renderer.dispose();
            };
          } catch (webglError) {
            console.warn("WebGL atmosphere unavailable; continuing with motion and smooth scrolling.", webglError);
          }
        }

        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let lenis: any;
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
          lenisFrame = (time: number) => lenis.raf(time * 1000);
          gsap.ticker.add(lenisFrame);
          gsap.ticker.lagSmoothing(0);
        }

        const updateProgress = () => {
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
          document.documentElement.style.setProperty("--page-progress", String(progress));
        };
        window.addEventListener("scroll", updateProgress, { passive: true });
        updateProgress();

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
            gsap.utils.toArray(".atelier-manifesto, .atelier-chapter, .atelier-closing").forEach((section: any) => {
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

            gsap.utils.toArray(".atelier-home .atelier-index-art, .atelier-home .atelier-ritual-art, .atelier-home .atelier-record-art").forEach((art: any) => {
              gsap.to(art, {
                yPercent: -6,
                ease: "none",
                scrollTrigger: { trigger: art, start: "top bottom", end: "bottom top", scrub: 1.2 },
              });
            });

            gsap.utils.toArray(".atelier-shell main > *").forEach((section: any) => {
              gsap.fromTo(section,
                { y: 24, autoAlpha: 0 },
                {
                  y: 0, autoAlpha: 1, duration: 0.8, ease: premiumEase,
                  immediateRender: false,
                  scrollTrigger: { trigger: section, start: "top 88%", once: true },
                },
              );
            });

            gsap.utils.toArray(".atelier-shell main button, .atelier-shell main a, .atelier-home .atelier-primary, .atelier-home .atelier-enter").forEach((item: any) => {
              const lift = () => gsap.to(item, { y: -3, duration: 0.22, ease: "power2.out", overwrite: "auto" });
              const settle = () => gsap.to(item, { y: 0, duration: 0.35, ease: "power3.out", overwrite: "auto" });
              item.addEventListener("mouseenter", lift);
              item.addEventListener("mouseleave", settle);
              gsap.set(item, { clearProps: "willChange" });
            });

            // A subtle continuous drift gives the opening artwork life even
            // when the visitor is not scrolling.
            gsap.to(".atelier-orbit-a", { rotation: 360, duration: 42, repeat: -1, ease: "none" });
            gsap.to(".atelier-orbit-b", { rotation: -360, duration: 58, repeat: -1, ease: "none" });
          }

          gsap.fromTo(document.body, { opacity: 0.96 }, { opacity: 1, duration: 0.55, ease: "power2.out" });
        });

        const routeRefresh = window.setTimeout(() => {
          ScrollTrigger.refresh();
        }, 250);
        ScrollTrigger.refresh();
        cleanup = (() => {
          const previous = cleanup;
          return () => {
            context.revert();
            window.clearTimeout(routeRefresh);
            window.removeEventListener("scroll", updateProgress);
            document.documentElement.style.removeProperty("--page-progress");
            if (lenisFrame) gsap.ticker.remove(lenisFrame);
            lenis?.destroy();
            previous?.();
          };
        })();
      } catch (error) {
        console.warn("StudySpace cinematic layer could not initialize:", error);
      }
    }

    // Let Next.js finish hydrating the page before GSAP touches React-owned
    // elements. GSAP writes inline styles and data attributes, which otherwise
    // race with hydration and produce attribute-mismatch warnings.
    bootTimer = window.setTimeout(() => {
      if (!disposed) void boot();
    }, 1200);

    return () => {
      disposed = true;
      if (bootTimer !== undefined) window.clearTimeout(bootTimer);
      cleanup?.();
    };
  }, [pathname]);

  return (
    <>
      <canvas id="studyspace-atmosphere" className="studyspace-atmosphere" aria-hidden="true" />
      <div className="studyspace-atmosphere-vignette" aria-hidden="true" />
      <div className="ss-scroll-progress" aria-hidden="true" />
    </>
  );
}
