// Shared state and helpers for the route-change overlay (components/PageTransitionOverlay.vue).

// True from the moment the overlay starts covering the old page until it has uncovered the new one.
export const useIsPageCovered = () => useState("page-transition-covering", () => false);

// Vue runs onBeforeUnmount before the leave transition, so freeing a page's WebGL canvas there would
// blank it at the click, before the overlay has covered it. When the component leaves with its page,
// this waits for the transition to finish instead: with its render loop already stopped, the canvas
// keeps its last frame until then.
export const useDisposeAfterPageLeave = (disposeCanvas) => {
  const NuxtApp = useNuxtApp();
  const Router = useRouter();
  // Inside a page this is the page's own route, which stays on the old one while the page leaves.
  const PageRoute = useRoute();

  onBeforeUnmount(() => {
    if (Router.currentRoute.value.path !== PageRoute.path) {
      NuxtApp.hooks.hookOnce("page:transition:finish", () => disposeCanvas());
    } else {
      disposeCanvas();
    }
  });
};
