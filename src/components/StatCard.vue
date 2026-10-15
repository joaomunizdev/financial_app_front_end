<template>
  <v-card class="pa-5">
    <div class="d-flex align-center ga-4">
      <span class="stat-card__icon">
        <v-icon size="18" :icon="icon" />
      </span>
      <div class="min-w-0">
        <div class="text-caption text-medium-emphasis font-weight-medium">{{ label }}</div>
        <div class="stat-card__value tabular-nums">{{ value }}</div>
      </div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
defineProps<{ label: string; value: string; icon?: string }>();
</script>

<style scoped>
.min-w-0 {
  min-width: 0;
}
.stat-card__icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgb(var(--v-theme-surface-light));
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.stat-card__value {
  font-size: 22px;
  line-height: 30px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
</style>
