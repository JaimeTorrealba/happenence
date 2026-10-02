import gsap from "gsap";

// Both animations start from the hidden state set in CSS (.reveal-title / .reveal-fade in main.css),
// so server-rendered elements never flash visible before hydration.

// Slides an element up from below its own height. Wrap it in `.overflow-hidden` so it rises from a mask.
export const animateTitleReveal = (Element, Options = {}) =>
  gsap.fromTo(
    Element,
    { yPercent: 100, opacity: 1 },
    { yPercent: 0, duration: 0.9, ease: "power3.out", ...Options },
  );

// Fades an element in from fully transparent.
export const animateFadeIn = (Element, Options = {}) =>
  gsap.fromTo(Element, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: "power2.out", ...Options });
