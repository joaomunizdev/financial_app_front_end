import { defineStore } from 'pinia';
import http from "../plugins/http";

export const useReportsStore = defineStore('reports', {
  state: () => ({ byTenant: [] as any[], global: { totalAmount: '0.00' } }),
  actions: {
    async fetchByTenant(params?: Record<string, any>) {
      const { data } = await http.get('/reports/by-tenant', { params });
      this.byTenant = data;
    },
    async fetchGlobal(params?: Record<string, any>) {
      const { data } = await http.get('/reports/global', { params });
      this.global = data || { totalAmount: '0.00' };
    },
  },
});
