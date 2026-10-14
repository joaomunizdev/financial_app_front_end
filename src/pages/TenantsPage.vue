<template>
  <div class="d-flex flex-column ga-6">
    <div class="d-flex align-center justify-space-between">
      <div class="text-h5">Responsáveis</div>
      <v-btn prepend-icon="mdi-plus" @click="openNew">Novo</v-btn>
    </div>
    <v-card>
      <v-text-field
        v-model="search"
        class="ma-4"
        placeholder="Buscar por nome"
        prepend-inner-icon="mdi-magnify"
      />
      <v-data-table
        :items="filtered"
        :headers="headers"
        :loading="loading"
        class="pa-2"
      >
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

    <v-dialog v-model="open" max-width="480">
      <v-card>
        <v-card-title>{{
          form.id ? "Editar responsável" : "Novo responsável"
        }}</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="save">
            <v-text-field
              v-model="form.name"
              label="Nome"
              maxlength="120"
              :error-messages="errors.name"
              @blur="validateField('name', form)"
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
import { ref, reactive, onMounted, computed, watch } from "vue";
import http from "../plugins/http";
import * as yup from "yup";
import { useFormErrors } from "../composables/useFormErrors";
import { useConfirmStore } from "../stores/confirm";
import type { Tenant } from "../types/domain";

const confirm = useConfirmStore();

const loading = ref(false);
const saving = ref(false);
const open = ref(false);

const search = ref("");
const items = ref<Tenant[]>([]);
const headers = [
  { title: "Nome", key: "name" },
  { title: "", key: "actions", align: "end" as const, sortable: false },
];

const form = reactive<{ id: string; name: string }>({ id: "", name: "" });

const schema = yup.object({
  name: yup
    .string()
    .trim()
    .required("Nome é obrigatório")
    .max(120, "Máximo de 120 caracteres"),
});

const { errors, clearErrors, validateAll, validateField } = useFormErrors(
  schema,
  ["name"] as const
);

function resetForm() {
  form.id = "";
  form.name = "";
}

function openNew() {
  resetForm();
  clearErrors();
  open.value = true;
}

function edit(it: Tenant) {
  Object.assign(form, { id: it.id, name: (it.name ?? "").toString() });
  clearErrors();
  open.value = true;
}

function onCancel() {
  open.value = false;
}
watch(open, (v) => {
  if (!v) {
    resetForm();
    clearErrors();
  }
});

const filtered = computed(() => {
  if (!search.value) return items.value;
  const term = search.value.toLowerCase();
  return items.value.filter((x) => x.name?.toLowerCase().includes(term));
});

async function fetchAll() {
  loading.value = true;
  try {
    const { data } = await http.get<Tenant[]>("/tenants");
    items.value = data || [];
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    if (!(await validateAll(form))) return;

    const body = { name: form.name.trim() };
    if (form.id) await http.patch(`/tenants/${form.id}`, body);
    else await http.post("/tenants", body);

    open.value = false;
    await fetchAll();
  } finally {
    saving.value = false;
  }
}

async function remove(it: Tenant) {
  const confirmed = await confirm.ask({
    title: "Excluir responsável",
    message: `Deseja excluir "${it.name}"? Responsáveis com compras vinculadas não podem ser excluídos. Essa ação não pode ser desfeita.`,
  });
  if (!confirmed) return;
  await http.delete(`/tenants/${it.id}`);
  await fetchAll();
}

onMounted(fetchAll);
</script>
