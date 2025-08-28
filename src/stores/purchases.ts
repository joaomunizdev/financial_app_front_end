import { defineStore } from 'pinia';
import http from "../plugins/http";

export const usePurchasesStore = defineStore('purchases', {
  state: () => ({ items: [] as any[] }),
  actions: {
    async fetch(params?: Record<string, any>) {
      const { data } = await http.get('/purchases', { params });
      this.items = data;
    },
    async create(payload: any) {
      await http.post('/purchases', payload);
      await this.fetch();
    },
    async setInstallmentsPaid(id: string, installmentsPaid: number) {
      await http.post(`/purchases/${id}/installments-paid`, { installmentsPaid });
      await this.fetch();
    },
    async remove(id: string) {
      await http.delete(`/purchases/${id}`);
      await this.fetch();
    },
  },
});
