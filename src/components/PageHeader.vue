<template>
  <div class="d-flex flex-wrap align-end justify-space-between ga-4">
    <div>
      <h1 class="page-title">{{ title }}</h1>
      <p v-if="description" class="text-body-2 text-medium-emphasis mt-1">
        {{ description }}
      </p>
    </div>
    <div v-if="$slots.default" class="d-flex flex-wrap align-center ga-2">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
</script>
