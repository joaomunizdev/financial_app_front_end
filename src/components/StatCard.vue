<template>
  <v-card>
    <v-card-text class="d-flex align-center">
      <v-avatar size="40" class="mr-4" color="primary" variant="tonal">
        <v-icon :icon="icon" />
      </v-avatar>
      <div>
        <div class="text-caption text-medium-emphasis">{{ label }}</div>
        <div class="text-h6">{{ value }}</div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
defineProps<{ label: string; value: string; icon?: string }>();
</script>
