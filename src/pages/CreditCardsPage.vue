<template>
  <div class="d-flex flex-column ga-6">
    <div class="d-flex align-center justify-space-between">
      <div class="text-h5">Cartões</div>
      <v-btn prepend-icon="mdi-plus" @click="openNew">Novo cartão</v-btn>
    </div>
    <v-card>
      <v-data-table
        :items="items"
        :headers="headers"
        :loading="loading"
        class="pa-2"
      >
        <template #item.limitAmount="{ item }">
          {{ toCurrencyBRL(item.limitAmount ?? 0) }}
        </template>
        <template #item.actions="{ item }">
          <v-btn icon variant="text" aria-label="Editar" @click="edit(item)"
            ><v-icon>mdi-pencil</v-icon></v-btn
          >
          <v-btn
            icon
            variant="text"
            color="error"
            aria-label="Excluir"
            @click="remove(item)"
            ><v-icon>mdi-delete</v-icon></v-btn
          >
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="open" max-width="520" :key="dialogKey">
      <v-card>
        <v-card-title>{{
          form.id ? "Editar cartão" : "Novo cartão"
        }}</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="save">
            <v-text-field
              v-model="form.nickname"
              label="Apelido"
              maxlength="80"
              :error-messages="errors.nickname"
            />
            <v-text-field
              v-model="form.brand"
              label="Bandeira"
              maxlength="50"
              :error-messages="errors.brand"
            />
            <v-text-field
              v-model="form.last4"
              label="Final"
              maxlength="4"
              inputmode="numeric"
              :error-messages="errors.last4"
              @input="form.last4 = digitsOnly(form.last4, 4)"
            />
            <v-text-field
              v-model="form.limitAmount"
              label="Limite (BRL)"
              :error-messages="errors.limitAmount"
              @update:modelValue="onLimitInput"
            />
            <v-btn type="submit" :loading="saving" class="mt-2">Salvar</v-btn>
            <v-btn variant="text" class="mt-2 ml-2" @click="onCancel"
              >Cancelar</v-btn
            >
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from "vue";
import http from "../plugins/http";
import * as yup from "yup";
import { useCurrency } from "../composables/useCurrency";
import { useFormErrors } from "../composables/useFormErrors";
import { moneyField } from "../schemas/money";
import { useConfirmStore } from "../stores/confirm";
import type { CreditCard } from "../types/domain";

const { toCurrencyBRL, digitsOnly, formatCurrencyOnType, toApiMoney } =
  useCurrency();
const confirm = useConfirmStore();

const loading = ref(false);
const saving = ref(false);
const open = ref(false);
const dialogKey = ref(0);

const items = ref<CreditCard[]>([]);
const headers = [
  { title: "Apelido", key: "nickname" },
  { title: "Bandeira", key: "brand" },
  { title: "Final", key: "last4" },
  { title: "Limite", key: "limitAmount", align: "end" as const },
  { title: "", key: "actions", align: "end" as const, sortable: false },
];

function onLimitInput(val: string) {
  form.limitAmount = formatCurrencyOnType(val);
}

type FormT = {
  id: string;
  nickname: string;
  brand: string;
  last4: string;
  limitAmount: string;
};

const emptyForm = (): FormT => ({
  id: "",
  nickname: "",
  brand: "",
  last4: "",
  limitAmount: "",
});

const form = reactive<FormT>(emptyForm());

const schema = yup.object({
  nickname: yup
    .string()
    .trim()
    .required("Apelido é obrigatório")
    .max(80, "Máximo de 80 caracteres"),
  brand: yup
    .string()
    .trim()
    .required("Bandeira é obrigatória")
    .max(50, "Máximo de 50 caracteres"),
  last4: yup
    .string()
    .required("Final é obrigatório")
    .matches(/^\d{4}$/, "Final deve conter exatamente 4 dígitos"),
  limitAmount: moneyField({ requiredMessage: "Limite é obrigatório" }),
});

const { errors, clearErrors, validateAll } = useFormErrors(schema, [
  "nickname",
  "brand",
  "last4",
  "limitAmount",
] as const);

function openNew() {
  Object.assign(form, emptyForm());
  clearErrors();
  open.value = true;
}

function edit(it: CreditCard) {
  Object.assign(form, {
    id: it.id,
    nickname: it.nickname ?? "",
    brand: it.brand ?? "",
    last4: digitsOnly(String(it.last4 ?? ""), 4),
    limitAmount: toCurrencyBRL(it.limitAmount ?? "0"),
  });
  clearErrors();
  open.value = true;
}

watch(open, (val) => {
  if (!val) {
    Object.assign(form, emptyForm());
    clearErrors();
    dialogKey.value++;
  }
});

function onCancel() {
  open.value = false;
}

async function fetchAll() {
  loading.value = true;
  try {
    const { data } = await http.get<CreditCard[]>("/credit-cards");
    items.value = data || [];
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    if (!(await validateAll(form))) return;

    const body = {
      nickname: form.nickname.trim(),
      brand: form.brand.trim(),
      last4: form.last4,
      limitAmount: toApiMoney(form.limitAmount),
    };

    if (form.id) await http.patch(`/credit-cards/${form.id}`, body);
    else await http.post("/credit-cards", body);

    open.value = false;
    await fetchAll();
  } finally {
    saving.value = false;
  }
}

async function remove(it: CreditCard) {
  const confirmed = await confirm.ask({
    title: "Excluir cartão",
    message: `Deseja excluir o cartão "${it.nickname}"? Faturas e assinaturas vinculadas a ele também serão excluídas, e cartões com compras não podem ser excluídos. Essa ação não pode ser desfeita.`,
  });
  if (!confirmed) return;
  await http.delete(`/credit-cards/${it.id}`);
  await fetchAll();
}

onMounted(fetchAll);
</script>
