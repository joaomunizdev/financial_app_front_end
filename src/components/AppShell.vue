<template>
  <v-app>
    <template v-if="isAuthPage">
      <v-main class="auth-main">
        <div class="auth-theme-switch">
          <ThemeSwitcher />
        </div>
        <div class="auth-layout px-4">
          <AppLogo class="mb-2" />
          <p class="text-body-2 text-medium-emphasis text-center mb-6">
            Centralize seus cartões, controle compras e acompanhe faturas em um
            só lugar.
          </p>
          <router-view />
        </div>
      </v-main>
    </template>

    <template v-else>
      <v-navigation-drawer
        v-model="drawer"
        :rail="rail && !mobile"
        :temporary="mobile"
        :permanent="!mobile"
        width="240"
        rail-width="64"
        color="surface"
        class="app-drawer"
      >
        <div class="app-drawer__logo">
          <AppLogo :compact="rail && !mobile" />
        </div>

        <v-list nav density="compact" class="app-nav">
          <template v-for="group in navGroups" :key="group.label">
            <v-list-subheader v-if="!(rail && !mobile)" class="app-nav__label">
              {{ group.label }}
            </v-list-subheader>
            <v-divider v-else class="my-2 mx-2" />
            <v-list-item
              v-for="item in group.items"
              :key="item.to"
              :to="item.to"
              :prepend-icon="item.icon"
              :title="item.title"
              v-tooltip:end="rail && !mobile ? item.title : undefined"
              rounded="lg"
              class="app-nav__item"
            />
          </template>
        </v-list>

        <template #append>
          <div
            class="app-drawer__footer"
            :class="{ 'app-drawer__footer--rail': rail && !mobile }"
          >
            <v-menu location="top start">
              <template #activator="{ props }">
                <button
                  v-bind="props"
                  type="button"
                  class="app-user"
                  aria-label="Menu da conta"
                >
                  <v-avatar size="32" color="primary" variant="tonal">
                    <span class="text-caption font-weight-medium">{{
                      userInitials
                    }}</span>
                  </v-avatar>
                  <span v-if="!(rail && !mobile)" class="app-user__email">{{
                    auth.userEmail || "Minha conta"
                  }}</span>
                </button>
              </template>
              <v-list density="compact" min-width="200">
                <v-list-item
                  prepend-icon="mdi-logout"
                  title="Sair"
                  @click="logout"
                />
              </v-list>
            </v-menu>
            <v-btn
              v-if="!mobile"
              icon
              variant="text"
              size="small"
              color="default"
              :aria-label="rail ? 'Expandir menu' : 'Recolher menu'"
              v-tooltip:end="rail ? 'Expandir menu' : 'Recolher menu'"
              @click="toggleRail"
            >
              <v-icon size="18">{{
                rail ? "mdi-chevron-right" : "mdi-chevron-left"
              }}</v-icon>
            </v-btn>
          </div>
        </template>
      </v-navigation-drawer>

      <v-app-bar flat height="56" color="surface" class="app-toolbar">
        <v-app-bar-nav-icon
          v-if="mobile"
          aria-label="Abrir menu"
          @click="drawer = !drawer"
        />
        <nav class="app-breadcrumb" aria-label="Você está em">
          <span v-if="currentGroup" class="text-medium-emphasis">{{
            currentGroup
          }}</span>
          <v-icon
            v-if="currentGroup"
            size="16"
            class="text-medium-emphasis mx-1"
            >mdi-chevron-right</v-icon
          >
          <span class="font-weight-medium">{{ title }}</span>
        </nav>
        <v-spacer />
        <v-autocomplete
          v-if="!mobile"
          ref="searchRef"
          :model-value="null"
          :items="searchItems"
          item-title="title"
          item-value="to"
          placeholder="Ir para…  (Ctrl K)"
          prepend-inner-icon="mdi-magnify"
          hide-details
          hide-no-data
          menu-icon=""
          variant="outlined"
          density="compact"
          class="app-search mr-2"
          aria-label="Ir para uma página"
          @update:model-value="goTo"
        />
        <ThemeSwitcher class="mr-2" />
      </v-app-bar>

      <v-main class="app-main">
        <div class="app-container">
          <router-view />
        </div>
      </v-main>
    </template>

    <v-snackbar
      :model-value="toast.visible"
      :timeout="toast.timeout"
      location="top right"
      color="surface"
      class="app-toast"
      :class="`app-toast--${toast.color}`"
      @update:model-value="(open) => !open && toast.hide()"
    >
      <div class="d-flex align-center ga-3">
        <v-icon :color="toast.color" size="20">{{
          toast.color === "error" ? "mdi-alert-circle-outline" : "mdi-check-circle-outline"
        }}</v-icon>
        <span>{{ toast.message }}</span>
      </div>
    </v-snackbar>

    <ConfirmDialog />
  </v-app>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import { useAuthStore } from "../stores/auth";
import { useToastStore } from "../stores/toast";
import AppLogo from "./AppLogo.vue";
import ThemeSwitcher from "./ThemeSwitcher.vue";
import ConfirmDialog from "./ConfirmDialog.vue";

