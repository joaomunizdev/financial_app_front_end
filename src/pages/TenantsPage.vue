<template>
  <div class="d-flex flex-column gap-4">
    <div class="d-flex align-center justify-space-between">
      <div class="text-h5">Responsáveis</div>
      <v-btn prepend-icon="mdi-plus" @click="open = true">Novo</v-btn>
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
          <v-form @submit.prevent="save">
            <v-text-field v-model="form.name" label="Nome" />
            <v-btn type="submit" :loading="saving" class="mt-2">Salvar</v-btn>
            <v-btn variant="text" class="mt-2 ml-2" @click="open = false"
              >Cancelar</v-btn
            >
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import http from "../plugins/http";

const loading = ref(false);
const saving = ref(false);
const open = ref(false);
const search = ref("");
const items = ref<any[]>([]);
const headers = [
  { title: "Nome", key: "name" },
  { title: "", key: "actions", align: "end", sortable: false },
];

const form = reactive<any>({ id: "", name: "" });

const filtered = computed(() => {
  if (!search.value) return items.value;
  return items.value.filter((x) =>
    x.name?.toLowerCase().includes(search.value.toLowerCase())
  );
});

function edit(it: any) {
  Object.assign(form, it);
  open.value = true;
}

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
    if (form.id) await http.patch(`/tenants/${form.id}`, { name: form.name });
    else await http.post("/tenants", { name: form.name });
    open.value = false;
    Object.assign(form, { id: "", name: "" });
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
