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
        <template #item.limitAmount="{ item }">{{
          currency(item.limitAmount)
        }}</template>
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

    <v-dialog v-model="open" max-width="520">
      <v-card>
        <v-card-title>{{
          form.id ? "Editar cartão" : "Novo cartão"
        }}</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="save">
            <v-text-field v-model="form.nickname" label="Apelido" />
            <v-text-field v-model="form.brand" label="Bandeira" />
            <v-text-field v-model="form.last4" label="Final" maxlength="4" />
            <v-text-field v-model="form.limitAmount" label="Limite (BRL)" />
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
import { ref, reactive, onMounted } from "vue";
import http from "../plugins/http";

const loading = ref(false);
const saving = ref(false);
const open = ref(false);
const items = ref<any[]>([]);
const headers = [
  { title: "Apelido", key: "nickname" },
  { title: "Bandeira", key: "brand" },
  { title: "Final", key: "last4" },
  { title: "Limite", key: "limitAmount", align: "end" },
  { title: "", key: "actions", align: "end", sortable: false },
];

const form = reactive<any>({
  id: "",
  nickname: "",
  brand: "",
  last4: "",
  limitAmount: "",
});

function currency(v: string) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function edit(it: any) {
  Object.assign(form, it);
  open.value = true;
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
    const body = {
      nickname: form.nickname,
      brand: form.brand,
      last4: form.last4,
      limitAmount: form.limitAmount,
    };
    if (form.id) await http.patch(`/credit-cards/${form.id}`, body);
    else await http.post("/credit-cards", body);
    open.value = false;
    Object.assign(form, {
      id: "",
      nickname: "",
      brand: "",
      last4: "",
      limitAmount: "",
    });
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
