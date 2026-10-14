/// <reference types="vitest" />
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";

export default defineConfig({
  plugins: [vue(), vuetify()],
  server: { port: 5173 },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.spec.ts"],
    setupFiles: ["src/test/setup.ts"],
    server: { deps: { inline: ["vuetify"] } },
  },
});
