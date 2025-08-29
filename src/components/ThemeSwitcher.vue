<script setup lang="ts">
import { onMounted } from "vue";
import { useTheme } from "vuetify";

const THEME_KEY = "financial-app-theme";
const theme = useTheme();

function applyTheme(name: "lightMinimal" | "darkMinimal") {
  theme.global.name.value = name;
  localStorage.setItem(THEME_KEY, name);
}

function toggleTheme() {
  const isDark = theme.global.current.value.dark;
  applyTheme(isDark ? "lightMinimal" : "darkMinimal");
}

onMounted(() => {
  const saved = localStorage.getItem(THEME_KEY) as
    | "lightMinimal"
    | "darkMinimal"
    | null;
  if (saved) applyTheme(saved);
});
</script>

<template>
  <v-tooltip text="Alternar tema" location="bottom">
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        icon
        variant="text"
        class="ml-1"
        @click="toggleTheme"
        :aria-label="
          theme.global.current.value.dark ? 'Tema claro' : 'Tema escuro'
        "
      >
        <v-icon>
          {{
            theme.global.current.value.dark
              ? "mdi-weather-sunny"
              : "mdi-weather-night"
          }}
        </v-icon>
      </v-btn>
    </template>
  </v-tooltip>
</template>
