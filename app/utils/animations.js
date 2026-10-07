import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

// Every animation starts from the hidden state set in CSS (.reveal-title / .reveal-fade / .reveal-lines in main.css),
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

// Reveals a Markdown body line by line, each line rising from its own mask like animateTitleReveal.
// aria "none" keeps the text (and its links) readable by screen readers; the default would hide the lines.
// autoSplit re-splits after the web font swaps in and on resize; onSplit returns the tween so SplitText
// can carry its progress over to the new lines instead of replaying it.
export const animateLinesReveal = (Element, Options = {}) => {
  gsap.registerPlugin(SplitText);
  const TextBlocks = Element.querySelectorAll("p, li:not(:has(p)), h2, h3, h4");
  if (!TextBlocks.length) {
    gsap.set(Element, { opacity: 1 });
    return;
  }
  SplitText.create(TextBlocks, {
    type: "lines",
    mask: "lines",
    aria: "none",
    autoSplit: true,
    onSplit: (Split) => {
      gsap.set(Element, { opacity: 1 });
      return gsap.fromTo(
        Split.lines,
        { yPercent: 100 },
        { yPercent: 0, duration: 0.9, ease: "power3.out", stagger: 0.08, ...Options },
      );
    },
  });
};
