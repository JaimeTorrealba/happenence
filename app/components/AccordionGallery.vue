<script setup>
// Accordion Gallery from Vue Bits (https://vue-bits.dev/components/accordion-gallery),
// ported from Tailwind to scoped CSS. Horizontal only; the animation lives in useAccordionGallery.
const Props = defineProps({
  items: { type: Array, required: true },
  defaultIndex: { type: Number, default: undefined },
  height: { type: Number, default: 460 },
  gap: { type: Number, default: 10 },
  radius: { type: Number, default: 16 },
  expandRatio: { type: Number, default: 0.52 },
  duration: { type: Number, default: 0.6 },
  ease: { type: String, default: "power3.out" },
  parallax: { type: Number, default: 0.5 },
  tilt: { type: Number, default: 8 },
  stagger: { type: Number, default: 0.06 },
  accentColor: { type: String, default: "#fff" },
  // Keyboard focus ring; needs at least 3:1 contrast on the page behind the gallery
  focusColor: { type: String, default: "#7c6052" },
  overlayColor: { type: String, default: "#060010" },
  textColor: { type: String, default: "#fff" },
  grayscale: { type: Boolean, default: true },
});

const AccordionRootRef = ref(null);

const {
  ActiveIndex,
  setPanelRef,
  setMediaRef,
  setBarRef,
  setTextRef,
  handlePanelEnter,
  handlePanelClick,
  handlePanelKeyDown,
} = useAccordionGallery(Props, AccordionRootRef);

const AccordionRootStyle = computed(() => ({
  gap: `${Props.gap}px`,
  height: `${Props.height}px`,
}));

const PanelStyle = computed(() => ({
  borderRadius: `${Props.radius}px`,
  "--ag-focus": Props.focusColor,
}));

const OverlayBackground = computed(
  () =>
    `linear-gradient(180deg, transparent 45%, color-mix(in srgb, ${Props.overlayColor} 78%, transparent) 100%), color-mix(in srgb, ${Props.overlayColor} calc(var(--ag-dim, 0.35) * 100%), transparent)`,
);

const BarStyle = computed(() => ({
  background: Props.accentColor,
  boxShadow: `0 0 12px color-mix(in srgb, ${Props.accentColor} 60%, transparent)`,
}));
</script>

<template>
  <!-- role="list" because list-style: none drops the list semantics in Safari -->
  <ul ref="AccordionRootRef" class="accordion-gallery" :style="AccordionRootStyle" role="list" aria-label="Writings">
    <!-- The <li> is the flex item that grows and tilts; the link inside fills it -->
    <li
      v-for="(Item, Index) in items"
      :key="Item.to"
      :ref="(Element) => setPanelRef(Element, Index)"
      class="accordion-item"
    >
      <a
        class="accordion-panel"
        :style="PanelStyle"
        :href="Item.to"
        :aria-label="Item.label"
        @click="(Event) => handlePanelClick(Index, Event)"
        @mouseenter="handlePanelEnter(Index)"
        @focus="ActiveIndex = Index"
        @keydown="(Event) => handlePanelKeyDown(Index, Event)"
      >
        <span class="accordion-panel-clip">
          <span :ref="(Element) => setMediaRef(Element, Index)" class="accordion-media">
            <img
              v-if="Item.image"
              :src="Item.image"
              :alt="Item.imageAlt ?? ''"
              :draggable="false"
              class="accordion-image"
            />
          </span>
          <span class="accordion-overlay" :style="{ background: OverlayBackground }" aria-hidden="true" />
        </span>
        <span class="accordion-label" aria-hidden="true">
          <span :ref="(Element) => setBarRef(Element, Index)" class="accordion-bar" :style="BarStyle" />
          <span :ref="(Element) => setTextRef(Element, Index)" class="accordion-text" :style="{ color: textColor }">
            {{ Item.label }}
          </span>
        </span>
      </a>
    </li>
  </ul>
</template>

<style scoped>
.accordion-gallery {
  display: flex;
  flex-direction: row;
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
  perspective: 1400px;
}
/* flex-grow can't be composited, so only the tilt gets a layer hint */
.accordion-item {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  transform-style: preserve-3d;
  transform-origin: center;
  will-change: transform;
}
.accordion-panel {
  position: absolute;
  inset: 0;
  display: block;
  overflow: hidden;
  background: #0a0713;
  text-decoration: none;
  cursor: pointer;
  box-shadow: 0 10px 30px -18px rgba(0, 0, 0, 0.8);
}
.accordion-panel:focus-visible {
  outline: 3px solid var(--ag-focus);
  outline-offset: 3px;
}
.accordion-panel-clip {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
}
.accordion-media {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--ag-media-size, 320px);
  height: 100%;
  filter: grayscale(var(--ag-gray, 1));
  will-change: transform;
}
.accordion-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  user-select: none;
  -webkit-user-drag: none;
}
.accordion-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.accordion-label {
  position: absolute;
  right: 1.25rem;
  bottom: 1.25rem;
  left: 1.25rem;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  pointer-events: none;
}
.accordion-bar {
  flex: none;
  width: 3px;
  height: 1.625rem;
  border-radius: 3px;
  opacity: 0;
}
.accordion-text {
  overflow: hidden;
  font-size: clamp(1rem, 1.4vw, 1.4rem);
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-shadow: 0 2px 14px rgba(0, 0, 0, 0.55);
  opacity: 0;
}

@media (max-width: 520px) {
  .accordion-gallery {
    flex-direction: column;
    perspective: none;
  }
  .accordion-item {
    min-height: 84px;
    transform: none !important;
  }
}
</style>
