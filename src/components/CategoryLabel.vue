<template>
  <span v-if="category" class="category-label">
    <v-icon :icon="category.icon" size="18" class="text-medium-emphasis" />
    {{ category.name }}
  </span>
  <span v-else class="text-medium-emphasis">Sem categoria</span>
</template>

<script setup lang="ts">
import type { Category } from "../types/domain";

defineProps<{ category?: Category | null }>();
</script>

<style scoped>
.category-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
</style>
