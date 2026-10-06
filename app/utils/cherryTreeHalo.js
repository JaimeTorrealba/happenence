import gsap from "gsap";

// A soft glow around the home page cherry tree. The canvas is transparent outside the tree, so a
// CSS drop-shadow with no offset follows its outline; no post-processing needed. Fade (0..1)
// scales the opacity so the halo can come in with the leaves.
export const setCherryTreeHalo = (Canvas, { color, blur, opacity }, Fade) => {
  const [Red, Green, Blue] = gsap.utils.splitColor(color);
  Canvas.style.filter = `drop-shadow(0 0 ${blur}px rgba(${Red}, ${Green}, ${Blue}, ${opacity * Fade}))`;
};
