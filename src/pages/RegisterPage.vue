<template>
  <div class="d-flex align-center justify-center" style="min-height: 80vh">
    <v-card width="520" class="pa-6">
      <div class="text-h6 mb-4">Criar conta</div>
      <v-form @submit.prevent="onSubmit" v-model="valid">
        <v-text-field
          v-model="name"
          label="Nome completo"
          prepend-inner-icon="mdi-account-outline"
          required
        />
        <v-text-field
          v-model="email"
          label="E-mail"
          type="email"
          prepend-inner-icon="mdi-email-outline"
          required
        />
        <v-text-field
          v-model="password"
          label="Senha"
          type="password"
          prepend-inner-icon="mdi-lock-outline"
          required
        />
        <v-btn :loading="loading" block class="mt-2" type="submit"
          >Registrar</v-btn
        >
      </v-form>
      <div class="text-caption mt-4">
        Já possui conta?
        <v-btn variant="text" size="small" @click="$router.push('/login')"
          >Entrar</v-btn
        >
      </div>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const name = ref("");
const email = ref("");
const password = ref("");
const valid = ref(false);
const loading = ref(false);

async function onSubmit() {
  if (!valid.value) return;
  loading.value = true;
  try {
    await auth.register(name.value, email.value, password.value);
    await auth.login(email.value, password.value);
    location.assign("/dashboard");
  } finally {
    loading.value = false;
  }
}
</script>
