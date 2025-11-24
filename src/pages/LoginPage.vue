<template>
  <v-card class="auth-card" elevation="8">
    <v-card-text>
      <div class="text-center mb-6">
        <div class="text-h5 font-weight-medium">Entrar</div>
        <div class="text-body-2 text-medium-emphasis">
          Bem-vindo de volta! Acesse sua conta.
        </div>
      </div>
      <v-form
        @submit.prevent="onSubmit"
        v-model="valid"
        class="d-flex flex-column gap-3"
      >
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
          >Entrar</v-btn
        >
      </v-form>
      <div class="text-caption mt-6 text-center">
        Não possui conta?
        <v-btn variant="text" size="small" @click="$router.push('/register')"
          >Registrar</v-btn
        >
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useTheme } from "vuetify";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const email = ref("admin@example.com");
const password = ref("Admin@123");
const loading = ref(false);
const valid = ref(false);
const theme = useTheme();
const logoSrc = computed(() =>
  theme.global.current.value.dark
    ? new URL("../assets/white-logo.png", import.meta.url).href
    : new URL("../assets/logo.png", import.meta.url).href
);

async function onSubmit() {
  if (!valid.value) return;
  loading.value = true;
  try {
    await auth.login(email.value, password.value);
    location.assign("/dashboard");
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-card {
  width: min(420px, 100%);
  border-radius: 24px;
  overflow: hidden;
}
</style>
