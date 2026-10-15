<template>
  <v-form @submit.prevent="submit">
    <v-select
      v-model="creditCardId"
      :items="creditCards"
      item-title="nickname"
      item-value="id"
      label="Cartão"
      prepend-inner-icon="mdi-credit-card-outline"
      :error-messages="errors.creditCardId"
    />
    <v-select
      v-model="tenantId"
      :items="tenants"
      item-title="name"
      item-value="id"
      label="Responsável"
      prepend-inner-icon="mdi-account-outline"
      :error-messages="errors.tenantId"
    />
    <v-text-field
      v-model="description"
      label="Descrição"
      maxlength="255"
      prepend-inner-icon="mdi-text"
      :error-messages="errors.description"
    />
    <CategorySelect
      :model-value="categoryId ?? null"
      :categories="categories"
      :error-messages="errors.categoryId"
      @update:model-value="(v) => (categoryId = v)"
    />
    <v-text-field
      :model-value="maskedTotalAmount"
      @update:model-value="onAmountChange"
      label="Valor (BRL)"
      :error-messages="errors.totalAmount"
      placeholder="0,00"
    />
    <v-text-field
      v-model="purchaseDate"
      label="Data"
      prepend-inner-icon="mdi-calendar"
      type="date"
      :error-messages="errors.purchaseDate"
    />

    <v-switch
      v-if="!isDebitCard"
      v-model="isInstallment"
      inset
      label="Parcelada?"
      class="mt-2"
      color="primary"
    />
    <div v-else class="text-body-2 text-medium-emphasis mt-2 mb-4">
      Cartão de débito: a compra é registrada à vista.
    </div>
    <div v-if="isInstallment" class="d-flex ga-4">
      <v-text-field
        type="number"
        v-model.number="installmentsTotal"
        label="Parcelas (total)"
        min="2"
        :error-messages="errors.installmentsTotal"
      />
      <v-text-field
        type="number"
        v-model.number="installmentsPaid"
        label="Parcelas pagas"
        min="0"
        :error-messages="errors.installmentsPaid"
      />
    </div>

    <v-btn type="submit" :loading="loading" class="mt-2">{{
      submitText
    }}</v-btn>
  </v-form>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import CategorySelect from "./CategorySelect.vue";
import { useForm } from "vee-validate";
import {
  purchaseSchema,
  type PurchaseFormValues,
} from "../schemas/purchaseSchema";
import { useCurrency } from "../composables/useCurrency";
import { toDateInput, todayLocalISO } from "../utils/date";
import type { Category, CreditCard, Purchase, Tenant } from "../types/domain";

const props = defineProps<{
  modelValue?: Purchase | null;
  creditCards: CreditCard[];
  tenants: Tenant[];
  categories: Category[];
  loading?: boolean;
}>();
const emit = defineEmits<{ (e: "submit", value: PurchaseFormValues): void }>();
const { formatCurrencyOnType, toNumberBRL, toCurrencyBRL } = useCurrency();

const initial = props.modelValue;

const { handleSubmit, errors, defineField } = useForm<PurchaseFormValues>({
  validationSchema: purchaseSchema,
  initialValues: {
    creditCardId: initial?.creditCardId ?? "",
    tenantId: initial?.tenantId ?? "",
    categoryId: initial?.categoryId ?? null,
    description: initial?.description ?? "",
    totalAmount: initial ? Number(initial.totalAmount) : "",
    purchaseDate: toDateInput(initial?.purchaseDate) || todayLocalISO(),
    isInstallment: initial?.isInstallment ?? false,
    installmentsTotal: initial?.installmentsTotal ?? null,
    installmentsPaid: initial?.installmentsPaid ?? 0,
  },
});

const [creditCardId] = defineField("creditCardId");
const [tenantId] = defineField("tenantId");
const [categoryId] = defineField("categoryId");
const [description] = defineField("description");
const [totalAmount] = defineField("totalAmount");
const [purchaseDate] = defineField("purchaseDate");
const [isInstallment] = defineField("isInstallment");
const [installmentsTotal] = defineField("installmentsTotal");
const [installmentsPaid] = defineField("installmentsPaid");

const maskedTotalAmount = ref(
  totalAmount.value === "" ? "" : toCurrencyBRL(totalAmount.value ?? "")
);

function onAmountChange(newValue: string) {
  const formatted = formatCurrencyOnType(newValue);
  maskedTotalAmount.value = formatted;
  totalAmount.value = toNumberBRL(formatted);
}

watch(totalAmount, (newNumericValue) => {
  if (toNumberBRL(maskedTotalAmount.value) !== newNumericValue) {
    maskedTotalAmount.value = toCurrencyBRL(newNumericValue ?? "");
  }
});

const submit = handleSubmit((values) => {
  emit("submit", { ...values, id: props.modelValue?.id });
});

// Debit cards don't accept installments (the API rejects them).
const isDebitCard = computed(
  () =>
    props.creditCards.find((c) => c.id === creditCardId.value)?.cardType ===
    "debit"
);
watch(
  isDebitCard,
  (debit) => {
    if (debit) isInstallment.value = false;
  },
  { immediate: true }
);

const submitText = computed(() => (props.modelValue?.id ? "Salvar" : "Criar"));
</script>
