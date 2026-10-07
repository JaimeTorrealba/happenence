import gsap from "gsap";

// GSAP logic for AccordionGallery.vue, ported from Vue Bits' Accordion Gallery.
// The active panel grows by ExpandRatio, the others tilt toward it, turn grey and dim,
// and their images drift sideways for a parallax feel.
export const useAccordionGallery = (Props, RootRef) => {
  const PanelRefs = [];
  const MediaRefs = [];
  const BarRefs = [];
  const TextRefs = [];

  const setPanelRef = (Element, Index) => (PanelRefs[Index] = Element);
  const setMediaRef = (Element, Index) => (MediaRefs[Index] = Element);
  const setBarRef = (Element, Index) => (BarRefs[Index] = Element);
  const setTextRef = (Element, Index) => (TextRefs[Index] = Element);

  const clampActiveIndex = (Index) => Math.min(Math.max(Index, 0), Math.max(Props.items.length - 1, 0));
  const ActiveIndex = ref(clampActiveIndex(Props.defaultIndex ?? Math.floor(Props.items.length / 2)));

  const PrefersReducedMotion = import.meta.client && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Non-reactive state, as in upstream: none of it needs to re-render the template
  let AccordionTimeline = null;
  let MediaSize = 320;
  let IsFirstRun = true;
  let AccordionResizeObserver = null;

  const getClampedExpandRatio = () => Math.min(Math.max(Props.expandRatio, 0.2), 0.9);

  const applyAccordionLayout = (Animate) => {
    const PanelCount = Props.items.length;
    if (!PanelCount) return;

    const ExpandRatio = getClampedExpandRatio();
    // flex-grow the active panel needs to take ExpandRatio of the row while the others stay at 1
    const ActiveGrow = PanelCount > 1 ? (ExpandRatio * (PanelCount - 1)) / (1 - ExpandRatio) : 1;
    const Active = ActiveIndex.value;

    AccordionTimeline?.kill();
    const Duration = Animate && !PrefersReducedMotion ? Props.duration : 0;
    const Timeline = gsap.timeline();

    PanelRefs.slice(0, PanelCount).forEach((Panel, Index) => {
      if (!Panel) return;
      const IsActive = Index === Active;
      const Media = MediaRefs[Index];
      const Bar = BarRefs[Index];
      const Text = TextRefs[Index];

      const Tilt = IsActive ? 0 : Index < Active ? Props.tilt : -Props.tilt;

      // Panel is the <li>. --ag-dim lives on it (not the media span, as upstream) so the overlay inherits it
      Timeline.to(
        Panel,
        { flexGrow: IsActive ? ActiveGrow : 1, rotateY: Tilt, "--ag-dim": IsActive ? 0 : 0.35, duration: Duration, ease: Props.ease },
        0,
      );

      if (Media) {
        const Drift = Math.max(-1.5, Math.min(1.5, Active - Index));
        const Shift = Drift * Props.parallax * MediaSize * 0.06;
        Timeline.to(
          Media,
          {
            xPercent: -50,
            yPercent: -50,
            x: IsActive ? 0 : Shift,
            "--ag-gray": Props.grayscale && !IsActive ? 1 : 0,
            duration: Duration,
            ease: Props.ease,
          },
          0,
        );
      }

      if (Bar && Text) {
        const LabelTween = IsActive
          ? { opacity: 1, x: 0, duration: Duration, ease: Props.ease, stagger: PrefersReducedMotion ? 0 : Props.stagger }
          : { opacity: 0, x: -14, duration: Duration * 0.6, ease: Props.ease };
        Timeline.to([Bar, Text], LabelTween, 0);
      }
    });

    AccordionTimeline = Timeline;
  };

  // Sizes the images from the root width so the expanded panel is always covered
  const measureAccordionMedia = () => {
    const Root = RootRef.value;
    if (!Root) return;
    const RootWidth = Root.getBoundingClientRect().width;
    const UsableWidth = Math.max(RootWidth - Props.gap * (Props.items.length - 1), 120);
    MediaSize = Math.max(140, UsableWidth * getClampedExpandRatio() * 1.22);
    Root.style.setProperty("--ag-media-size", `${MediaSize}px`);
    // Resizes snap to the new layout: animating it would restart a full tween on every resize tick
    applyAccordionLayout(false);
  };

  onMounted(() => {
    measureAccordionMedia();
    IsFirstRun = false;
    if (!RootRef.value) return;
    AccordionResizeObserver = new ResizeObserver(measureAccordionMedia);
    AccordionResizeObserver.observe(RootRef.value);
  });

  onUnmounted(() => {
    AccordionResizeObserver?.disconnect();
    AccordionTimeline?.kill();
  });

  watch(
    () => Props.items.length,
    () => {
      ActiveIndex.value = clampActiveIndex(ActiveIndex.value);
      nextTick(measureAccordionMedia);
    },
  );
  watch(ActiveIndex, () => applyAccordionLayout(!IsFirstRun));

  const handlePanelEnter = (Index) => (ActiveIndex.value = Index);

  // A click on an inactive panel only expands it: on touch the first tap expands, the second opens the link
  const handlePanelClick = (Index, Event) => {
    if (Index === ActiveIndex.value) return;
    Event.preventDefault();
    ActiveIndex.value = Index;
  };

  // Arrows move focus to the neighbouring link; its focus handler then expands that panel
  const focusPanelLinkByIndex = (Index) => PanelRefs[Index]?.querySelector("a")?.focus();

  const handlePanelKeyDown = (Index, Event) => {
    const PanelCount = Props.items.length;
    if (Event.key === "ArrowRight" || Event.key === "ArrowDown") {
      Event.preventDefault();
      focusPanelLinkByIndex((Index + 1) % PanelCount);
    } else if (Event.key === "ArrowLeft" || Event.key === "ArrowUp") {
      Event.preventDefault();
      focusPanelLinkByIndex((Index - 1 + PanelCount) % PanelCount);
    }
  };

  return {
    ActiveIndex,
    setPanelRef,
    setMediaRef,
    setBarRef,
    setTextRef,
    handlePanelEnter,
    handlePanelClick,
    handlePanelKeyDown,
  };
};
