<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" :rail="isMd" elevation="1">
      <div class="d-flex flex-column align-center justify-center py-6">
        <img
          src="../assets/logo.png"
          alt="Financial App Logo"
          style="max-width: 150px"
        />
      </div>
      <v-divider />
      <v-list density="comfortable" nav>
        <v-list-item
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
        />
      </v-list>
      <template #append>
        <v-divider />
        <v-list density="compact">
          <v-list-item prepend-icon="mdi-logout" title="Sair" @click="logout" />
        </v-list>
      </template>
    </v-navigation-drawer>

    <v-app-bar elevation="0" color="surface">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title class="text-h6">{{ title }}</v-toolbar-title>
      <v-spacer />
      <v-btn icon variant="text"><v-icon>mdi-bell-outline</v-icon></v-btn>
      <v-avatar size="32" class="ml-2">
        <v-icon>mdi-account</v-icon>
      </v-avatar>
    </v-app-bar>

    <v-main>
      <div
        class="pa-6"
        style="
          min-height: calc(100vh - 64px);
          background: rgb(var(--v-theme-background));
        "
      >
        <router-view />
      </div>
    </v-main>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.text }}
    </v-snackbar>
  </v-app>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useDisplay } from "vuetify";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const { mdAndDown } = useDisplay();
const isMd = computed(() => mdAndDown.value);
const drawer = ref(!isMd.value);

const items = [
  { to: "/dashboard", title: "Dashboard", icon: "mdi-view-dashboard-outline" },
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
];

const title = computed(() => {
  const m: Record<string, string> = {
    "/dashboard": "Resumo",
    "/credit-cards": "Cartões de Crédito",
    "/tenants": "Responsáveis",
    "/purchases": "Compras",
    "/statements": "Faturas",
  };
  return m[location.pathname] ?? "Financial App";
});

function logout() {
  auth.logout();
  location.assign("/login");
}

const snackbar = ref({ show: false, text: "", color: "success" });
</script>
