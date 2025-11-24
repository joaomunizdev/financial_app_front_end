<template>
  <v-sheet
    class="pa-3 rounded-xl d-flex flex-wrap align-center gap-3"
    color="surface"
    elevation="1"
  >
    <v-select
      v-model="localCardId"
      :items="cards"
      item-title="nickname"
      item-value="id"
      label="Cartão"
      density="comfortable"
      variant="outlined"
      hide-details
      style="min-width: 260px"
      prepend-inner-icon="mdi-credit-card-outline"
    />

    <v-text-field
      v-model.number="localYear"
      type="number"
      label="Ano"
      density="comfortable"
      variant="outlined"
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
      density="comfortable"
      variant="outlined"
      hide-details
      style="max-width: 180px"
      prepend-inner-icon="mdi-calendar-month-outline"
    />

    <v-spacer />

    <v-btn variant="tonal" prepend-icon="mdi-magnify" @click="$emit('find')">
      Buscar fatura
    </v-btn>

    <v-btn prepend-icon="mdi-file-plus-outline" @click="$emit('generate')">
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
import { ref, watch } from "vue";

const props = defineProps<{
  cards: any[];
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

const localCardId = ref(props.modelValueCardId || "");
const localYear = ref(props.modelValueYear || new Date().getFullYear());
const localMonth = ref(props.modelValueMonth || new Date().getMonth() + 1);

watch(localCardId, (v) => emit("update:cardId", v));
watch(localYear, (v) => emit("update:year", Number(v)));
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
    if (!exists) {
      localCardId.value = props.modelValueCardId || list[0].id;
    }
  },
  { immediate: true, deep: true }
);
</script>
