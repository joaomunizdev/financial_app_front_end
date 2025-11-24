<template>
  <v-sheet class="pa-3 rounded-xl filter-bar" color="surface" elevation="1">
    <div class="filter-grid">
      <div>
        <v-select
          v-model="localCardId"
          :items="cards"
          item-title="nickname"
          item-value="id"
          label="Cartão"
          density="comfortable"
          variant="outlined"
          hide-details
          prepend-inner-icon="mdi-credit-card-outline"
        />
      </div>

      <div>
        <v-select
          v-model="localStatementId"
          :items="statements"
          item-title="periodLabel"
          item-value="id"
          label="Fatura"
          density="comfortable"
          variant="outlined"
          hide-details
          prepend-inner-icon="mdi-calendar-month-outline"
        >
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
      </div>

      <div class="filter-actions">
        <v-btn
          class="filter-action"
          variant="tonal"
          prepend-icon="mdi-filter"
          @click="emitApply"
        >
          Aplicar
        </v-btn>

        <v-btn
          class="filter-action"
          variant="text"
          prepend-icon="mdi-filter-remove-outline"
          @click="emitClear"
        >
          Limpar
        </v-btn>
      </div>
    </div>
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

watch(
  () => props.modelValueCardId,
  (v) => {
    if (v !== undefined && v !== localCardId.value) {
      localCardId.value = v || "";
    }
  }
);

watch(
  () => props.modelValueStatementId,
  (v) => {
    if (v !== undefined && v !== localStatementId.value) {
      localStatementId.value = v || "";
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

watch(
  () => props.statements,
  (list) => {
    if (!list?.length) {
      localStatementId.value = "";
      return;
    }
    const exists = list.some((st) => st.id === localStatementId.value);
    if (!exists) {
      localStatementId.value = props.modelValueStatementId || list[0].id || "";
    }
  },
  { immediate: true, deep: true }
);

function emitApply() {
  emit("apply");
}
function emitClear() {
  emit("clear");
}
</script>

<style scoped>
.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  align-items: center;
  width: 100%;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-action {
  flex: 1 1 140px;
}
</style>
