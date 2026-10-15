<template>
  <div class="d-flex flex-column ga-6">
    <PageHeader
      title="Categorias"
      description="Classifique compras e assinaturas. As categorias padrão valem para todas as contas; as suas ficam só na sua."
    >
      <v-btn prepend-icon="mdi-plus" @click="openNew">Nova</v-btn>
    </PageHeader>
    <v-sheet class="pa-3 d-flex flex-wrap align-center ga-3" color="surface" border>
      <v-text-field
        v-model="search"
        placeholder="Buscar por nome"
        prepend-inner-icon="mdi-magnify"
        hide-details
        style="min-width: 280px"
      />
    </v-sheet>

    <v-card>
      <h2 class="section-title px-6 pt-5">Suas categorias</h2>
      <v-data-table
        :items="ownItems"
        :headers="ownHeaders"
        :loading="loading"
        :hide-default-footer="ownItems.length <= 10"
        class="pa-2"
      >
        <template #item.name="{ item }">
          <CategoryLabel :category="item" />
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
            v-if="search"
            :image="emptySearch"
            title="Nenhuma categoria sua encontrada"
            :description="`Nada corresponde a “${search}”.`"
            action-text="Limpar busca"
            action-icon="mdi-close"
            @action="search = ''"
          />
          <EmptyState
            v-else
            :image="emptyCategories"
            title="Crie categorias do seu jeito"
            description="Além das padrão, crie categorias próprias para organizar seus gastos."
            action-text="Nova categoria"
            @action="openNew"
          />
        </template>
      </v-data-table>
    </v-card>

    <v-card>
      <h2 class="section-title px-6 pt-5">Categorias padrão</h2>
      <p class="text-body-2 text-medium-emphasis px-6">
        Disponíveis em todas as contas. Não podem ser alteradas.
      </p>
      <v-data-table
        :items="defaultItems"
        :headers="defaultHeaders"
        :loading="loading"
        :items-per-page="-1"
        hide-default-footer
        class="pa-2"
      >
        <template #item.name="{ item }">
          <CategoryLabel :category="item" />
        </template>
        <template #no-data>
          <EmptyState
            :image="emptySearch"
            title="Nenhuma categoria padrão encontrada"
            :description="`Nada corresponde a “${search}”.`"
            action-text="Limpar busca"
            action-icon="mdi-close"
            @action="search = ''"
          />
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="open" max-width="520">
      <v-card>
        <v-card-title>{{ form.id ? "Editar categoria" : "Nova categoria" }}</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="save">
            <v-text-field
              v-model="form.name"
              label="Nome"
              maxlength="60"
              :prepend-inner-icon="form.icon"
              :error-messages="errors.name"
              @blur="validateField('name', form)"
            />
            <div class="text-body-2 text-medium-emphasis mt-2 mb-2">Ícone</div>
            <div class="icon-grid" role="radiogroup" aria-label="Ícone">
              <v-btn
                v-for="icon in CATEGORY_ICONS"
                :key="icon"
                icon
                size="small"
                role="radio"
                :aria-checked="form.icon === icon"
                :aria-label="icon.replace('mdi-', '')"
                :variant="form.icon === icon ? 'tonal' : 'text'"
                :color="form.icon === icon ? 'primary' : 'default'"
                @click="form.icon = icon"
              >
                <v-icon :icon="icon" />
              </v-btn>
            </div>
            <v-btn type="submit" :loading="saving" class="mt-4">Salvar</v-btn>
            <v-btn variant="text" class="mt-4 ml-2" @click="open = false">Cancelar</v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import PageHeader from "../components/PageHeader.vue";
import EmptyState from "../components/EmptyState.vue";
import CategoryLabel from "../components/CategoryLabel.vue";
import emptyCategories from "../assets/empty/empty-categories.webp";
import emptySearch from "../assets/empty/empty-search.webp";
import { ref, reactive, onMounted, computed, watch } from "vue";
import http from "../plugins/http";
import * as yup from "yup";
import { useFormErrors } from "../composables/useFormErrors";
import { useConfirmStore } from "../stores/confirm";
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from "../utils/categories";
import type { Category } from "../types/domain";

const confirm = useConfirmStore();

const loading = ref(false);
const saving = ref(false);
const open = ref(false);

const search = ref("");
const items = ref<Category[]>([]);
const ownHeaders = [
  { title: "Nome", key: "name" },
  { title: "", key: "actions", align: "end" as const, sortable: false },
];
const defaultHeaders = [{ title: "Nome", key: "name" }];

type FormT = { id: string; name: string; icon: string };
const emptyForm = (): FormT => ({ id: "", name: "", icon: DEFAULT_CATEGORY_ICON });
const form = reactive<FormT>(emptyForm());

// Mirrors the backend (1–60 chars, unique per account ignoring case, defaults included).
const schema = yup.object({
  name: yup
    .string()
    .trim()
    .required("Nome é obrigatório")
    .max(60, "Máximo de 60 caracteres")
    .test(
      "unique",
      "Já existe uma categoria com esse nome",
      (v) =>
        !items.value.some(
          (c) => c.id !== form.id && c.name.toLowerCase() === (v ?? "").trim().toLowerCase()
        )
    ),
});
const { errors, clearErrors, validateAll, validateField } = useFormErrors(schema, [
  "name",
] as const);

function openNew() {
  Object.assign(form, emptyForm());
  clearErrors();
  open.value = true;
}

function edit(it: Category) {
  Object.assign(form, { id: it.id, name: it.name, icon: it.icon });
  clearErrors();
  open.value = true;
}

watch(open, (v) => {
  if (!v) {
    Object.assign(form, emptyForm());
    clearErrors();
  }
});

const filtered = computed(() => {
  if (!search.value) return items.value;
  const term = search.value.toLowerCase();
  return items.value.filter((x) => x.name.toLowerCase().includes(term));
});
const ownItems = computed(() => filtered.value.filter((c) => !c.isDefault));
const defaultItems = computed(() => filtered.value.filter((c) => c.isDefault));

async function fetchAll() {
  loading.value = true;
  try {
    const { data } = await http.get<Category[]>("/categories");
    items.value = data || [];
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    if (!(await validateAll(form))) return;
    const body = { name: form.name.trim(), icon: form.icon };
    if (form.id) await http.patch(`/categories/${form.id}`, body);
    else await http.post("/categories", body);
    open.value = false;
    await fetchAll();
  } finally {
    saving.value = false;
  }
}

async function remove(it: Category) {
  const confirmed = await confirm.ask({
    title: "Excluir categoria",
    message: `Deseja excluir "${it.name}"? As compras, assinaturas e itens de fatura dessa categoria ficarão sem categoria. Essa ação não pode ser desfeita.`,
  });
  if (!confirmed) return;
  await http.delete(`/categories/${it.id}`);
  await fetchAll();
}

onMounted(fetchAll);
</script>

<style scoped>
.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  gap: 4px;
}
</style>
