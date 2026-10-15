import "vuetify/styles";
import { createVuetify, ThemeDefinition } from "vuetify";
import { pt } from "vuetify/locale";

// Neutral SaaS palette (zinc neutrals + a single indigo accent). Semantic colors
// are reserved for states (paid, open, errors), never decoration.
// Theme names are kept for compatibility with the value stored by ThemeSwitcher.
const lightMinimal: ThemeDefinition = {
  dark: false,
  colors: {
    primary: "#4F46E5",
    secondary: "#52525B",
    surface: "#FFFFFF",
    background: "#FAFAFA",
    "surface-light": "#F4F4F5",
    "on-surface": "#18181B",
    "on-background": "#18181B",
    success: "#059669",
    warning: "#D97706",
    info: "#0284C7",
    error: "#DC2626",
  },
  variables: {
    "border-color": "#18181B",
    "border-opacity": 0.12,
    "medium-emphasis-opacity": 0.66,
  },
};

const darkMinimal: ThemeDefinition = {
  dark: true,
  colors: {
    primary: "#818CF8",
    secondary: "#A1A1AA",
    surface: "#18181B",
    background: "#09090B",
    "surface-light": "#27272A",
    "on-surface": "#FAFAFA",
    "on-background": "#FAFAFA",
    success: "#34D399",
    warning: "#FBBF24",
    info: "#38BDF8",
    error: "#F87171",
  },
  variables: {
    "border-color": "#FAFAFA",
    "border-opacity": 0.12,
    "medium-emphasis-opacity": 0.66,
  },
};

// Components and directives are imported on demand by vite-plugin-vuetify (autoImport).
export const vuetify = createVuetify({
  locale: { locale: "pt", fallback: "pt", messages: { pt } },
  theme: {
    defaultTheme: "lightMinimal",
    themes: { lightMinimal, darkMinimal },
  },
  defaults: {
    VTextField: {
      variant: "outlined",
      density: "compact",
      color: "primary",
    },
    VSelect: { variant: "outlined", density: "compact", color: "primary" },
    VAutocomplete: { variant: "outlined", density: "compact", color: "primary" },
    VBtn: { rounded: "lg", color: "primary", variant: "flat" },
    VCard: { variant: "flat", border: true },
    VDataTable: {
      density: "comfortable",
      hover: true,
      // Row actions are quiet: neutral icons unless a page asks for a color.
      VBtn: { color: "default" },
    },
    // Server-paginated lists (usePagedList): same look, API page sizes (max 100).
    VDataTableServer: {
      density: "comfortable",
      hover: true,
      itemsPerPageOptions: [10, 25, 50, 100],
      VBtn: { color: "default" },
    },
    VAlert: { variant: "tonal" },
    VChip: { rounded: "pill" },
  },
});