type NavItem = { to: string; title: string; icon: string; pageTitle?: string };

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Visão geral",
    items: [
      { to: "/dashboard", title: "Dashboard", icon: "mdi-view-dashboard-outline", pageTitle: "Resumo" },
      { to: "/reports", title: "Relatórios", icon: "mdi-chart-box-outline" },
    ],
  },
  {
    label: "Lançamentos",
    items: [
      { to: "/purchases", title: "Compras", icon: "mdi-cart-outline" },
      { to: "/statements", title: "Faturas", icon: "mdi-file-document-outline" },
      { to: "/subscriptions", title: "Assinaturas", icon: "mdi-repeat" },
      { to: "/fixed-expenses", title: "Despesas fixas", icon: "mdi-cash-minus" },
      { to: "/income-sources", title: "Fontes de renda", icon: "mdi-cash-plus" },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { to: "/credit-cards", title: "Cartões", icon: "mdi-credit-card-outline" },
      { to: "/tenants", title: "Responsáveis", icon: "mdi-account-multiple-outline" },
    ],
  },
];

const RAIL_KEY = "financial-app-sidebar-rail";

const auth = useAuthStore();
const toast = useToastStore();
const route = useRoute();
const router = useRouter();
const { mdAndDown } = useDisplay();

const mobile = computed(() => mdAndDown.value);
const drawer = ref(!mobile.value);
const rail = ref(readRail());
const searchRef = ref<{ focus: () => void } | null>(null);

watch(mobile, (isMobile) => {
  drawer.value = !isMobile;
});

function readRail(): boolean {
  try {
    return localStorage.getItem(RAIL_KEY) === "1";
  } catch {
    return false;
  }
}

function toggleRail() {
  rail.value = !rail.value;
  try {
    localStorage.setItem(RAIL_KEY, rail.value ? "1" : "0");
  } catch {
    // Preference only; ignore storage errors.
  }
}

const isAuthPage = computed(() => route.meta?.layout === "auth");

const currentEntry = computed(() => {
  for (const group of navGroups) {
    const item = group.items.find((i) => i.to === route.path);
    if (item) return { group: group.label, item };
  }
  return null;
});
const currentGroup = computed(() => currentEntry.value?.group ?? "");
const title = computed(() => {
  const item = currentEntry.value?.item;
  return item ? item.pageTitle ?? item.title : "Financial App";
});

const searchItems = navGroups.flatMap((g) => g.items);

function goTo(to: string | null) {
  if (to) router.push(to);
}

const userInitials = computed(() => {
  const email = auth.userEmail;
  return email ? email.slice(0, 2).toUpperCase() : "?";
});

async function logout() {
  await auth.logout();
  location.assign("/login");
}

// Ctrl/⌘ + K focuses the page jump field.
function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    searchRef.value?.focus();
  }
}
onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
</script>

<style scoped>
.auth-main {
  min-height: 100vh;
  background: rgb(var(--v-theme-background));
}
.auth-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 480px;
  margin: 0 auto;
  padding-block: 48px;
}
.auth-theme-switch {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 5;
}

.app-drawer {
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
}
.app-drawer__logo {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 16px;
}
.app-nav {
  padding: 4px 8px;
}
.app-nav__label {
  font-size: 12px;
  font-weight: 500;
  min-height: 28px;
  padding-inline-start: 8px !important;
  margin-top: 8px;
}
.app-nav__item {
  min-height: 36px !important;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 13px;
}
.app-nav__item :deep(.v-list-item__spacer) {
  width: 12px !important;
}
.app-nav__item :deep(.v-list-item-title) {
  font-size: 13px;
  font-weight: 500;
}
.app-nav__item.v-list-item--active {
  color: rgb(var(--v-theme-primary));
}
.app-nav__item.v-list-item--active :deep(.v-list-item__overlay) {
  background: rgb(var(--v-theme-primary));
  opacity: 0.1;
}
.app-drawer__footer {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.app-drawer__footer--rail {
  flex-direction: column;
  padding: 12px 0;
}
.app-user {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  padding: 4px;
  border-radius: 8px;
  color: inherit;
}
.app-user:hover {
  background: rgb(var(--v-theme-surface-light));
}
.app-user__email {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-toolbar {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
}
.app-breadcrumb {
  display: flex;
  align-items: center;
  font-size: 13px;
  padding-inline-start: 16px;
}
.app-search {
  max-width: 260px;
  min-width: 220px;
}
.app-search :deep(.v-field) {
  font-size: 13px;
  background: rgb(var(--v-theme-surface-light));
}
.app-search :deep(.v-field__outline) {
  --v-field-border-opacity: 0;
}

.app-main {
  background: rgb(var(--v-theme-background));
}
.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px;
}
@media (max-width: 600px) {
  .app-container {
    padding: 16px;
  }
}

.app-toast :deep(.v-snackbar__wrapper) {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-left-width: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}
.app-toast--success :deep(.v-snackbar__wrapper) {
  border-left-color: rgb(var(--v-theme-success));
}
.app-toast--error :deep(.v-snackbar__wrapper) {
  border-left-color: rgb(var(--v-theme-error));
}
</style>
