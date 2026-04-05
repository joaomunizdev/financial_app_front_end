<template>
  <v-sheet class="pa-3 rounded-xl filter-bar" color="surface" elevation="1">
    <div class="filter-grid">
      <div>
        <v-text-field
          v-model.number="localYear"
          type="number"
          label="Ano"
          density="comfortable"
          variant="outlined"
          hide-details
          prepend-inner-icon="mdi-calendar-range"
        />
      </div>

      <div>
        <v-select
          v-model.number="localMonth"
          :items="months"
          item-title="label"
          item-value="value"
          label="Mês"
          density="comfortable"
          variant="outlined"
          hide-details
          prepend-inner-icon="mdi-calendar-month-outline"
        />
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
  months: { label: string; value: number }[];
  modelValueYear?: number;
  modelValueMonth?: number;
}>();

const emit = defineEmits<{
  (e: "update:year", v: number): void;
  (e: "update:month", v: number): void;
  (e: "apply"): void;
  (e: "clear"): void;
}>();

const localYear = ref(props.modelValueYear || new Date().getFullYear());
const localMonth = ref(props.modelValueMonth || new Date().getMonth() + 1);

watch(localYear, (v) => emit("update:year", Number(v)));
watch(localMonth, (v) => emit("update:month", Number(v)));

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
