<template>
  <div class="app-logo d-flex align-center ga-3" aria-label="Financial App">
    <svg
      class="app-logo__mark"
      width="32"
      height="32"
      viewBox="0 0 32 32"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="rgb(var(--v-theme-primary))" />
      <path
        d="M10 22v-5M16 22V10M22 22v-8"
        stroke="#FFFFFF"
        stroke-width="3"
        stroke-linecap="round"
      />
    </svg>
    <span v-if="!compact" class="app-logo__wordmark">Financial App</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ compact?: boolean }>();
</script>

<style scoped>
.app-logo__mark {
  flex-shrink: 0;
}
.app-logo__wordmark {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: rgb(var(--v-theme-on-surface));
  white-space: nowrap;
}
</style>
