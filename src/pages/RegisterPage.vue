<template>
  <AuthSplitLayout
    :image="banner.image"
    :title="banner.title"
    :description="banner.description"
    heading="Criar conta"
    subheading="Leva menos de um minuto."
  >
    <v-form class="d-flex flex-column ga-1" @submit.prevent="onSubmit">
      <v-text-field
        v-model="form.name"
        label="Nome completo"
        autocomplete="name"
        maxlength="120"
        prepend-inner-icon="mdi-account-outline"
        :error-messages="errors.name"
      />
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
        autocomplete="new-password"
        prepend-inner-icon="mdi-lock-outline"
        :error-messages="errors.password"
      />
      <v-btn :loading="loading" block size="large" class="mt-2" type="submit">
        Criar conta
      </v-btn>
    </v-form>
    <template #footer>
      Já tem uma conta?
      <router-link id="link-register-login" to="/login" class="text-primary font-weight-medium">
        Fazer login
      </router-link>
    </template>
  </AuthSplitLayout>
</template>

<script setup lang="ts">
import AuthSplitLayout from "../components/AuthSplitLayout.vue";
import register1 from "../assets/auth/register-1.webp";
import register2 from "../assets/auth/register-2.webp";

// One illustration + message is drawn per visit.
const banners = [
  {
    image: register1,
    title: "Crie sua conta e comece agora.",
    description: "Um cadastro simples para organizar cartões, compras e faturas.",
  },
  {
    image: register2,
    title: "Organize hoje, economize amanhã.",
    description: "Veja seus gastos com clareza e decida melhor para onde vai o dinheiro.",
  },
];
const banner = banners[Math.floor(Math.random() * banners.length)];
import { reactive, ref } from "vue";
import * as yup from "yup";
import { useAuthStore } from "../stores/auth";
import { useFormErrors } from "../composables/useFormErrors";

const auth = useAuthStore();
const form = reactive({ name: "", email: "", password: "" });
const loading = ref(false);

// Mirrors the backend RegisterDto (IsEmail, MinLength(6)); name fits the 120-char column.
const schema = yup.object({
  name: yup
    .string()
    .trim()
    .required("Nome é obrigatório")
    .max(120, "Máximo de 120 caracteres"),
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
  "name",
  "email",
  "password",
] as const);

async function onSubmit() {
  if (!(await validateAll(form))) return;
  loading.value = true;
  try {
    const email = form.email.trim();
    await auth.register(form.name.trim(), email, form.password);
    await auth.login(email, form.password);
    location.assign("/dashboard");
  } finally {
    loading.value = false;
  }
}
</script>
