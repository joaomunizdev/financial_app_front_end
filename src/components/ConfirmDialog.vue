<template>
  <v-dialog
    :model-value="confirm.visible"
    max-width="440"
    @update:model-value="(open) => !open && confirm.answer(false)"
  >
    <v-card>
      <v-card-title>{{ confirm.title }}</v-card-title>
      <v-card-text>{{ confirm.message }}</v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="confirm.answer(false)">Cancelar</v-btn>
        <v-btn color="error" variant="flat" @click="confirm.answer(true)">
          {{ confirm.confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { useConfirmStore } from "../stores/confirm";

const confirm = useConfirmStore();
</script>
