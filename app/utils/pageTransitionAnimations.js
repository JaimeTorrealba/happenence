import gsap from "gsap";

// Timelines for the route-change overlay (components/PageTransitionOverlay.vue).
// Cover: the bands sweep in from the left (top band first), a few petals ride the gust in and the
// destination name rises from its mask. Reveal: the name rises out, then the bands and petals are
// blown off to the right.

const BandSweep = { duration: 0.75, ease: "quint.inOut", stagger: 0.07 };

// Extra wait for the new page's entrance animations (useEnterAnimation), so they play as the bands
// uncover the content instead of behind them.
export const PageRevealDelay = 0.5;

// Destination route name -> the name shown on the overlay and the band colour.
export const PageTransitionThemes = {
  index: { Label: "Home", Color: "#b5673a" },
  about: { Label: "About", Color: "#7c6052" },
  contents: { Label: "Contents", Color: "#c9824f" },
  legal: { Label: "Legal", Color: "#8a6a55" },
};
const FallbackPageTransitionTheme = { Label: "Happenence", Color: "#7c6052" };

export const getPageTransitionThemeByRouteName = (RouteName) =>
  PageTransitionThemes[RouteName] ?? FallbackPageTransitionTheme;

const getRandomBetween = gsap.utils.random;

// A cover that interrupts a reveal (IsOverlayVisible) carries on from wherever everything is;
// otherwise the bands start off to the left, the name below its mask and the petals off-screen.
export const getPageCoverTimeline = ({ Overlay, Bands, Label, Petals, IsOverlayVisible }) => {
  const Width = Overlay.clientWidth;
  const Height = Overlay.clientHeight;
  if (!IsOverlayVisible) {
    gsap.set(Bands, { xPercent: -101 });
    gsap.set(Label, { yPercent: 100 });
    gsap.set(Petals, {
      x: () => -getRandomBetween(40, Width * 0.3),
      y: () => getRandomBetween(0.1, 0.9) * Height,
      rotation: () => getRandomBetween(0, 360),
      opacity: 1,
    });
  }
  return (
    gsap
      .timeline()
      .to(Bands, { xPercent: 0, ...BandSweep }, 0)
      // They settle above and below the name, alternating, so none lands on it.
      .to(
        Petals,
        {
          x: () => getRandomBetween(0.15, 0.85) * Width,
          y: (Index) => (Index % 2 ? getRandomBetween(0.12, 0.35) : getRandomBetween(0.65, 0.88)) * Height,
          rotation: () => `+=${getRandomBetween(120, 300)}`,
          opacity: 1,
          duration: () => getRandomBetween(0.85, 1),
          ease: "power2.inOut",
          stagger: 0.05,
        },
        0.05,
      )
      .to(Label, { yPercent: 0, duration: 0.55, ease: "power3.out" }, 0.45)
  );
};

export const getPageRevealTimeline = ({ Overlay, Bands, Label, Petals }) => {
  const Width = Overlay.clientWidth;
  return gsap
    .timeline()
    .to(Label, { yPercent: -100, duration: 0.35, ease: "power3.in" }, 0.1)
    .to(Bands, { xPercent: 101, ...BandSweep }, 0.3)
    .to(
      Petals,
      {
        x: () => Width + getRandomBetween(40, 200),
        y: () => `+=${getRandomBetween(-80, 40)}`,
        rotation: () => `+=${getRandomBetween(120, 300)}`,
        opacity: 0,
        duration: () => getRandomBetween(0.6, 0.8),
        ease: "power2.in",
        stagger: 0.03,
      },
      0.3,
    );
};
