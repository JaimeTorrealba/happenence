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
  </header>
</template>

<style scoped>
/* Translucent so page backgrounds (like the About silk) show through. */
.site-navbar-bar {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  width: 100%;
  padding-inline: 0.5rem;
  background: rgba(245, 243, 238, 0.6);
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
