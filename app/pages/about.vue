<template>
  <div class="about-page">
    <ClientOnly>
      <AboutAuroraBackground class="about-aurora" />
    </ClientOnly>
    <MarkdownPage path="/about" />
  </div>
</template>

<style scoped>
/* Fixed behind the whole viewport (navbar included). z-index -1 keeps it under every
   element but above the body background; the footer's own background still covers it. */
.about-aurora {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}
</style>
