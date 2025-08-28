import { defineStore } from 'pinia';
import http from "../plugins/http";

export const useTenantsStore = defineStore('tenants', {
  state: () => ({ items: [] as Array<{id: string; name: string}> }),
  actions: {
    async fetch(search?: string) {
      const { data } = await http.get('/tenants', { params: { search } });
      this.items = data;
    },
    async create(name: string) {
      await http.post('/tenants', { name });
      await this.fetch();
    },
  },
});
