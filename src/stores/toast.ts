import { defineStore } from "pinia";

type ToastColor = "success" | "error";

type ToastPayload = {
  message: string;
  color?: ToastColor;
  timeout?: number;
};

type ToastItem = Required<ToastPayload>;

const DEFAULT_TIMEOUT = 3500;
// Lets the snackbar finish its leave transition before the next message appears.
const NEXT_TOAST_DELAY_MS = 200;

export const useToastStore = defineStore("toast", {
  state: () => ({
    visible: false,
    message: "",
    color: "success" as ToastColor,
    timeout: DEFAULT_TIMEOUT,
    queue: [] as ToastItem[],
    switching: false,
  }),
  actions: {
    show(payload: ToastPayload) {
      const item: ToastItem = {
        message: payload.message,
        color: payload.color ?? "success",
        timeout: payload.timeout ?? DEFAULT_TIMEOUT,
      };
      if (this.visible || this.switching) this.queue.push(item);
      else this.display(item);
    },
    display(item: ToastItem) {
      this.message = item.message;
      this.color = item.color;
      this.timeout = item.timeout;
      this.visible = true;
    },
    hide() {
      this.visible = false;
      const next = this.queue.shift();
      if (!next) return;
      this.switching = true;
      setTimeout(() => {
        this.switching = false;
        this.display(next);
      }, NEXT_TOAST_DELAY_MS);
    },
  },
});
