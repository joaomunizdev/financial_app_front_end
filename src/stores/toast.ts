import { defineStore } from "pinia";

type ToastColor = "success" | "error";

type ToastPayload = {
  message: string;
  color?: ToastColor;
  timeout?: number;
};

export const useToastStore = defineStore("toast", {
  state: () => ({
    visible: false,
    message: "",
    color: "success" as ToastColor,
    timeout: 3500,
  }),
  actions: {
    show(payload: ToastPayload) {
      this.message = payload.message;
      this.color = payload.color ?? "success";
      this.timeout = payload.timeout ?? 3500;
      this.visible = true;
    },
    hide() {
      this.visible = false;
    },
  },
});
