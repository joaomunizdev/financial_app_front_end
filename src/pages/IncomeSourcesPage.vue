<template>
  <div class="d-flex flex-column gap-4">
    <div class="d-flex align-center justify-space-between">
      <div class="text-h5">Fontes de renda</div>
      <v-btn prepend-icon="mdi-plus" @click="open = true">Nova fonte de renda</v-btn>
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
        <template #item.amount="{ item }">
          {{ currencyCell(item.amount) }}
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
          form.id ? "Editar fonte de renda" : "Nova fonte de renda"
        }}</v-card-title>
        <v-card-text>
          <v-form ref="formRef" @submit.prevent="save">
            <v-select
              v-model="form.tenantId"
              :items="tenants"
              item-title="name"
              item-value="id"
              label="Responsável"
              prepend-inner-icon="mdi-account-outline"
              :error-messages="errors.tenantId"
            />
            <v-text-field
              v-model="form.description"
              label="Descrição"
              :error-messages="errors.description"
            />
            <v-text-field
              v-model="form.amount"
              label="Valor (BRL)"
              :error-messages="errors.amount"
              @update:modelValue="onAmountInput"
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

const { toNumberBRL, toCurrencyBRL, formatCurrencyOnType } = useCurrency();

const loading = ref(false);
const saving = ref(false);
const open = ref(false);
const dialogKey = ref(0);
const formRef = ref<any>(null);

const items = ref<any[]>([]);
const tenants = ref<any[]>([]);
const headers = [
  { title: "Responsável", key: "tenantName" },
  { title: "Descrição", key: "description" },
  { title: "Valor", key: "amount", align: "end" as const },
  { title: "", key: "actions", align: "end" as const, sortable: false },
];

function onAmountInput(val: string) {
  form.amount = formatCurrencyOnType(val);
}

type FormT = {
  id?: string;
  tenantId: string;
  description: string;
  amount: string;
};

const form = reactive<FormT>({
  id: "",
  tenantId: "",
  description: "",
  amount: "",
});

const errors = reactive<Record<keyof FormT | string, string[]>>({
  id: [],
  tenantId: [],
  description: [],
  amount: [],
});

const schema = yup.object({
  id: yup.string().optional(),
  tenantId: yup.string().required("O responsável é obrigatório"),
  description: yup
    .string()
    .required("Descrição é obrigatória")
    .trim()
    .min(1, "Descrição é obrigatória"),
  amount: yup
    .string()
    .required("Valor é obrigatório")
    .test("brl-format", "Informe um valor válido em BRL", (value) => {
      if (!value) return false;
      const n = toNumberBRL(value);
      return !isNaN(n) && isFinite(n) && n >= 0;
    }),
});

function clearErrors() {
  Object.keys(errors).forEach((k) => (errors[k] = []));
  nextTick(() => formRef.value?.resetValidation?.());
}

function resetForm() {
  Object.assign(form, {
    id: "",
    tenantId: "",
    description: "",
    amount: "",
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

function edit(it: any) {
  Object.assign(form, {
    id: it.id ?? "",
    tenantId: it.tenantId ?? it.tenant?.id ?? "",
    description: it.description ?? "",
    amount: toCurrencyBRL(it.amount ?? "0"),
  });
  clearErrors();
  open.value = true;
}

watch(open, (val) => {
  if (!val) {
    resetForm();
    clearErrors();
    dialogKey.value++;
  }
});

function onCancel() {
  open.value = false;
}

function currencyCell(v: string | number) {
  return toCurrencyBRL(v);
}

async function fetchAll() {
  loading.value = true;
  try {
    const [incomeSourcesRes, tenantsRes] = await Promise.all([
      http.get("/income-sources"),
      http.get("/tenants"),
    ]);
    items.value = (incomeSourcesRes.data || []).map((item: any) => ({
      ...item,
      tenantName: item.tenant?.name ?? "—",
    }));
    tenants.value = tenantsRes.data || [];
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    const ok = await validateAll();
    if (!ok) return;

    const amount = toNumberBRL(form.amount);
    const body = {
      tenantId: form.tenantId,
      description: form.description.trim(),
      amount: Number(amount.toFixed(2)),
    };

    if (form.id) await http.patch(`/income-sources/${form.id}`, body);
    else await http.post("/income-sources", body);

    open.value = false;
    await fetchAll();
  } finally {
    saving.value = false;
  }
}

async function remove(it: any) {
  await http.delete(`/income-sources/${it.id}`);
  await fetchAll();
}

onMounted(fetchAll);
</script>
