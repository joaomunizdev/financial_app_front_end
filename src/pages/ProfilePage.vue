<template>
  <div class="d-flex flex-column ga-6">
    <PageHeader
      title="Meu perfil"
      description="Seus dados de identificação e as configurações de acesso da conta."
    />

    <v-progress-linear v-if="loading" indeterminate color="primary" rounded />

    <template v-if="profile">
      <v-alert v-if="incomplete" type="info" density="compact">
        Complete seu cadastro: informe CPF, celular e data de nascimento.
      </v-alert>

      <v-card class="pa-5">
        <h2 class="section-title mb-4">Dados pessoais</h2>
        <v-form class="profile-grid" @submit.prevent="saveProfile">
          <v-text-field
            v-model="form.name"
            label="Nome completo"
            maxlength="120"
            :error-messages="errors.name"
            class="profile-grid__wide"
          />
          <v-text-field
            :model-value="profile.email"
            label="E-mail"
            readonly
            persistent-hint
            hint="O e-mail não pode ser alterado por aqui."
            class="profile-grid__wide"
          >
            <template #append-inner>
              <v-chip
                size="small"
                variant="tonal"
                :color="profile.emailVerified ? 'success' : 'warning'"
              >
                {{ profile.emailVerified ? "Confirmado" : "Não confirmado" }}
              </v-chip>
            </template>
          </v-text-field>
          <v-text-field
            :model-value="form.cpf"
            label="CPF"
            inputmode="numeric"
            placeholder="000.000.000-00"
            :readonly="cpfLocked"
            :persistent-hint="cpfLocked"
            :hint="cpfLocked ? 'O CPF não pode ser alterado.' : 'Depois de salvo, o CPF não pode ser alterado.'"
            :error-messages="errors.cpf"
            @update:model-value="(v) => (form.cpf = formatCpf(v))"
          />
          <v-text-field
            :model-value="form.phone"
            label="Celular"
            type="tel"
            placeholder="(00) 00000-0000"
            :error-messages="errors.phone"
            @update:model-value="(v) => (form.phone = formatPhone(v))"
          />
          <v-text-field
            v-model="form.birthDate"
            label="Data de nascimento"
            type="date"
            :max="todayLocalISO()"
            :error-messages="errors.birthDate"
          />
          <div class="profile-grid__actions">
            <v-btn type="submit" :loading="saving">Salvar dados</v-btn>
          </div>
        </v-form>
      </v-card>

      <v-card class="pa-5">
        <h2 class="section-title">Senha</h2>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Use pelo menos 8 caracteres. Você continuará conectado neste dispositivo.
        </p>
        <v-form class="profile-grid" @submit.prevent="changePassword">
          <v-text-field
            v-model="passwordForm.currentPassword"
            label="Senha atual"
            type="password"
            autocomplete="current-password"
            :error-messages="passwordErrors.currentPassword"
            class="profile-grid__wide"
          />
          <v-text-field
            v-model="passwordForm.newPassword"
            label="Nova senha"
            type="password"
            autocomplete="new-password"
            :error-messages="passwordErrors.newPassword"
          />
          <v-text-field
            v-model="passwordForm.confirmPassword"
            label="Confirme a nova senha"
            type="password"
            autocomplete="new-password"
            :error-messages="passwordErrors.confirmPassword"
          />
          <div class="profile-grid__actions">
            <v-btn type="submit" variant="outlined" color="default" :loading="changingPassword">
              Alterar senha
            </v-btn>
          </div>
        </v-form>
      </v-card>

      <v-card class="pa-5">
        <div class="d-flex align-start justify-space-between ga-4">
          <div>
            <h2 class="section-title">Verificação em duas etapas</h2>
            <p class="text-body-2 text-medium-emphasis">
              Ao entrar, além da senha, pedimos um código enviado para
              {{ profile.email }}.
            </p>
          </div>
          <v-switch
            :model-value="profile.twoFactorEnabled"
            color="primary"
            inset
            hide-details
            aria-label="Verificação em duas etapas"
            @update:model-value="(v) => askTwoFactor(!!v)"
          />
        </div>
      </v-card>
    </template>

    <v-dialog v-model="twoFactorDlg.open" max-width="440">
      <v-card>
        <v-card-title>
          {{ twoFactorDlg.enable ? "Ativar" : "Desativar" }} verificação em duas etapas
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-4">Confirme sua senha para continuar.</p>
          <v-text-field
            v-model="twoFactorDlg.password"
            label="Senha"
            type="password"
            autocomplete="current-password"
            autofocus
            :error-messages="twoFactorDlg.error"
            @keyup.enter="confirmTwoFactor"
          />
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" color="default" @click="twoFactorDlg.open = false">Cancelar</v-btn>
          <v-btn :loading="twoFactorDlg.saving" @click="confirmTwoFactor">
            {{ twoFactorDlg.enable ? "Ativar" : "Desativar" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import * as yup from "yup";
import http from "../plugins/http";
import PageHeader from "../components/PageHeader.vue";
import { useFormErrors } from "../composables/useFormErrors";
import { useToastStore } from "../stores/toast";
import { authErrorMessage } from "../utils/api-error";
import { formatCpf, formatPhone, isValidCpf, onlyDigits } from "../utils/br";
import { todayLocalISO, toDateInput } from "../utils/date";
import type { UserProfile } from "../types/domain";

const toast = useToastStore();
const loading = ref(false);
const saving = ref(false);
const changingPassword = ref(false);
const profile = ref<UserProfile | null>(null);

const form = reactive({ name: "", cpf: "", phone: "", birthDate: "" });
// The CPF is permanent once saved (older accounts may fill it in once).
const cpfLocked = computed(() => !!profile.value?.cpf);
const incomplete = computed(
  () => !!profile.value && (!profile.value.cpf || !profile.value.phone || !profile.value.birthDate)
);

// Same rules as sign-up; fields may stay empty on older accounts until filled in.
const schema = yup.object({
  name: yup.string().trim().required("Nome é obrigatório").max(120, "Máximo de 120 caracteres"),
  cpf: yup.string().test("cpf", "CPF inválido", (v) => !v || isValidCpf(v)),
  phone: yup
    .string()
    .test("phone", "Informe DDD + número", (v) => !v || [10, 11].includes(onlyDigits(v).length)),
  birthDate: yup
    .string()
    .test("past", "Data de nascimento inválida", (v) => !v || (v >= "1900-01-01" && v <= todayLocalISO())),
});
const { errors, validateAll } = useFormErrors(schema, ["name", "cpf", "phone", "birthDate"] as const);

const passwordForm = reactive({ currentPassword: "", newPassword: "", confirmPassword: "" });
const passwordSchema = yup.object({
  currentPassword: yup.string().required("Informe a senha atual"),
  newPassword: yup
    .string()
    .required("Informe a nova senha")
    .min(8, "A senha deve ter pelo menos 8 caracteres")
    .max(72, "Máximo de 72 caracteres"),
  confirmPassword: yup
    .string()
    .required("Confirme a nova senha")
    .oneOf([yup.ref("newPassword")], "As senhas não conferem"),
});
const {
  errors: passwordErrors,
  validateAll: validatePassword,
  clearErrors: clearPasswordErrors,
} = useFormErrors(passwordSchema, ["currentPassword", "newPassword", "confirmPassword"] as const);

const twoFactorDlg = reactive({ open: false, enable: false, password: "", error: "", saving: false });

function fill(p: UserProfile) {
  profile.value = p;
  Object.assign(form, {
    name: p.name,
    cpf: formatCpf(p.cpf),
    phone: formatPhone(p.phone),
    birthDate: toDateInput(p.birthDate),
  });
}

async function load() {
  loading.value = true;
  try {
    fill((await http.get<UserProfile>("/users/me")).data);
  } finally {
    loading.value = false;
  }
}

async function saveProfile() {
  if (!(await validateAll(form))) return;
  saving.value = true;
  try {
    // Only send identification fields that are filled (they are optional on older accounts).
    const body: Record<string, string> = { name: form.name.trim() };
    if (form.cpf && !cpfLocked.value) body.cpf = onlyDigits(form.cpf);
    if (form.phone) body.phone = onlyDigits(form.phone);
    if (form.birthDate) body.birthDate = form.birthDate;
    const { data } = await http.patch<UserProfile>("/users/me", body, { skipToast: true });
    fill(data);
    toast.show({ message: "Dados atualizados." });
  } catch (e) {
    toast.show({ color: "error", message: authErrorMessage(e, "Não foi possível salvar os dados.") });
  } finally {
    saving.value = false;
  }
}

async function changePassword() {
  if (!(await validatePassword(passwordForm))) return;
  changingPassword.value = true;
  try {
    await http.post(
      "/users/me/password",
      { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword },
      { skipToast: true }
    );
    Object.assign(passwordForm, { currentPassword: "", newPassword: "", confirmPassword: "" });
    clearPasswordErrors();
    toast.show({ message: "Senha alterada." });
  } catch (e) {
    toast.show({ color: "error", message: authErrorMessage(e, "Não foi possível alterar a senha.") });
  } finally {
    changingPassword.value = false;
  }
}

function askTwoFactor(enable: boolean) {
  Object.assign(twoFactorDlg, { open: true, enable, password: "", error: "", saving: false });
}

async function confirmTwoFactor() {
  if (!twoFactorDlg.password) {
    twoFactorDlg.error = "Informe sua senha";
    return;
  }
  twoFactorDlg.saving = true;
  twoFactorDlg.error = "";
  try {
    const { data } = await http.patch<UserProfile>(
      "/users/me/two-factor",
      { enabled: twoFactorDlg.enable, password: twoFactorDlg.password },
      { skipToast: true }
    );
    fill(data);
    twoFactorDlg.open = false;
    toast.show({
      message: data.twoFactorEnabled
        ? "Verificação em duas etapas ativada."
        : "Verificação em duas etapas desativada.",
    });
  } catch (e) {
    twoFactorDlg.error = authErrorMessage(e, "Não foi possível alterar a configuração.");
  } finally {
    twoFactorDlg.saving = false;
  }
}

onMounted(load);
</script>

<style scoped>
.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}
.profile-grid__wide,
.profile-grid__actions {
  grid-column: 1 / -1;
}
.profile-grid__actions {
  display: flex;
  justify-content: flex-end;
}
@media (max-width: 700px) {
  .profile-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
