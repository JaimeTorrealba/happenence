import gsap from "gsap";

// Runs an entrance animation once the element mounts, skipped for reduced-motion users.
// After a route change it waits PageRevealDelay longer, so it plays as the transition overlay
// uncovers the page instead of behind it.
// On unmount it is killed without reverting: unmount runs before the page's leave transition,
// and reverting would snap the element back to its hidden CSS state before the overlay covers it.
export const useEnterAnimation = (ElementRef, animateElement, Options = {}) => {
  const IsPageCovered = useIsPageCovered();
  let EnterMatchMedia = null;

  onMounted(() => {
    if (!ElementRef.value) return;
    const EnterOptions = IsPageCovered.value
      ? { ...Options, delay: (Options.delay ?? 0) + PageRevealDelay }
      : Options;
    EnterMatchMedia = gsap.matchMedia();
    EnterMatchMedia.add("(prefers-reduced-motion: no-preference)", () => {
      animateElement(ElementRef.value, EnterOptions);
    });
  });

  onBeforeUnmount(() => EnterMatchMedia?.kill(false));
};

export const useTitleReveal = (ElementRef, Options) => useEnterAnimation(ElementRef, animateTitleReveal, Options);

export const useFadeIn = (ElementRef, Options) => useEnterAnimation(ElementRef, animateFadeIn, Options);
