<template>
  <AuthSplitLayout
    :image="registerImage"
    title="Falta só confirmar seu e-mail."
    description="Assim protegemos sua conta e seus dados financeiros."
    heading="Confirme seu e-mail"
  >
    <CodeVerification
      :email="email"
      :loading="loading"
      :error="error"
      submit-text="Confirmar e entrar"
      :on-resend="resend"
      @submit="confirm"
    />
    <template #footer>
      E-mail errado?
      <router-link id="link-verify-register" to="/register" class="text-primary font-weight-medium">
        Refazer cadastro
      </router-link>
    </template>
  </AuthSplitLayout>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import AuthSplitLayout from "../components/AuthSplitLayout.vue";
import CodeVerification from "../components/CodeVerification.vue";
import registerImage from "../assets/auth/register-1.webp";
import { useAuthStore } from "../stores/auth";
import { useToastStore } from "../stores/toast";
import { authErrorMessage } from "../utils/api-error";

const auth = useAuthStore();
const route = useRoute();
const email = computed(() => String(route.query.email ?? ""));
const loading = ref(false);
const error = ref("");

async function confirm(code: string) {
  loading.value = true;
  error.value = "";
  try {
    await auth.verifyEmail(email.value, code);
    location.assign("/dashboard");
  } catch (e) {
    error.value = authErrorMessage(e, "Não foi possível confirmar o código.");
  } finally {
    loading.value = false;
  }
}

async function resend() {
  await auth.resendVerification(email.value);
  error.value = "";
  useToastStore().show({ message: "Enviamos um novo código para o seu e-mail." });
}
</script>
