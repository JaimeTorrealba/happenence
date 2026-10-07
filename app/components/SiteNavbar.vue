<script setup>
const HomeNavItem = { label: "Home", to: "/" };
const NavItems = [
  { label: "About", to: "/about" },
  { label: "Contents", to: "/contents" },
];
</script>

<template>
  <!-- Home on the left, the rest on the right. NuxtLink marks the current page with aria-current. -->
  <header class="site-navbar">
    <nav aria-label="Main" class="site-navbar-bar">
      <NuxtLink :to="HomeNavItem.to" class="site-navbar-link">{{ HomeNavItem.label }}</NuxtLink>
      <div class="site-navbar-items">
        <NuxtLink v-for="NavItem in NavItems" :key="NavItem.to" :to="NavItem.to" class="site-navbar-link">
          {{ NavItem.label }}
        </NuxtLink>
      </div>
    </nav>
    <!-- The curved bottom of the bar, sitting flush under it. -->
    <svg class="site-navbar-wave" viewBox="0 0 300 18" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M0,0 H300 V13 Q255,18 150,5.5 T0,13 Z" />
    </svg>
  </header>
</template>

<style scoped>
/* The bar and the wave share one colour, and the shadow sits on the header so both render in one
   layer (a filter on the wave alone composites it apart from the bar, which can shift its colour).
   They match the page colour, so the shadow under the wave is what separates the navbar from it. */
.site-navbar {
  --site-navbar-color: #f6f5f2;
  filter: drop-shadow(0 2px 3px rgba(124, 96, 82, 0.15));
}
.site-navbar-bar {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  width: 100%;
  padding-inline: 0.5rem;
  background: var(--site-navbar-color);
}
.site-navbar-wave {
  display: block;
  width: 100%;
  height: clamp(12px, 2vw, 24px);
}
.site-navbar-wave path {
  fill: var(--site-navbar-color);
}
.site-navbar-items {
  display: flex;
}
/* The padding lives on the link so its whole section is clickable, not just the text. */
.site-navbar-link {
  display: flex;
  align-items: center;
  min-height: 48px;
  padding: 0.5rem 1rem;
  color: #7c6052;
  font-family: "Lato", system-ui, sans-serif;
  font-weight: 400;
  font-size: 16px;
}
.site-navbar-link:hover,
.site-navbar-link:focus-visible,
.site-navbar-link[aria-current="page"] {
  text-decoration: underline;
}
@media (max-width: 640px) {
  .site-navbar-bar {
    padding-inline: 0.25rem;
  }
  .site-navbar-link {
    padding-inline: 0.75rem;
  }
}
</style>
