import gsap from "gsap";

// Both animations start from the hidden state set in CSS (.reveal-title / .reveal-fade in main.css),
// so server-rendered elements never flash visible before hydration.

// Slides an element up from below its own height. Wrap it in `.overflow-hidden` so it rises from a mask.
// GSAP reads the CSS translateY(100%) as a pixel y offset, so y: 0 clears it and yPercent does the move.
export const animateTitleReveal = (Element, Options = {}) =>
  gsap.fromTo(
    Element,
    { yPercent: 100, y: 0 },
    { yPercent: 0, duration: 0.9, ease: "power3.out", ...Options },
  );

// Fades an element in from (almost) transparent; 0.01 matches the CSS start state.
export const animateFadeIn = (Element, Options = {}) =>
  gsap.fromTo(Element, { opacity: 0.01 }, { opacity: 1, duration: 1.2, ease: "power2.out", ...Options });
