import { defineStore } from "pinia";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmText?: string;
};

// Kept outside the state: functions are not serializable store state.
let pendingResolve: ((confirmed: boolean) => void) | null = null;

export const useConfirmStore = defineStore("confirm", {
  state: () => ({
    visible: false,
    title: "",
    message: "",
    confirmText: "Excluir",
  }),
  actions: {
    /** Opens the global confirmation dialog; resolves true only when the user confirms. */
    ask(options: ConfirmOptions): Promise<boolean> {
      pendingResolve?.(false);
      this.title = options.title;
      this.message = options.message;
      this.confirmText = options.confirmText ?? "Excluir";
      this.visible = true;
      return new Promise((resolve) => {
        pendingResolve = resolve;
      });
    },
    answer(confirmed: boolean) {
      this.visible = false;
      const resolve = pendingResolve;
      pendingResolve = null;
      resolve?.(confirmed);
    },
  },
});
