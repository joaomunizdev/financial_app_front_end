import "vuetify/styles";
import { createVuetify, ThemeDefinition } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

const lightMinimal: ThemeDefinition = {
  dark: false,
  colors: {
    primary: "#2E3A59",
    secondary: "#667085",
    surface: "#FFFFFF",
    background: "#F7F8FA",
    success: "#16A34A",
    warning: "#F59E0B",
    info: "#0EA5E9",
    error: "#DC2626",
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
    themes: { lightMinimal },
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
