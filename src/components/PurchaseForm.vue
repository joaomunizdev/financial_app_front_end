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
      prepend-inner-icon="mdi-text"
      :error-messages="errors.description"
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
      label="Data (YYYY-MM-DD)"
      prepend-inner-icon="mdi-calendar"
      type="date"
      :error-messages="errors.purchaseDate"
    />

    <v-switch
      v-model="isInstallment"
      inset
      label="Parcelada?"
      class="mt-2"
      color="primary"
    />
    <div v-if="isInstallment" class="d-flex" style="gap: 1rem">
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
import { useForm } from "vee-validate";
import { purchaseSchema } from "../schemas/purchaseSchema";
import { useCurrency } from "../composables/useCurrency";

const props = defineProps<{
  modelValue?: any;
  creditCards: any[];
  tenants: any[];
  loading?: boolean;
}>();
const emit = defineEmits<{ (e: "submit", value: any): void }>();
const { formatCurrencyOnType, toNumberBRL, toCurrencyBRL } = useCurrency(); // << Instancie o composable

// Configuração do VeeValidate
const { handleSubmit, errors, defineField, meta } = useForm({
  validationSchema: purchaseSchema,
  // Define os valores iniciais para edição ou criação
  initialValues: {
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
  },
});

// Cria refs reativas para cada campo do formulário
const [creditCardId] = defineField("creditCardId");
const [tenantId] = defineField("tenantId");
const [description] = defineField("description");
const [totalAmount] = defineField("totalAmount");
const [purchaseDate] = defineField("purchaseDate");
const [isInstallment] = defineField("isInstallment");
const [installmentsTotal] = defineField("installmentsTotal");
const [installmentsPaid] = defineField("installmentsPaid");

const maskedTotalAmount = ref(toCurrencyBRL(totalAmount.value ?? ""));

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

const submitText = computed(() => (props.modelValue?.id ? "Salvar" : "Criar"));
</script>
