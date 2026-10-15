<template>
  <div class="d-flex flex-column ga-6">
    <PageHeader
      title="Despesas fixas"
      description="Gastos recorrentes que não dependem de cartão, como aluguel e contas."
    >
      <v-btn prepend-icon="mdi-plus" @click="openNew">Nova despesa fixa</v-btn>
    </PageHeader>
    <v-card>
      <v-data-table-server
        :items="items"
        :headers="headers"
        :loading="loading"
        :items-length="total"
        :page="options.page"
        :items-per-page="options.itemsPerPage"
        :sort-by="options.sortBy"
        @update:options="onOptions"
        class="pa-2"
      >
        <template #item.tenantName="{ item }">
          {{ item.tenant?.name ?? "—" }}
        </template>
        <template #item.amount="{ item }">
          {{ toCurrencyBRL(item.amount) }}
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
        <template #no-data>
          <EmptyState
            :image="emptyExpenses"
            title="Nenhuma despesa fixa"
            description="Aluguel, contas e outros gastos recorrentes fora do cartão."
            action-text="Nova despesa fixa"
            @action="openNew"
          />
        </template>
      </v-data-table-server>
    </v-card>

    <v-dialog v-model="open" max-width="520" :key="dialogKey">
      <v-card>
        <v-card-title>{{
          form.id ? "Editar despesa fixa" : "Nova despesa fixa"
        }}</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="save">
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
              maxlength="180"
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
import PageHeader from "../components/PageHeader.vue";
import EmptyState from "../components/EmptyState.vue";
import emptyExpenses from "../assets/empty/empty-expenses.webp";
import { ref, reactive, onMounted, watch } from "vue";
import { usePagedList } from "../composables/usePagedList";
import http from "../plugins/http";
import * as yup from "yup";
import { useCurrency } from "../composables/useCurrency";
import { useFormErrors } from "../composables/useFormErrors";
import { moneyField } from "../schemas/money";
import { useConfirmStore } from "../stores/confirm";
import type { FixedExpense, Tenant } from "../types/domain";

const { toCurrencyBRL, formatCurrencyOnType, toApiMoney } = useCurrency();
const confirm = useConfirmStore();

const saving = ref(false);
const open = ref(false);
const dialogKey = ref(0);

const { items, total, loading, options, onOptions, reload } = usePagedList<FixedExpense>(
  "/fixed-expenses"
);
const tenants = ref<Tenant[]>([]);
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
  id: string;
  tenantId: string;
  description: string;
  amount: string;
};

const emptyForm = (): FormT => ({
  id: "",
  tenantId: "",
  description: "",
  amount: "",
});

const form = reactive<FormT>(emptyForm());

const schema = yup.object({
  tenantId: yup.string().required("O responsável é obrigatório"),
  description: yup
    .string()
    .trim()
    .required("Descrição é obrigatória")
    .max(180, "Máximo de 180 caracteres"),
  amount: moneyField(),
});

const { errors, clearErrors, validateAll } = useFormErrors(schema, [
  "tenantId",
  "description",
  "amount",
] as const);

function openNew() {
  Object.assign(form, emptyForm());
  clearErrors();
  open.value = true;
}

function edit(it: FixedExpense) {
  Object.assign(form, {
    id: it.id,
    tenantId: it.tenantId ?? it.tenant?.id ?? "",
    description: it.description ?? "",
    amount: toCurrencyBRL(it.amount ?? "0"),
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

async function fetchTenants() {
  tenants.value = (await http.get<Tenant[]>("/tenants")).data || [];
}

async function save() {
  saving.value = true;
  try {
    if (!(await validateAll(form))) return;

    const body = {
      tenantId: form.tenantId,
      description: form.description.trim(),
      amount: toApiMoney(form.amount),
    };

    if (form.id) await http.patch(`/fixed-expenses/${form.id}`, body);
    else await http.post("/fixed-expenses", body);

    open.value = false;
    await reload();
  } finally {
    saving.value = false;
  }
}

async function remove(it: FixedExpense) {
  const confirmed = await confirm.ask({
    title: "Excluir despesa fixa",
    message: `Deseja excluir a despesa "${it.description}"? Essa ação não pode ser desfeita.`,
  });
  if (!confirmed) return;
  await http.delete(`/fixed-expenses/${it.id}`);
  await reload();
}

onMounted(fetchTenants);
</script>
