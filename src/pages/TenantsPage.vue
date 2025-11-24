<template>
  <div class="d-flex flex-column gap-4">
    <
    <div class="d-flex align-center justify-space-between">
      <div class="text-h5">Responsáveis</div>
      <v-btn prepend-icon="mdi-plus" @click="openNew">Novo</v-btn>
    </div>
    <v-row>
      <v-col cols="12"></v-col>
      <v-col cols="12"></v-col>
    </v-row>
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
          <v-btn icon variant="text" @click="edit(item)"
            ><v-icon>mdi-pencil</v-icon></v-btn
          >
          <v-btn icon variant="text" color="error" @click="remove(item)"
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
          <v-form ref="formRef" @submit.prevent="save">
            <v-text-field
              v-model="form.name"
              label="Nome"
              :error-messages="errors.name"
              @blur="validateField('name')"
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
import { ref, reactive, onMounted, computed, watch, nextTick } from "vue";
import http from "../plugins/http";
import * as yup from "yup";

const loading = ref(false);
const saving = ref(false);
const open = ref(false);
const formRef = ref<any>(null);

const search = ref("");
const items = ref<any[]>([]);
const headers = [
  { title: "Nome", key: "name" },
  { title: "", key: "actions", align: "end" as const, sortable: false },
];

const form = reactive<{ id: string; name: string }>({ id: "", name: "" });

const schema = yup.object({
  id: yup.string().optional(),
  name: yup
    .string()
    .required("Nome é obrigatório")
    .trim()
    .min(1, "Nome é obrigatório"),
});

const errors = reactive<Record<"id" | "name", string[]>>({
  id: [],
  name: [],
});

function clearErrors() {
  errors.id = [];
  errors.name = [];
  nextTick(() => formRef.value?.resetValidation?.());
}

function resetForm() {
  form.id = "";
  form.name = "";
}

async function validateAll(): Promise<boolean> {
  clearErrors();
  try {
    await schema.validate(form, { abortEarly: false });
    return true;
  } catch (e: any) {
    if (Array.isArray(e?.inner)) {
      e.inner.forEach((err: any) => {
        if (err?.path && (errors as any)[err.path] !== undefined) {
          (errors as any)[err.path].push(err.message);
        }
      });
    } else if (e?.path) {
      (errors as any)[e.path] = [e.message];
    }
    return false;
  }
}

async function validateField(field: "name") {
  errors[field] = [];
  try {
    const fieldSchema = schema.pick([field]);
    await fieldSchema.validate({ [field]: form[field] }, { abortEarly: false });
  } catch (e: any) {
    errors[field] = e?.errors ?? [e?.message].filter(Boolean);
  }
}

// ---- Abrir NOVO sempre limpo
function openNew() {
  resetForm();
  clearErrors();
  open.value = true;
}

// ---- Editar: preenche, limpa erros e abre
function edit(it: any) {
  Object.assign(form, { id: it.id ?? "", name: (it.name ?? "").toString() });
  clearErrors();
  open.value = true;
}

// ---- Fechar modal: limpa tudo
function onCancel() {
  open.value = false;
}
watch(open, (v) => {
  if (!v) {
    resetForm();
    clearErrors();
  }
});

// ---- resto do seu código
const filtered = computed(() => {
  if (!search.value) return items.value;
  return items.value.filter((x) =>
    x.name?.toLowerCase().includes(search.value.toLowerCase())
  );
});

async function fetchAll() {
  loading.value = true;
  try {
    const { data } = await http.get("/tenants");
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

    if (form.id)
      await http.patch(`/tenants/${form.id}`, { name: form.name.trim() });
    else await http.post("/tenants", { name: form.name.trim() });

    open.value = false; // watcher limpa tudo
    await fetchAll();
  } finally {
    saving.value = false;
  }
}

async function remove(it: any) {
  await http.delete(`/tenants/${it.id}`);
  await fetchAll();
}

onMounted(fetchAll);
</script>
