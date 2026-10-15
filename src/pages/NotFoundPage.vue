<template>
  <v-card class="mx-auto mt-6" max-width="560">
    <EmptyState
      :image="notFound"
      title="Página não encontrada"
      description="O endereço não existe ou foi alterado."
      action-text="Voltar ao Dashboard"
      action-icon="mdi-view-dashboard-outline"
      action-to="/dashboard"
    />
  </v-card>
</template>

<script setup lang="ts">
import EmptyState from "../components/EmptyState.vue";
import notFound from "../assets/empty/not-found.webp";
</script>
