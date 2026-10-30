"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type RuntimeWindow = Window & {
  THREE?: any;
  gsap?: any;
  Lenis?: any;
};

const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js";
const GSAP_URL = "https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js";
const SCROLL_TRIGGER_URL = "https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js";
const CUSTOM_EASE_URL = "https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/CustomEase.min.js";
const LENIS_URL = "https://cdn.jsdelivr.net/npm/lenis@1.3.11/dist/lenis.min.js";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-cinematic-src="${src}"]`);
    if (existing?.dataset.loaded === "true") return resolve();
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Unable to load ${src}`)), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.cinematicSrc = src;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Unable to load ${src}`));
    document.head.appendChild(script);
  });
}

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

    async function boot() {
      try {
        await loadScript(THREE_URL);
        await loadScript(GSAP_URL);
        await loadScript(SCROLL_TRIGGER_URL);
        await loadScript(CUSTOM_EASE_URL);
        await loadScript(LENIS_URL);
        if (disposed) return;

        const runtime = window as RuntimeWindow;
        const THREE = runtime.THREE;
        const gsap = runtime.gsap;
        if (!THREE || !gsap) return;

        gsap.registerPlugin(gsap.plugins?.ScrollTrigger || runtime.gsap.ScrollTrigger, runtime.gsap.CustomEase);
        const ScrollTrigger = runtime.gsap.ScrollTrigger;
        const CustomEase = runtime.gsap.CustomEase;
        if (CustomEase) CustomEase.create("atelier-weight", "0.22, 1, 0.36, 1");

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
        }

        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let lenis: any;
        let lenisFrame: ((time: number) => void) | undefined;
        if (!reduceMotion && runtime.Lenis) {
          lenis = new runtime.Lenis({
            duration: 1.18,
            smoothWheel: true,
            wheelMultiplier: 0.88,
            touchMultiplier: 1.15,
            anchors: true,
          });
          lenis.on("scroll", () => ScrollTrigger?.update());
          lenisFrame = (time: number) => lenis.raf(time * 1000);
          gsap.ticker.add(lenisFrame);
          gsap.ticker.lagSmoothing(0);
        }

        const context = gsap.context(() => {
          if (!reduceMotion) {
            const revealTargets = gsap.utils.toArray(
              ".atelier-home section, .atelier-home .atelier-opening-center, .atelier-shell main > *, .atelier-shell main section, .atelier-shell main article, .atelier-shell main .rounded-2xl, .atelier-shell main .rounded-xl",
            ) as Element[];
            revealTargets.forEach((element, index) => {
              if ((element as HTMLElement).dataset.cinematicRevealed === "true") return;
              (element as HTMLElement).dataset.cinematicRevealed = "true";
              gsap.fromTo(element,
                { autoAlpha: 0, y: 34, filter: "blur(7px)" },
                {
                  autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1.05,
                  ease: "atelier-weight", delay: Math.min(index % 4, 3) * 0.055,
                  scrollTrigger: { trigger: element, start: "top 91%", once: true },
                },
              );
            });

            gsap.utils.toArray(".atelier-home h1, .atelier-home h2, .atelier-shell main h1, .atelier-shell main h2").forEach((heading: any) => {
              gsap.fromTo(heading, { y: 22, autoAlpha: 0, letterSpacing: "-0.025em" }, {
                y: 0, autoAlpha: 1, letterSpacing: "normal", duration: 1.15, ease: "atelier-weight",
                scrollTrigger: { trigger: heading, start: "top 92%", once: true },
              });
            });

            gsap.utils.toArray(".atelier-shell main button, .atelier-shell main a, .atelier-home .atelier-primary, .atelier-home .atelier-enter").forEach((item: any) => {
              item.addEventListener("mouseenter", () => gsap.to(item, { y: -2, duration: 0.24, ease: "power2.out" }));
              item.addEventListener("mouseleave", () => gsap.to(item, { y: 0, duration: 0.4, ease: "power3.out" }));
            });
          }

          gsap.fromTo(document.body, { opacity: 0.94 }, { opacity: 1, duration: 0.65, ease: "power2.out" });
        });

        if (ScrollTrigger) ScrollTrigger.refresh();
        cleanup = (() => {
          const previous = cleanup;
          return () => {
            context.revert();
            if (lenisFrame) gsap.ticker.remove(lenisFrame);
            lenis?.destroy();
            previous?.();
          };
        })();
      } catch (error) {
        console.warn("StudySpace cinematic layer could not initialize:", error);
      }
    }

    void boot();
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [pathname]);

  return (
    <>
      <canvas id="studyspace-atmosphere" className="studyspace-atmosphere" aria-hidden="true" />
      <div className="studyspace-atmosphere-vignette" aria-hidden="true" />
    </>
  );
}
