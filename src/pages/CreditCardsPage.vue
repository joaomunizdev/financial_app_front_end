<template>
  <div class="d-flex flex-column gap-4">
    <div class="d-flex align-center justify-space-between">
      <div class="text-h5">Cartões</div>
      <v-btn prepend-icon="mdi-plus" @click="open = true">Novo cartão</v-btn>
    </div>
    <v-row>
      <v-col cols="12"></v-col>
      <v-col cols="12"></v-col>
    </v-row>
    <v-card>
      <v-data-table
        :items="items"
        :headers="headers"
        :loading="loading"
        class="pa-2"
      >
        <template #item.limitAmount="{ item }">
          {{ currencyCell(item.limitAmount) }}
        </template>
        <template #item.actions="{ item }">
          <v-btn icon variant="text" @click="edit(item)"
            ><v-icon>mdi-pencil</v-icon></v-btn
          >
          <v-btn icon variant="text" color="error" @click="remove(item)"
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
          <v-form ref="formRef" @submit.prevent="save">
            <v-text-field
              v-model="form.nickname"
              label="Apelido"
              :error-messages="errors.nickname"
            />
            <v-text-field
              v-model="form.brand"
              label="Bandeira"
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
import { ref, reactive, onMounted, watch, nextTick } from "vue";
import http from "../plugins/http";
import * as yup from "yup";
import { useCurrency } from "../composables/useCurrency";

const {
  toNumberBRL,
  toCurrencyBRL,
  sanitizeCurrencyInput, // (segue disponível caso use em outros lugares)
  formatCurrencyString, // (ainda útil em edições vindas da API)
  digitsOnly,
  formatCurrencyOnType, // << novo
} = useCurrency();

const loading = ref(false);
const saving = ref(false);
const open = ref(false);
const isEditing = ref(false);
const dialogKey = ref(0); // opcional: remount do modal
const formRef = ref<any>(null); // para resetar validação do Vuetify

const items = ref<any[]>([]);
const headers = [
  { title: "Apelido", key: "nickname" },
  { title: "Bandeira", key: "brand" },
  { title: "Final", key: "last4" },
  { title: "Limite", key: "limitAmount", align: "end" as const },
  { title: "", key: "actions", align: "end" as const, sortable: false },
];

function onLimitInput(val: string) {
  // Opcional: se quiser bloquear letras imediatamente:
  // val = sanitizeCurrencyInput(val);
  form.limitAmount = formatCurrencyOnType(val);
}

type FormT = {
  id?: string;
  nickname: string;
  brand: string;
  last4: string;
  limitAmount: string;
};

const form = reactive<FormT>({
  id: "",
  nickname: "",
  brand: "",
  last4: "",
  limitAmount: "",
});

const errors = reactive<Record<keyof FormT | string, string[]>>({
  id: [],
  nickname: [],
  brand: [],
  last4: [],
  limitAmount: [],
});

// schema yup (igual ao que já montamos antes)
const schema = yup.object({
  id: yup.string().optional(),
  nickname: yup
    .string()
    .required("Apelido é obrigatório")
    .trim()
    .min(1, "Apelido é obrigatório"),
  brand: yup
    .string()
    .required("Bandeira é obrigatória")
    .trim()
    .min(1, "Bandeira é obrigatória"),
  last4: yup
    .string()
    .required("Final é obrigatório")
    .matches(/^\d{4}$/, "Final deve conter exatamente 4 dígitos"),
  limitAmount: yup
    .string()
    .required("Limite é obrigatório")
    .test("brl-format", "Informe um valor válido em BRL", (value) => {
      if (!value) return false;
      const n = toNumberBRL(value);
      return !isNaN(n) && isFinite(n) && n >= 0;
    }),
});

function clearErrors() {
  Object.keys(errors).forEach((k) => (errors[k] = []));
  // Se usar v-form do Vuetify:
  nextTick(() => formRef.value?.resetValidation?.());
}

function resetForm() {
  Object.assign(form, {
    id: "",
    nickname: "",
    brand: "",
    last4: "",
    limitAmount: "",
  });
}

async function validateAll(): Promise<boolean> {
  clearErrors();
  try {
    await schema.validate(form, { abortEarly: false });
    return true;
  } catch (e: any) {
    if (e?.inner?.length)
      e.inner.forEach((err: any) => {
        if (err?.path && errors[err.path] !== undefined)
          errors[err.path].push(err.message);
      });
    else if (e?.path) errors[e.path] = [e.message];
    return false;
  }
}

// abrir modal para NOVO cartão (sempre limpo)
function openNew() {
  isEditing.value = false;
  resetForm();
  clearErrors();
  open.value = true;
  // opcional: força remount para limpar qualquer resíduo interno
  dialogKey.value++;
}

// editar cartão (preenche e limpa erros)
function edit(it: any) {
  isEditing.value = true;
  Object.assign(form, {
    id: it.id ?? "",
    nickname: it.nickname ?? "",
    brand: it.brand ?? "",
    last4: digitsOnly(String(it.last4 ?? ""), 4),
    // exibe formatado ao abrir
    limitAmount: toCurrencyBRL(it.limitAmount ?? "0"),
  });
  clearErrors();
  open.value = true;
}

// ao fechar o modal (por qualquer motivo), zera tudo
watch(open, (val) => {
  if (!val) {
    isEditing.value = false;
    resetForm();
    clearErrors();
    // opcional: remount
    dialogKey.value++;
  }
});

function onCancel() {
  open.value = false; // watcher tratará reset
}

function currencyCell(v: string | number) {
  return toCurrencyBRL(v);
}

async function fetchAll() {
  loading.value = true;
  try {
    const { data } = await http.get("/credit-cards");
    items.value = data;
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    const ok = await validateAll();
    if (!ok) return;

    const limit = toNumberBRL(form.limitAmount);
    const body = {
      nickname: form.nickname.trim(),
      brand: form.brand.trim(),
      last4: form.last4,
      limitAmount: Number(limit.toFixed(2)), // 1000.00
    };

    if (form.id) await http.patch(`/credit-cards/${form.id}`, body);
    else await http.post("/credit-cards", body);

    open.value = false;
    await fetchAll();
  } finally {
    saving.value = false;
  }
}

async function remove(it: any) {
  await http.delete(`/credit-cards/${it.id}`);
  await fetchAll();
}

onMounted(fetchAll);
</script>
