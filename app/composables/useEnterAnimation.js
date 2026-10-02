import gsap from "gsap";

// Runs an entrance animation once the element mounts, skipped for reduced-motion users.
// On unmount it is killed without reverting: unmount runs before the page's leave transition,
// and reverting would snap the element back to its hidden CSS state while the page fades out.
export const useEnterAnimation = (ElementRef, animateElement, Options = {}) => {
  let EnterMatchMedia = null;

  onMounted(() => {
    if (!ElementRef.value) return;
    EnterMatchMedia = gsap.matchMedia();
    EnterMatchMedia.add("(prefers-reduced-motion: no-preference)", () => {
      animateElement(ElementRef.value, Options);
    });
  });

  onBeforeUnmount(() => EnterMatchMedia?.kill(false));
};

export const useTitleReveal = (ElementRef, Options) => useEnterAnimation(ElementRef, animateTitleReveal, Options);

export const useFadeIn = (ElementRef, Options) => useEnterAnimation(ElementRef, animateFadeIn, Options);
