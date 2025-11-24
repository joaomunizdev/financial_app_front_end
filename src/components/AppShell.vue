<template>
  <v-app>
    <template v-if="isAuthPage">
      <v-main class="auth-background">
        <div class="auth-layout px-4">
          <div class="auth-theme-switch-top">
            <ThemeSwitcher />
          </div>
          <div class="auth-brand text-center">
            <v-img
              :src="logoSrc"
              alt="Financial App Logo"
              width="180"
              class="mb-4 mx-auto"
              contain
            />
            <div class="text-h4 font-weight-bold mb-2">Financial App</div>
            <div class="text-body-1 text-medium-emphasis">
              Centralize seus cartões, controle compras e acompanhe faturas em um
              só lugar.
            </div>
          </div>
          <div class="auth-card-slot">
            <router-view />
          </div>
        </div>
      </v-main>
    </template>
    <template v-else>
      <v-navigation-drawer
        v-model="drawer"
        :rail="isMd"
        :expand-on-hover="isMd"
        color="surface"
        elevation="1"
        border="0"
        class="app-drawer"
      >
        <v-sheet class="pa-4 text-center" color="transparent">
          <v-img
            :src="logoSrc"
            alt="Financial App Logo"
            width="140"
            class="mx-auto mb-2"
            contain
          />
          <div class="text-subtitle-2 text-medium-emphasis">
            Controle financeiro pessoal
          </div>
        </v-sheet>
        <v-divider class="my-2" />
        <v-list density="comfortable" nav>
          <v-list-item
            v-for="item in items"
            :key="item.to"
            :to="item.to"
            :prepend-icon="item.icon"
            :title="item.title"
          />
        </v-list>
      </v-navigation-drawer>

      <v-app-bar elevation="0" color="transparent" class="app-toolbar px-4">
        <v-app-bar-nav-icon @click="drawer = !drawer" />
        <v-toolbar-title class="text-h6">{{ title }}</v-toolbar-title>
        <v-spacer />
        <ThemeSwitcher />
        <v-menu>
          <template #activator="{ props }">
            <v-btn icon variant="text" class="ml-2" v-bind="props">
              <v-avatar size="36" color="primary" variant="tonal">
                <v-icon>mdi-account</v-icon>
              </v-avatar>
            </v-btn>
          </template>
          <v-list density="compact">
            <v-list-item
              prepend-icon="mdi-logout"
              title="Sair"
              @click="logout"
            />
          </v-list>
        </v-menu>
      </v-app-bar>

      <v-main class="app-background">
        <v-container fluid class="py-6 px-6">
          <router-view />
        </v-container>
      </v-main>
    </template>

    <v-snackbar
      v-model="toast.visible"
      :color="toast.color"
      :timeout="toast.timeout"
      location="bottom right"
      variant="outlined"
    >
      {{ toast.message }}
    </v-snackbar>
  </v-app>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useDisplay } from "vuetify";
import { useTheme } from "vuetify";
import { useAuthStore } from "../stores/auth";
import ThemeSwitcher from "../components/ThemeSwitcher.vue";
import { useToastStore } from "../stores/toast";

const theme = useTheme();

const logoSrc = computed(() =>
  theme.global.current.value.dark
    ? new URL("../assets/white-logo.png", import.meta.url).href
    : new URL("../assets/logo.png", import.meta.url).href
);

const auth = useAuthStore();
const route = useRoute();
const { mdAndDown } = useDisplay();
const isMd = computed(() => mdAndDown.value);
const drawer = ref(true);
watch(
  () => isMd.value,
  (value) => {
    drawer.value = !value;
  },
  { immediate: true }
);

const items = [
  { to: "/dashboard", title: "Dashboard", icon: "mdi-view-dashboard-outline" },
  { to: "/reports", title: "Relatórios", icon: "mdi-chart-box-outline" },
  {
    to: "/credit-cards",
    title: "Cartões",
    icon: "mdi-credit-card-multiple-outline",
  },
  {
    to: "/tenants",
    title: "Responsáveis",
    icon: "mdi-account-multiple-outline",
  },
  { to: "/purchases", title: "Compras", icon: "mdi-cart-outline" },
  { to: "/statements", title: "Faturas", icon: "mdi-file-document-outline" },
  { to: "/subscriptions", title: "Assinaturas", icon: "mdi-repeat" },
];

const isAuthPage = computed(() => route.meta?.layout === "auth");

const title = computed(() => {
  const m: Record<string, string> = {
    "/dashboard": "Resumo",
    "/reports": "Relatórios",
    "/credit-cards": "Cartões de Crédito",
    "/tenants": "Responsáveis",
    "/purchases": "Compras",
    "/statements": "Faturas",
    "/subscriptions": "Assinaturas",
  };
  return m[route.path] ?? "Financial App";
});

async function logout() {
  await auth.logout();
  location.assign("/login");
}

const toast = useToastStore();
</script>

<style scoped>
.auth-background {
  min-height: 100vh;
  background: radial-gradient(
      circle at 10% 20%,
      rgba(var(--v-theme-primary), 0.35),
      transparent 45%
    ),
    radial-gradient(
      circle at 90% 0%,
      rgba(var(--v-theme-secondary), 0.25),
      transparent 40%
    ),
    rgb(var(--v-theme-background));
}

.auth-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  max-width: 520px;
  margin: 0 auto;
  padding: 48px 16px;
  text-align: center;
  position: relative;
}

.auth-brand {
  max-width: 420px;
}

.auth-card-slot {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
}

.auth-theme-switch-top {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 5;
}

.app-background {
  min-height: 100vh;
  background: radial-gradient(
      circle at 15% 20%,
      rgba(var(--v-theme-primary), 0.15),
      transparent 45%
    ),
    radial-gradient(
      circle at 80% 0%,
      rgba(var(--v-theme-secondary), 0.1),
      transparent 35%
    ),
    rgb(var(--v-theme-background));
}

.app-toolbar {
  backdrop-filter: blur(12px);
}

.app-drawer :deep(.v-list-item--active) {
  color: rgb(var(--v-theme-primary)) !important;
  background-color: rgba(var(--v-theme-primary), 0.12) !important;
}
</style>
