import { createApp } from "vue";
import { isAxiosError } from "axios";
import App from "./App.vue";
import router from "./router";
import { createPinia } from "pinia";
import { vuetify } from "./plugins/vuetify";
import "@mdi/font/css/materialdesignicons.css";
import "./styles/app.css";

const app = createApp(App);

// Async handlers/hooks may reject with API errors. Those were already reported to the user
// by the http interceptor (toast or 401 redirect), so they are not logged again.
app.config.errorHandler = (err) => {
  if (isAxiosError(err)) return;
  console.error(err);
};

app.use(createPinia());
app.use(router);
app.use(vuetify);
app.mount("#app");
