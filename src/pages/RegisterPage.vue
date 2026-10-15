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
        :model-value="form.cpf"
        label="CPF"
        inputmode="numeric"
        placeholder="000.000.000-00"
        prepend-inner-icon="mdi-card-account-details-outline"
        :error-messages="errors.cpf"
        @update:model-value="(v) => (form.cpf = formatCpf(v))"
      />
      <v-text-field
        v-model="form.birthDate"
        label="Data de nascimento"
        type="date"
        :max="todayLocalISO()"
        :error-messages="errors.birthDate"
      />
      <v-text-field
        :model-value="form.phone"
        label="Celular"
        type="tel"
        autocomplete="tel-national"
        placeholder="(00) 00000-0000"
        prepend-inner-icon="mdi-cellphone"
        :error-messages="errors.phone"
        @update:model-value="(v) => (form.phone = formatPhone(v))"
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
    description: "Veja seus gastos com clareza e decida melhor.",
  },
];
const banner = banners[Math.floor(Math.random() * banners.length)];
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useToastStore } from "../stores/toast";
import { authErrorMessage } from "../utils/api-error";
import { formatCpf, formatPhone, isValidCpf, onlyDigits } from "../utils/br";
import { todayLocalISO } from "../utils/date";
import { isBlockedEmailDomain } from "../utils/email";
import * as yup from "yup";
import { useAuthStore } from "../stores/auth";
import { useFormErrors } from "../composables/useFormErrors";

const auth = useAuthStore();
const router = useRouter();
const form = reactive({ name: "", cpf: "", birthDate: "", phone: "", email: "", password: "" });
const loading = ref(false);

// Mirrors the backend RegisterDto (IsEmail, MinLength(8), valid CPF, 10–11 digit phone).
const schema = yup.object({
  name: yup
    .string()
    .trim()
    .required("Nome é obrigatório")
    .max(120, "Máximo de 120 caracteres"),
  cpf: yup
    .string()
    .required("CPF é obrigatório")
    .test("cpf", "CPF inválido", (v) => isValidCpf(v ?? "")),
  birthDate: yup
    .string()
    .required("Data de nascimento é obrigatória")
    .test("past", "Data de nascimento inválida", (v) => !!v && v >= "1900-01-01" && v <= todayLocalISO()),
  phone: yup
    .string()
    .required("Celular é obrigatório")
    .test("phone", "Informe DDD + número", (v) => [10, 11].includes(onlyDigits(v).length)),
  email: yup
    .string()
    .trim()
    .required("E-mail é obrigatório")
    .email("Informe um e-mail válido")
    .test("real-domain", "E-mail inválido", (v) => !isBlockedEmailDomain(v ?? "")),
  password: yup
    .string()
    .required("Senha é obrigatória")
    .min(8, "A senha deve ter pelo menos 8 caracteres"),
});

const { errors, validateAll } = useFormErrors(schema, [
  "name",
  "cpf",
  "birthDate",
  "phone",
  "email",
  "password",
] as const);

async function onSubmit() {
  if (!(await validateAll(form))) return;
  loading.value = true;
  try {
    const email = form.email.trim();
    await auth.register({
      name: form.name.trim(),
      email,
      password: form.password,
      cpf: onlyDigits(form.cpf),
      phone: onlyDigits(form.phone),
      birthDate: form.birthDate,
    });
    router.push({ path: "/verify-email", query: { email } });
  } catch (e) {
    useToastStore().show({
      color: "error",
      message: authErrorMessage(e, "Não foi possível concluir o cadastro."),
    });
  } finally {
    loading.value = false;
  }
}
</script>
