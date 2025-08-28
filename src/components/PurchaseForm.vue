<template>
  <v-form @submit.prevent="submit" v-model="valid">
    <v-select
      v-model="model.creditCardId"
      :items="creditCards"
      item-title="nickname"
      item-value="id"
      label="Cartão"
      prepend-inner-icon="mdi-credit-card-outline"
      required
    />
    <v-select
      v-model="model.tenantId"
      :items="tenants"
      item-title="name"
      item-value="id"
      label="Responsável"
      prepend-inner-icon="mdi-account-outline"
      required
    />
    <v-text-field
      v-model="model.description"
      label="Descrição"
      prepend-inner-icon="mdi-text"
      required
    />
    <v-text-field
      v-model="model.totalAmount"
      label="Valor (BRL)"
      prepend-inner-icon="mdi-currency-brl"
      required
    />
    <v-text-field
      v-model="model.purchaseDate"
      label="Data (YYYY-MM-DD)"
      prepend-inner-icon="mdi-calendar"
      required
    />

    <v-switch
      v-model="model.isInstallment"
      inset
      label="Parcelada?"
      class="mt-2"
    />
    <div v-if="model.isInstallment" class="d-flex gap-4">
      <v-text-field
        type="number"
        v-model.number="model.installmentsTotal"
        label="Parcelas (total)"
        min="1"
      />
      <v-text-field
        type="number"
        v-model.number="model.installmentsPaid"
        label="Parcelas pagas"
        min="0"
      />
    </div>

    <v-btn type="submit" :loading="loading" class="mt-2">{{
      submitText
    }}</v-btn>
  </v-form>
</template>

<script setup lang="ts">
import { computed, reactive } from "vue";

const props = defineProps<{
  modelValue?: any;
  creditCards: any[];
  tenants: any[];
  loading?: boolean;
}>();
const emit = defineEmits<{ (e: "submit", value: any): void }>();

const model = reactive<any>({
  id: props.modelValue?.id,
  creditCardId: props.modelValue?.creditCardId ?? "",
  tenantId: props.modelValue?.tenantId ?? "",
  description: props.modelValue?.description ?? "",
  totalAmount: props.modelValue?.totalAmount ?? "",
  purchaseDate:
    props.modelValue?.purchaseDate ?? new Date().toISOString().slice(0, 10),
  isInstallment: props.modelValue?.isInstallment ?? false,
  installmentsTotal: props.modelValue?.installmentsTotal ?? null,
  installmentsPaid: props.modelValue?.installmentsPaid ?? 0,
});
const valid = computed(
  () =>
    !!model.creditCardId &&
    !!model.tenantId &&
    !!model.description &&
    !!model.totalAmount &&
    !!model.purchaseDate
);
const submitText = computed(() => (model.id ? "Salvar" : "Criar"));

function submit() {
  if (!valid.value) return;
  emit("submit", { ...model });
}
</script>
