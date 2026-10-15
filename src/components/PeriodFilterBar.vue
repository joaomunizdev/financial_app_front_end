<template>
  <v-sheet
    class="pa-3 d-flex flex-wrap align-center ga-3"
    color="surface"
    border
  >
    <v-select
      v-model="localCardId"
      :items="cardOptions"
      item-title="nickname"
      item-value="id"
      label="Cartão"
      clearable
      hide-details
      style="min-width: 260px"
      prepend-inner-icon="mdi-credit-card-outline"
    />

    <v-text-field
      v-model.number="localYear"
      type="number"
      label="Ano"
      :min="MIN_YEAR"
      :max="MAX_YEAR"
      hide-details
      style="max-width: 140px"
      prepend-inner-icon="mdi-calendar-range"
    />

    <v-select
      v-model.number="localMonth"
      :items="months"
      item-title="label"
      item-value="value"
      label="Mês"
      hide-details
      style="max-width: 180px"
      prepend-inner-icon="mdi-calendar-month-outline"
    />

    <v-spacer />

    <v-btn variant="outlined"
      color="default" prepend-icon="mdi-magnify" @click="$emit('find')">
      Buscar fatura
    </v-btn>

    <v-btn
      prepend-icon="mdi-file-plus-outline"
      @click="$emit('generate')"
    >
      Gerar fatura
    </v-btn>

    <v-btn
      variant="text"
      prepend-icon="mdi-filter-remove-outline"
      @click="$emit('clear')"
    >
      Limpar
    </v-btn>
  </v-sheet>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { MIN_YEAR, MAX_YEAR, isValidYear } from "../utils/date";
import type { CreditCard } from "../types/domain";

const props = defineProps<{
  cards: CreditCard[];
  months: { label: string; value: number }[];
  modelValueCardId?: string;
  modelValueYear?: number;
  modelValueMonth?: number;
}>();

const emit = defineEmits<{
  (e: "update:cardId", v: string): void;
  (e: "update:year", v: number): void;
  (e: "update:month", v: number): void;
  (e: "find"): void;
  (e: "generate"): void;
  (e: "clear"): void;
}>();

const localCardId = ref<string | null>(props.modelValueCardId || "");
const localYear = ref(props.modelValueYear || new Date().getFullYear());
const localMonth = ref(props.modelValueMonth || new Date().getMonth() + 1);
const cardOptions = computed(() => [
  { id: "", nickname: "Selecione" },
  ...props.cards,
]);

// The clearable select sets null; the parent always receives a string ("" = all cards).
watch(localCardId, (v) => emit("update:cardId", v ?? ""));
// An empty or out-of-range year is not propagated (the API accepts 2000–2100).
watch(localYear, (v) => {
  if (isValidYear(v)) emit("update:year", v);
});
watch(localMonth, (v) => emit("update:month", Number(v)));

watch(
  () => props.modelValueCardId,
  (v) => {
    if (v !== undefined && v !== localCardId.value) {
      localCardId.value = v || "";
    }
  }
);

watch(
  () => props.modelValueYear,
  (v) => {
    if (typeof v === "number" && v !== localYear.value) {
      localYear.value = v;
    }
  }
);

watch(
  () => props.modelValueMonth,
  (v) => {
    if (typeof v === "number" && v !== localMonth.value) {
      localMonth.value = v;
    }
  }
);

watch(
  () => props.cards,
  (list) => {
    if (!list?.length) return;
    const exists = list.some((card) => card.id === localCardId.value);
    if (!exists && localCardId.value) {
      localCardId.value = props.modelValueCardId || "";
    }
  },
  { immediate: true, deep: true }
);
</script>
