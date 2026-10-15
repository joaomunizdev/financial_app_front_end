<template>
  <AuthSplitLayout
    :image="banner.image"
    :title="banner.title"
    :description="banner.description"
    heading="Seja bem-vindo"
    subheading="Acesse sua conta para continuar."
  >
    <v-form class="d-flex flex-column ga-1" @submit.prevent="onSubmit">
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
      <v-btn :loading="loading" block size="large" class="mt-2" type="submit">
        Entrar
      </v-btn>
    </v-form>
    <template #footer>
      Não tem uma conta?
      <router-link id="link-login-register" to="/register" class="text-primary font-weight-medium">
        Criar conta
      </router-link>
    </template>
  </AuthSplitLayout>
</template>

<script setup lang="ts">
import AuthSplitLayout from "../components/AuthSplitLayout.vue";
import login1 from "../assets/auth/login-1.webp";
import login2 from "../assets/auth/login-2.webp";

// One illustration + message is drawn per visit.
const banners = [
  {
    image: login1,
    title: "Suas finanças em um só lugar.",
    description: "Cartões, compras e faturas organizados, sem planilha.",
  },
  {
    image: login2,
    title: "Saiba para onde vai cada real.",
    description: "Acompanhe os gastos do mês por cartão e por responsável.",
  },
];
const banner = banners[Math.floor(Math.random() * banners.length)];
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
