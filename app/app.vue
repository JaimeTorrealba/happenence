<script setup>
import "~/assets/main.css";
import gsap from "gsap";

useHead({
  title: "Happenence",
  meta: [
    { name: "description", content: "Happenence is a simple company grow with love." },
  ],
  htmlAttrs: {
    "data-theme": "light",
  },
});

const titleRef = ref(null);
onMounted(() => {
  gsap.from(titleRef.value, { y: -100, ease: "power2.out", duration: 1 });
});
</script>

<template>
  <main class="container">
    <div class="overflow-hidden">
      <h1 ref="titleRef" class="is-size-1 has-text-centered mt-4 pb-4">Happenence</h1>
    </div>
    <div
      class="columns is-desktop is-1-mobile is-2-tablet is-3-desktop is-4-widescreen is-5-fullhd"
    >
      <div class="column"><Content /></div>
      <div class="column is-relative cards-wrapper">
        <ClientOnly>
          <Cards />
        </ClientOnly>
      </div>
    </div>
  </main>
</template>

<style>
.debug {
  border: 1px solid red;
}
main {
  min-height: 100vh;
  font-family: "Lato";
}
.cards-wrapper {
  height: 50vh;
}
.overflow-hidden {
  overflow: hidden;
}
</style>
