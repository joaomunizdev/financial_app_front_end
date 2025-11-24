<template>
  <div class="reports-page">
    <div class="d-flex flex-wrap align-center justify-space-between gap-2 mt-2">
      <div>
        <div class="text-h5">Relatórios</div>
        <div class="text-body-2 text-medium-emphasis">
          Filtre por cartão ou período para analisar os valores consolidados.
        </div>
      </div>
      <div class="reports-actions">
        <v-btn
          color="primary"
          prepend-icon="mdi-file-pdf-box"
          variant="flat"
          @click="openExportDialog"
        >
          Exportar PDF
        </v-btn>
        <v-btn
          variant="tonal"
          prepend-icon="mdi-refresh"
          :loading="loading"
          @click="fetchAll"
        >
          Atualizar
        </v-btn>
      </div>
    </div>

    <FilterBar
      class="mt-2"
      :cards="cards"
      :statements="statements"
      :model-value-card-id="creditCardId"
      :model-value-statement-id="statementId"
      @update:cardId="onCardChange"
      @update:statementId="(v) => (statementId = v)"
      @apply="fetchAll"
      @clear="clearFilter"
    />

    <v-row class="reports-stats-row">
      <v-col cols="12" md="4">
        <StatCard
          label="Total filtrado"
          :value="currency(globalTotal)"
          icon="mdi-cash-multiple"
        />
      </v-col>
      <v-col cols="12" md="4">
        <StatCard
          label="Total de cartões"
          :value="cards.length.toString()"
          icon="mdi-credit-card-outline"
        />
      </v-col>
      <v-col cols="12" md="4">
        <StatCard
          label="Responsáveis"
          :value="tenants.length.toString()"
          icon="mdi-account-multiple-outline"
        />
      </v-col>
    </v-row>

    <v-card class="reports-table-card">
      <v-card-title class="d-flex align-center justify-space-between">
        Totais por responsável
        <v-chip
          v-if="activeStatementLabel"
          color="primary"
          variant="tonal"
          size="small"
        >
          {{ activeStatementLabel }}
        </v-chip>
      </v-card-title>
      <v-data-table
        :items="byTenant"
        :headers="headers"
        :loading="loading"
        class="pa-2"
      />
    </v-card>
    <v-dialog v-model="exportDlg.open" max-width="560">
      <v-card>
        <v-card-title>Exportar PDF mensal</v-card-title>
        <v-card-text>
          <div class="mb-3 text-body-2">
            Escolha o responsável e o período para gerar o relatório completo.
          </div>
          <v-select
            v-model="exportDlg.tenantId"
            :items="tenants"
            item-title="name"
            item-value="id"
            label="Responsável"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-account"
          />
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
          <v-btn variant="text" @click="closeExportDialog">Cancelar</v-btn>
          <v-btn
            color="primary"
            :loading="exportDlg.downloading"
            :disabled="!exportDlg.statementId || !exportDlg.tenantId"
            @click="exportPdfReport"
            >Exportar</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import FilterBar from "../components/FilterBar.vue";
import StatCard from "../components/StatCard.vue";
import { http } from "../stores/auth";

const loading = ref(false);
const cards = ref<any[]>([]);
const tenants = ref<any[]>([]);
const byTenant = ref<any[]>([]);
const statements = ref<any[]>([]);
const creditCardId = ref("");
const statementId = ref("");
const globalTotal = ref(0);

const exportDlg = reactive<{
  open: boolean;
  tenantId: string;
  statements: Array<{ id: string; label: string; year: number; month: number }>;
  statementId: string;
  loading: boolean;
  downloading: boolean;
}>({
  open: false,
  tenantId: "",
  statements: [],
  statementId: "",
  loading: false,
  downloading: false,
});

const headers = [
  { title: "Responsável", key: "tenantName" },
  { title: "Total", key: "totalAmount", align: "end" as const },
];

const activeStatementLabel = computed(() => {
  if (!statementId.value) return "";
  return statements.value.find((s) => s.id === statementId.value)?.periodLabel;
});

