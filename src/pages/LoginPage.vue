<template>
  <div class="d-flex align-center justify-center" style="min-height: 80vh">
    <v-card width="420" class="pa-6">
      <div class="d-flex align-center mb-4">
        <v-avatar size="36" class="mr-2"
          ><v-icon>mdi-credit-card-outline</v-icon></v-avatar
        >
        <div class="text-h6">Entrar</div>
      </div>
      <v-form @submit.prevent="onSubmit" v-model="valid">
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
      <div class="text-caption mt-4">
        Não possui conta?
        <v-btn variant="text" size="small" @click="$router.push('/register')"
          >Registrar</v-btn
        >
      </div>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const email = ref("admin@example.com");
const password = ref("Admin@123");
const loading = ref(false);
const valid = ref(false);

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
