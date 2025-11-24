import "vuetify/styles";
import { createVuetify, ThemeDefinition } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

const lightMinimal: ThemeDefinition = {
  dark: false,
  colors: {
    primary: "#1D4ED8",
    secondary: "#1E3A8A",
    surface: "#FFFFFF",
    background: "#F3F6FC",
    success: "#059669",
    warning: "#F59E0B",
    info: "#38BDF8",
    error: "#DC2626",
  },
  variables: {
    "border-radius": "12px",
  },
};

const darkMinimal: ThemeDefinition = {
  dark: true,
  colors: {
    primary: "#60A5FA",
    secondary: "#93C5FD",
    surface: "#0F172A",
    background: "#020617",
    success: "#34D399",
    warning: "#FBBF24",
    info: "#7DD3FC",
    error: "#F87171",
  },
  variables: {
    "border-radius": "12px",
  },
};

export const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: "lightMinimal",
    themes: { lightMinimal, darkMinimal },
  },
  defaults: {
    VTextField: {
      variant: "outlined",
      density: "comfortable",
      color: "primary",
    },
    VBtn: { rounded: "lg", color: "primary" },
    VSelect: { variant: "outlined", density: "comfortable", color: "primary" },
    VCard: { rounded: "xl", elevation: 1 },
    VDataTable: {
      density: "comfortable",
      hover: true,
    },
  },
});