function currency(v: string | number) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function loadCards() {
  cards.value = (await http.get("/credit-cards")).data || [];
  if (!creditCardId.value && cards.value.length) {
    creditCardId.value = cards.value[0].id;
    await loadStatements();
  }
}

async function loadStatements() {
  statements.value = [];
  statementId.value = "";
  if (!creditCardId.value) return;
  const list =
    (
      await http.get("/statements", {
        params: { creditCardId: creditCardId.value },
      })
    ).data || [];
  statements.value = list.map((s: any) => ({
    ...s,
    periodLabel: `${String(s.month).padStart(2, "0")}/${s.year}`,
  }));
  if (statements.value.length) statementId.value = statements.value[0].id;
}

async function fetchAll() {
  loading.value = true;
  try {
    const params = statementId.value ? { statementId: statementId.value } : {};
    const [g, t, tn] = await Promise.all([
      http.get("/reports/global", { params }),
      http.get("/reports/by-tenant", { params }),
      http.get("/tenants"),
    ]);
    globalTotal.value = Number(g.data.totalAmount || g.data?.totalamount || 0);
    byTenant.value = (t.data || []).map((x: any) => ({
      ...x,
      totalAmount: currency(x.totalAmount || x.totalamount),
    }));
    tenants.value = tn.data || [];
  } finally {
    loading.value = false;
  }
}

async function onCardChange(v: string) {
  creditCardId.value = v;
  await loadStatements();
}

async function clearFilter() {
  statementId.value = "";
  await fetchAll();
}

async function openExportDialog() {
  if (!tenants.value.length) {
    tenants.value = (await http.get("/tenants")).data || [];
  }
  exportDlg.open = true;
  exportDlg.tenantId = tenants.value[0]?.id || "";
  exportDlg.statements = [];
  exportDlg.statementId = "";
  await loadExportStatements();
}

function closeExportDialog() {
  exportDlg.open = false;
  exportDlg.statements = [];
  exportDlg.statementId = "";
}

async function loadExportStatements() {
  exportDlg.loading = true;
  try {
    if (!cards.value.length) {
      const res = await http.get("/credit-cards");
      cards.value = res.data || [];
    }
    const lists = await Promise.all(
      cards.value.map(async (card: any) => {
        const { data } = await http.get("/statements", {
          params: { creditCardId: card.id },
        });
        return (Array.isArray(data) ? data : []).map((s: any) => ({
          year: s.year,
          month: s.month,
        }));
      })
    );
    const grouped = new Map<string, { id: string; label: string; year: number; month: number }>();
    lists.flat().forEach((stmt) => {
      const key = `${String(stmt.month).padStart(2, "0")}/${stmt.year}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          id: key,
          label: `Fatura - ${key}`,
          year: stmt.year,
          month: stmt.month,
        });
      }
    });
    exportDlg.statements = Array.from(grouped.values()).sort((a, b) =>
      b.label.localeCompare(a.label)
    );
  } finally {
    exportDlg.loading = false;
  }
}

async function exportPdfReport() {
  if (!exportDlg.statementId || !exportDlg.tenantId) return;
  exportDlg.downloading = true;
  try {
    const st = exportDlg.statements.find((s) => s.id === exportDlg.statementId);
    const tenant = tenants.value.find((t) => t.id === exportDlg.tenantId);
    if (!st || !tenant) throw new Error("Dados inválidos");

    const resp = await http.get(
      `/reports/tenants/${tenant.id}/monthly-pdf`,
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
      `relatório_${slug(tenant.name)}_${st.year}-${String(st.month).padStart(
        2,
        "0"
      )}.pdf`;

    const blob = new Blob([resp.data], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    closeExportDialog();
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

onMounted(async () => {
  await loadCards();
  await fetchAll();
});
</script>

<style scoped>
.reports-page {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.reports-stats-row {
  margin: 0;
}

.reports-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.reports-stats-row :deep(.v-col) {
  padding-top: 12px;
  padding-bottom: 12px;
}

.reports-table-card {
  margin-top: 8px;
}
</style>
