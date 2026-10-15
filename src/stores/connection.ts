import { defineStore } from "pinia";

/** Set by the http interceptor when a request gets no response (server unreachable). */
export const useConnectionStore = defineStore("connection", {
  state: () => ({ offline: false }),
  actions: {
    markOffline() {
      this.offline = true;
    },
    markOnline() {
      this.offline = false;
    },
  },
});
