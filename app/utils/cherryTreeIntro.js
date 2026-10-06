import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getDissolveStartProgress, getDissolveEndProgress } from "./dissolveMaterial.js";

gsap.registerPlugin(ScrollTrigger);

// Intro for the home page cherry tree: the branches dissolve in (see dissolveMaterial.js), then
// the leaves fade in. CherryBlossomFade.value is tweened from 0 to 1 and shown by
// applyCherryBlossomFade; each tween step draws its own frame with renderCherryTreeFrame.
export const createCherryTreeIntro = ({
  CherryTreeSettings,
  CherryTreeDissolveUniforms,
  CherryBlossomFade,
  applyCherryBlossomFade,
  renderCherryTreeFrame,
}) => {
  let CherryTreeIntroTimeline = null;

  const killCherryTreeIntro = () => {
    CherryTreeIntroTimeline?.scrollTrigger?.kill();
    CherryTreeIntroTimeline?.kill();
  };

  // With ScrollTriggerVars it waits for the scroll position, otherwise it plays now.
  const playCherryTreeIntro = (ScrollTriggerVars) => {
    killCherryTreeIntro();
    // A replay from the debug pane starts from bare branches again.
    CherryBlossomFade.value = 0;
    applyCherryBlossomFade();
    const { dissolve, leaves } = CherryTreeSettings;
    CherryTreeIntroTimeline = gsap
      .timeline({ scrollTrigger: ScrollTriggerVars })
      .fromTo(
        CherryTreeDissolveUniforms.uDissolveProgress,
        { value: getDissolveStartProgress(CherryTreeDissolveUniforms) },
        {
          value: getDissolveEndProgress(CherryTreeDissolveUniforms),
          duration: dissolve.duration,
          ease: dissolve.ease,
          onUpdate: renderCherryTreeFrame,
          // Keeps the branches fully hidden until the tween actually starts.
          immediateRender: false,
        },
      )
      .to(
        CherryBlossomFade,
        {
          value: 1,
          duration: leaves.duration,
          ease: leaves.ease,
          onUpdate: () => {
            applyCherryBlossomFade();
            renderCherryTreeFrame();
          },
        },
        // ">" is the end of the dissolve.
        `>${leaves.offset}`,
      );
  };

  const isCherryTreeIntroFinished = () => CherryTreeIntroTimeline?.progress() === 1;

  return { playCherryTreeIntro, killCherryTreeIntro, isCherryTreeIntroFinished };
};
