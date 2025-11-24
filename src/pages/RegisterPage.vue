<template>
  <v-card class="auth-card" elevation="8">
    <v-card-text>
      <div class="text-center mb-6">
        <div class="text-h5 font-weight-medium">Criar conta</div>
        <div class="text-body-2 text-medium-emphasis">
          Cadastre-se para organizar cartões e faturas.
        </div>
      </div>
      <v-form
        @submit.prevent="onSubmit"
        v-model="valid"
        class="d-flex flex-column gap-3"
      >
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
      <div class="text-caption mt-6 text-center">
        Já possui conta?
        <v-btn variant="text" size="small" @click="$router.push('/login')"
          >Entrar</v-btn
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
const name = ref("");
const email = ref("");
const password = ref("");
const valid = ref(false);
const loading = ref(false);
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
    await auth.register(name.value, email.value, password.value);
    await auth.login(email.value, password.value);
    location.assign("/dashboard");
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-card {
  width: min(520px, 100%);
  border-radius: 24px;
  overflow: hidden;
}
</style>
