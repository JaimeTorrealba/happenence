<script setup>
import gsap from "gsap";

// Fixed pool of petals, recycled round-robin as gusts shake them loose from the trees.
const PetalPool = [
  { Size: 9, Tone: "#d9a27a" },
  { Size: 12, Tone: "#c9824f" },
  { Size: 14, Tone: "#b5673a" },
  { Size: 8, Tone: "#d9a27a" },
  { Size: 11, Tone: "#c9824f" },
  { Size: 10, Tone: "#d9a27a" },
  { Size: 15, Tone: "#c9824f" },
  { Size: 7, Tone: "#d9a27a" },
  { Size: 12, Tone: "#b5673a" },
  { Size: 9, Tone: "#d9a27a" },
  { Size: 13, Tone: "#c9824f" },
  { Size: 10, Tone: "#b5673a" },
];

// Static scatter (% of the footer) shown instead when the visitor prefers reduced motion.
const StaticLayout = [
  [17, 28], [20, 74], [25, 16], [27.5, 56], [33, 16], [66, 2],
  [66.5, 36], [72, 40], [71, 86], [78, 60], [83.5, 10], [87, 34],
];

const PetalsRef = ref(null);
let PetalsMatchMedia = null;
let IsMotionAllowed = false;
let NextPetalIndex = 0;
let IdleDriftCall = null;
let IsIdleDriftPaused = false;
const getRandomBetween = gsap.utils.random;

const getNextPetalElement = () => {
  const Petals = PetalsRef.value.querySelectorAll(".footer-petal");
  const Petal = Petals[NextPetalIndex];
  NextPetalIndex = (NextPetalIndex + 1) % Petals.length;
  return Petal;
};

// Where a tree's canopy sits inside the footer, from the branch's live on-screen box.
const getCanopyBoxBySide = (Side) => {
  const Footer = PetalsRef.value.parentElement;
  const FooterBox = Footer.getBoundingClientRect();
  const BranchBox = Footer.querySelector(`.footer-branch--${Side}`).getBoundingClientRect();
  return {
    Left: BranchBox.left - FooterBox.left,
    Top: BranchBox.top - FooterBox.top,
    Width: BranchBox.width,
    Height: BranchBox.height,
    FooterWidth: FooterBox.width,
  };
};

const releasePetalBySide = (Side) => {
  // A staggered release can fire just after the footer unmounts or motion gets reduced.
  if (!IsMotionAllowed || !PetalsRef.value) return;
  const Petal = getNextPetalElement();
  const Shape = Petal.firstElementChild;
  const Canopy = getCanopyBoxBySide(Side);
  const Direction = Side === "left" ? 1 : -1;

  // Start among the outer half of the branch (where the tips are), drift toward the center.
  const TipStart = Side === "left" ? Canopy.Left + Canopy.Width * 0.5 : Canopy.Left;
  const StartX = TipStart + getRandomBetween(0, Canopy.Width * 0.5);
  const StartY = Canopy.Top + getRandomBetween(Canopy.Height * 0.15, Canopy.Height * 0.7);
  const DriftX = gsap.utils.clamp(40, 200, Canopy.FooterWidth * 0.12) * getRandomBetween(0.7, 1.1);
  const Lifetime = getRandomBetween(4, 6);

  gsap.killTweensOf([Petal, Shape]);
  gsap.set(Petal, { x: StartX, y: StartY, opacity: 0 });
  gsap.set(Shape, { x: 0, rotation: getRandomBetween(0, 360) });

  gsap
    .timeline()
    .to(Petal, { x: StartX + DriftX * Direction, duration: Lifetime, ease: "power1.out" }, 0)
    .to(Petal, { y: StartY + getRandomBetween(25, 50), duration: Lifetime, ease: "sine.in" }, 0)
    .to(Petal, { opacity: 0.85, duration: 0.5, ease: "sine.out" }, 0)
    .to(Petal, { opacity: 0, duration: Lifetime * 0.6, ease: "sine.in" }, Lifetime * 0.4)
    .to(Shape, { rotation: `+=${getRandomBetween(90, 220) * Direction}`, duration: Lifetime, ease: "none" }, 0)
    .fromTo(
      Shape,
      { x: -4 },
      { x: 4, duration: getRandomBetween(0.8, 1.3), ease: "sine.inOut", yoyo: true, repeat: Math.ceil(Lifetime) },
      0,
    );
};

// Called by the footer at the peak of each branch's gust.
const releasePetalsFromSide = (Side) => {
  if (!IsMotionAllowed) return;
  const PetalCount = Math.round(getRandomBetween(2, 3));
  for (let Index = 0; Index < PetalCount; Index++) {
    gsap.delayedCall(Index * getRandomBetween(0.15, 0.4), () => releasePetalBySide(Side));
  }
};

// Between gusts, an occasional lone petal keeps the footer from looking empty.
const scheduleIdleDrift = () => {
  IdleDriftCall = gsap.delayedCall(getRandomBetween(3, 5), () => {
    releasePetalBySide(Math.random() < 0.5 ? "left" : "right");
    scheduleIdleDrift();
  });
};

// Called by the footer as it leaves or enters the viewport; petals already falling finish on their own.
const setIdleDriftPaused = (IsPaused) => {
  IsIdleDriftPaused = IsPaused;
  IdleDriftCall?.kill();
  IdleDriftCall = null;
  if (!IsPaused && IsMotionAllowed) scheduleIdleDrift();
};

onMounted(() => {
  const Petals = PetalsRef.value.querySelectorAll(".footer-petal");

  PetalsMatchMedia = gsap.matchMedia();
  PetalsMatchMedia.add("(prefers-reduced-motion: no-preference)", () => {
    IsMotionAllowed = true;
    if (!IsIdleDriftPaused) scheduleIdleDrift();
    return () => {
      IsMotionAllowed = false;
      IdleDriftCall?.kill();
    };
  });
  PetalsMatchMedia.add("(prefers-reduced-motion: reduce)", () => {
    Petals.forEach((Petal, Index) => {
      const [Left, Top] = StaticLayout[Index];
      gsap.set(Petal, { left: `${Left}%`, top: `${Top}%`, opacity: 0.85 });
    });
  });
});

onBeforeUnmount(() => PetalsMatchMedia?.revert());

defineExpose({ releasePetalsFromSide, setIdleDriftPaused });
</script>

<template>
  <div ref="PetalsRef" class="footer-petals" aria-hidden="true">
    <span v-for="(Petal, Index) in PetalPool" :key="Index" class="footer-petal">
      <PetalShape class="footer-petal-shape" :size="Petal.Size" :tone="Petal.Tone" />
    </span>
  </div>
</template>

<style scoped>
.footer-petals {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.footer-petal {
  position: absolute;
  top: 0;
  left: 0;
  opacity: 0;
}
.footer-petal-shape {
  display: block;
}
</style>
