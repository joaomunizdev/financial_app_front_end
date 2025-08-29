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
          <v-btn icon variant="text" color="primary" @click="openExport(item)">
            <v-icon>mdi-file-pdf-box</v-icon>
          </v-btn>
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
    <v-dialog v-model="exportDlg.open" max-width="560">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Exportar PDF do responsável</span>
          <v-chip size="small" variant="tonal" v-if="exportDlg.tenant">
            {{ exportDlg.tenant.name }}
          </v-chip>
        </v-card-title>

        <v-card-text>
          <div class="mb-3 text-body-2">
            Selecione a fatura salva (statement) para gerar o PDF com compras e
            assinaturas desse mês.
          </div>

          <v-select
            v-model="exportDlg.statementId"
            :items="exportDlg.statements"
            :loading="exportDlg.loading"
            item-title="label"
            item-value="id"
            label="Fatura (Cartão — Período)"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-calendar-month-outline"
            :disabled="exportDlg.loading || exportDlg.statements.length === 0"
          />

          <div
            v-if="!exportDlg.loading && exportDlg.statements.length === 0"
            class="mt-2 text-medium-emphasis"
          >
            Nenhuma fatura encontrada. Gere uma fatura antes de exportar.
          </div>
        </v-card-text>

        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="closeExport">Cancelar</v-btn>
          <v-btn
            color="primary"
            :loading="exportDlg.downloading"
            :disabled="!exportDlg.statementId"
            @click="exportPdf()"
            >Exportar</v-btn
          >
        </v-card-actions>
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
  { title: "", key: "actions", align: "end" as const, sortable: false },
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

type Tenant = { id: string; name: string };
type Card = { id: string; nickname: string };
type Statement = {
  id: string;
  creditCardId: string;
  year: number;
  month: number;
};

const exportDlg = reactive<{
  open: boolean;
  tenant: Tenant | null;
  statements: Array<{ id: string; label: string; year: number; month: number }>;
  statementId: string | null;
  loading: boolean;
  downloading: boolean;
}>({
  open: false,
  tenant: null,
  statements: [],
  statementId: null,
  loading: false,
  downloading: false,
});

async function openExport(tenant: Tenant) {
  exportDlg.open = true;
  exportDlg.tenant = tenant;
  exportDlg.statements = [];
  exportDlg.statementId = null;
  exportDlg.loading = true;

  try {
    const cards: Card[] = (await http.get("/credit-cards")).data || [];

    const lists = await Promise.all(
      cards.map(async (c) => {
        const data = await http.get("/statements", {
          params: { creditCardId: c.id },
        });
        const stmts: Statement[] = Array.isArray(data.data) ? data.data : [];
        return stmts.map((s) => ({
          id: s.id,
          label: `${c.nickname} — ${s.year}-${String(s.month).padStart(
            2,
            "0"
          )}`,
          year: s.year,
          month: s.month,
        }));
      })
    );

    exportDlg.statements = lists
      .flat()
      .sort((a, b) => a.label.localeCompare(b.label));
  } finally {
    exportDlg.loading = false;
  }
}

function closeExport() {
  exportDlg.open = false;
  exportDlg.tenant = null;
  exportDlg.statements = [];
  exportDlg.statementId = null;
}

async function exportPdf() {
  if (!exportDlg.statementId || !exportDlg.tenant) return;
  exportDlg.downloading = true;
  try {
    const st = exportDlg.statements.find((s) => s.id === exportDlg.statementId);
    if (!st) throw new Error("Statement not found");

    const resp = await http.get(
      `/reports/tenants/${exportDlg.tenant.id}/monthly-pdf`,
      {
        params: {
          year: st.year,
          month: st.month,
        },
        responseType: "blob",
      }
    );

    const cd = resp.headers?.["content-disposition"] as string | undefined;
    const filename =
      parseFilenameFromContentDisposition(cd) ||
      `relatório_${slug(exportDlg.tenant.name)}_${st.year}-${String(
        st.month
      ).padStart(2, "0")}.pdf`;

    const blob = new Blob([resp.data], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    closeExport();
  } finally {
    exportDlg.downloading = false;
  }
}

function parseFilenameFromContentDisposition(cd?: string): string | null {
  if (!cd) return null;
  const m = /filename\*?=(?:UTF-8''|")?([^\";]+)\"?/.exec(cd);
  if (m?.[1]) {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return m[1];
    }
  }
  return null;
}

function slug(s: string) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

onMounted(fetchAll);
</script>
