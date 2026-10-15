<template>
  <v-form class="d-flex flex-column ga-3" @submit.prevent="submit">
    <p class="text-body-2 text-medium-emphasis text-center">
      Enviamos um código de 6 dígitos para
      <strong class="text-high-emphasis">{{ email }}</strong>. Ele vale por 10 minutos.
    </p>
    <v-otp-input
      v-model="code"
      length="6"
      type="number"
      variant="outlined"
      :error="!!error"
      :disabled="loading"
      autofocus
      aria-label="Código de verificação"
      @finish="submit"
    />
    <p v-if="error" class="text-caption text-error text-center" role="alert">{{ error }}</p>
    <v-btn :loading="loading" :disabled="code.length !== 6" block size="large" type="submit">
      {{ submitText }}
    </v-btn>
    <div class="text-body-2 text-medium-emphasis text-center">
      Não recebeu?
      <span v-if="cooldown > 0" class="tabular-nums" aria-live="polite">
        Você pode pedir outro em {{ cooldown }}s.
      </span>
      <v-btn
        v-else
        variant="text"
        size="small"
        class="px-1"
        :loading="resending"
        @click="resend"
      >
        Reenviar código
      </v-btn>
    </div>
  </v-form>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

// Must match the backend resend cooldown (VerificationCodesService).
const RESEND_COOLDOWN_S = 60;

const props = withDefaults(
  defineProps<{
    email: string;
    loading?: boolean;
    error?: string;
    submitText?: string;
    /** Resolves when the new code was requested. */
    onResend: () => Promise<unknown>;
  }>(),
  { submitText: "Confirmar" }
);
const emit = defineEmits<{ (e: "submit", code: string): void }>();

const code = ref("");
const cooldown = ref(RESEND_COOLDOWN_S);
const resending = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;

function startCooldown() {
  cooldown.value = RESEND_COOLDOWN_S;
  clearInterval(timer);
  timer = setInterval(() => {
    cooldown.value = Math.max(0, cooldown.value - 1);
    if (cooldown.value === 0) clearInterval(timer);
  }, 1000);
}

// Completing the last digit (@finish) and pressing Enter would both submit;
// allow one submission until the parent finishes handling it.
let submitted = false;
watch(
  () => props.loading,
  (busy) => {
    if (!busy) submitted = false;
  }
);

function submit() {
  if (code.value.length !== 6 || props.loading || submitted) return;
  submitted = true;
  emit("submit", code.value);
}

async function resend() {
  resending.value = true;
  try {
    await props.onResend();
    code.value = "";
    startCooldown();
  } finally {
    resending.value = false;
  }
}

onMounted(startCooldown);
onBeforeUnmount(() => clearInterval(timer));
</script>
