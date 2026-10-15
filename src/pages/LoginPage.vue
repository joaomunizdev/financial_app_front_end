<template>
  <AuthSplitLayout
    :image="banner.image"
    :title="banner.title"
    :description="banner.description"
    :heading="challengeToken ? 'Verificação em duas etapas' : 'Seja bem-vindo'"
    :subheading="challengeToken ? undefined : 'Acesse sua conta para continuar.'"
  >
    <CodeVerification
      v-if="challengeToken"
      :email="form.email.trim()"
      :loading="loading"
      :error="codeError"
      submit-text="Entrar"
      :on-resend="resendCode"
      @submit="confirmCode"
    />
    <v-form v-else class="d-flex flex-column ga-1" @submit.prevent="onSubmit">
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
      <template v-if="challengeToken">
        <a id="link-login-back" href="#" class="text-primary font-weight-medium" @click.prevent="backToPassword">
          Voltar e usar outra conta
        </a>
      </template>
      <template v-else>
        Não tem uma conta?
        <router-link id="link-login-register" to="/register" class="text-primary font-weight-medium">
          Criar conta
        </router-link>
      </template>
    </template>
  </AuthSplitLayout>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import * as yup from "yup";
import AuthSplitLayout from "../components/AuthSplitLayout.vue";
import CodeVerification from "../components/CodeVerification.vue";
import login1 from "../assets/auth/login-1.webp";
import login2 from "../assets/auth/login-2.webp";
import { useAuthStore } from "../stores/auth";
import { useToastStore } from "../stores/toast";
import { useFormErrors } from "../composables/useFormErrors";
import { authErrorMessage } from "../utils/api-error";

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

const auth = useAuthStore();
const router = useRouter();
const form = reactive({ email: "", password: "" });
const loading = ref(false);
/** Set when the account has the login second factor on; switches to the code step. */
const challengeToken = ref("");
const codeError = ref("");

// Mirrors the backend LoginDto (IsEmail; no minimum length so older accounts still work).
const schema = yup.object({
  email: yup
    .string()
    .trim()
    .required("E-mail é obrigatório")
    .email("Informe um e-mail válido"),
  password: yup.string().required("Senha é obrigatória"),
});

const { errors, validateAll } = useFormErrors(schema, [
  "email",
  "password",
] as const);

async function onSubmit() {
  if (!(await validateAll(form))) return;
  loading.value = true;
  try {
    const result = await auth.login(form.email.trim(), form.password);
    if (result.status === "authenticated") {
      location.assign("/dashboard");
    } else if (result.status === "two_factor") {
      challengeToken.value = result.challengeToken;
      codeError.value = "";
    } else {
      // Unconfirmed account: the backend just e-mailed a confirmation code.
      router.push({ path: "/verify-email", query: { email: result.email } });
    }
  } finally {
    loading.value = false;
  }
}

async function confirmCode(code: string) {
  loading.value = true;
  codeError.value = "";
  try {
    await auth.verifyLogin(challengeToken.value, code, form.email.trim());
    location.assign("/dashboard");
  } catch (e) {
    codeError.value = authErrorMessage(e, "Não foi possível validar o código.");
  } finally {
    loading.value = false;
  }
}

async function resendCode() {
  try {
    await auth.resendLoginCode(challengeToken.value);
    useToastStore().show({ message: "Enviamos um novo código para o seu e-mail." });
  } catch (e) {
    codeError.value = authErrorMessage(e, "Não foi possível reenviar o código.");
    throw e;
  }
}

function backToPassword() {
  challengeToken.value = "";
  codeError.value = "";
  form.password = "";
}
</script>
