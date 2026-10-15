<template>
  <v-autocomplete
    :model-value="modelValue"
    :items="categories"
    item-title="name"
    item-value="id"
    label="Categoria"
    clearable
    :prepend-inner-icon="selected?.icon ?? 'mdi-shape-outline'"
    :error-messages="errorMessages"
    :hide-details="hideDetails"
    no-data-text="Nenhuma categoria encontrada"
    @update:model-value="(v: string | null) => emit('update:modelValue', v ?? null)"
  >
    <template #item="{ props: itemProps, item }">
      <v-list-item v-bind="itemProps" :prepend-icon="item.raw.icon" />
    </template>
  </v-autocomplete>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Category } from "../types/domain";

const props = defineProps<{
  modelValue: string | null;
  categories: Category[];
  errorMessages?: string | string[];
  hideDetails?: boolean;
}>();
const emit = defineEmits<{ (e: "update:modelValue", v: string | null): void }>();

const selected = computed(() => props.categories.find((c) => c.id === props.modelValue));
</script>
