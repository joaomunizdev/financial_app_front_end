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

    <v-select
      v-model="localStatementId"
      :items="statements"
      item-title="periodLabel"
      item-value="id"
      label="Fatura"
      density="comfortable"
      variant="outlined"
      hide-details
      style="min-width: 220px"
      prepend-inner-icon="mdi-calendar-month-outline"
    >
      <!-- Exibe badge de status na lista -->
      <template #item="{ props, item }">
        <v-list-item v-bind="props">
          <template #append>
            <v-chip
              v-if="item?.raw?.locked !== undefined"
              size="x-small"
              :color="item.raw.locked ? 'primary' : 'secondary'"
              variant="tonal"
            >
              {{ item.raw.locked ? "Fechada" : "Aberta" }}
            </v-chip>
          </template>
        </v-list-item>
      </template>
    </v-select>

    <v-spacer />

    <v-btn variant="tonal" prepend-icon="mdi-filter" @click="emitApply">
      Aplicar
    </v-btn>

    <v-btn
      variant="text"
      prepend-icon="mdi-filter-remove-outline"
      @click="emitClear"
    >
      Limpar
    </v-btn>
  </v-sheet>
</template>

<script setup lang="ts">
import { watch, ref } from "vue";

const props = defineProps<{
  cards: any[];
  statements: any[];
  modelValueCardId?: string;
  modelValueStatementId?: string;
}>();

const emit = defineEmits<{
  (e: "update:cardId", v: string): void;
  (e: "update:statementId", v: string): void;
  (e: "apply"): void;
  (e: "clear"): void;
}>();

const localCardId = ref(props.modelValueCardId || "");
const localStatementId = ref(props.modelValueStatementId || "");

watch(localCardId, (v) => emit("update:cardId", v));
watch(localStatementId, (v) => emit("update:statementId", v));

function emitApply() {
  emit("apply");
}
function emitClear() {
  emit("clear");
}
</script>
