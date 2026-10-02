<script setup>
const CurrentYear = new Date().getFullYear();
</script>
<template>
  <footer class="site-footer">
    <p>
      © {{ CurrentYear }} Happenence. All rights reserved.
      <a href="https://happenence.substack.com/">Substack</a>
    </p>
  </footer>
</template>
<style scoped>
.site-footer {
  padding: 1.5rem;
  background: #fafafa;
  font-size: 0.75rem;
  text-align: center;
}
.site-footer a {
  margin-inline-start: 0.5rem;
}
</style>
