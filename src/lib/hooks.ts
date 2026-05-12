"use client";

import { useEffect, useRef, useState, RefObject } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

// =============================================================================
// LENIS SMOOTH SCROLL — global init
// =============================================================================
export function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Sync with GSAP ScrollTrigger
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
    };
  }, []);
}

// =============================================================================
// GSAP SETUP — register plugins once
// =============================================================================
let gsapInitialized = false;
export function useGsap() {
  useEffect(() => {
    if (gsapInitialized) return;
    gsap.registerPlugin(ScrollTrigger);
    gsapInitialized = true;
  }, []);
}

// =============================================================================
// MAGNETIC EFFECT — hover gravity on buttons/cards
// =============================================================================
export function useMagnetic(strength: number = 0.4) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function handleMove(e: MouseEvent) {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(el, {
        x: x * strength,
        y: y * strength,
        duration: 0.6,
        ease: "power3.out",
      });
    }

    function handleLeave() {
      if (!el) return;
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: 0.8,
        ease: "elastic.out(1, 0.4)",
      });
    }

    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
    };
  }, [strength]);

  return ref;
}

// =============================================================================
// REVEAL UP — fade + translate on scroll into view
// =============================================================================
export function useRevealUp(stagger: boolean = false, delay: number = 0) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets = stagger
      ? el.querySelectorAll<HTMLElement>("[data-reveal-child]")
      : [el];

    gsap.set(targets, { opacity: 0, y: 40 });

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      once: true,
      onEnter: () => {
        gsap.to(targets, {
          opacity: 1,
          y: 0,
          duration: 1.2,
          ease: "power4.out",
          stagger: stagger ? 0.08 : 0,
          delay,
        });
      },
    });

    return () => {
      trigger.kill();
    };
  }, [stagger, delay]);

  return ref;
}

// =============================================================================
// NUMBER COUNTER — counts up when scrolled into view
// =============================================================================
export function useNumberCount(end: number, duration: number = 2) {
  const ref = useRef<HTMLSpanElement>(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const counter = { value: 0 };

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      once: true,
      onEnter: () => {
        gsap.to(counter, {
          value: end,
          duration,
          ease: "power3.out",
          onUpdate: () => setCurrent(Math.round(counter.value)),
        });
      },
    });

    return () => {
      trigger.kill();
    };
  }, [end, duration]);

  return { ref, current };
}

// =============================================================================
// PARALLAX — element moves slower than scroll (depth effect)
// =============================================================================
export function useParallax(speed: number = 0.3) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top bottom",
      end: "bottom top",
      scrub: true,
      onUpdate: (self) => {
        gsap.set(el, {
          y: self.progress * speed * -100,
        });
      },
    });

    return () => trigger.kill();
  }, [speed]);

  return ref;
}

// =============================================================================
// HORIZONTAL TEXT REVEAL — letters cascade in (for hero)
// =============================================================================
export function useTextReveal(delay: number = 0) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const words = el.querySelectorAll<HTMLElement>("[data-word]");
    gsap.set(words, { y: "100%", opacity: 0 });

    gsap.to(words, {
      y: "0%",
      opacity: 1,
      duration: 1.4,
      ease: "power4.out",
      stagger: 0.05,
      delay,
    });
  }, [delay]);

  return ref;
}