<template>
  <v-card class="auth-card" elevation="8">
    <v-card-text>
      <div class="text-center mb-6">
        <div class="text-h5 font-weight-medium">Entrar</div>
        <div class="text-body-2 text-medium-emphasis">
          Bem-vindo de volta! Acesse sua conta.
        </div>
      </div>
      <v-form @submit.prevent="onSubmit" class="d-flex flex-column ga-3">
        <v-text-field
          v-model="form.email"
          label="E-mail"
          type="email"
          autocomplete="email"
          prepend-inner-icon="mdi-email-outline"
          :error-messages="errors.email"
        />
        <v-text-field
          v-model="form.password"
          label="Senha"
          type="password"
          autocomplete="current-password"
          prepend-inner-icon="mdi-lock-outline"
          :error-messages="errors.password"
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
import { reactive, ref } from "vue";
import * as yup from "yup";
import { useAuthStore } from "../stores/auth";
import { useFormErrors } from "../composables/useFormErrors";

const auth = useAuthStore();
const form = reactive({ email: "", password: "" });
const loading = ref(false);

// Mirrors the backend LoginDto (IsEmail, MinLength(6)).
const schema = yup.object({
  email: yup
    .string()
    .trim()
    .required("E-mail é obrigatório")
    .email("Informe um e-mail válido"),
  password: yup
    .string()
    .required("Senha é obrigatória")
    .min(6, "A senha deve ter pelo menos 6 caracteres"),
});

const { errors, validateAll } = useFormErrors(schema, [
  "email",
  "password",
] as const);

async function onSubmit() {
  if (!(await validateAll(form))) return;
  loading.value = true;
  try {
    await auth.login(form.email.trim(), form.password);
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
