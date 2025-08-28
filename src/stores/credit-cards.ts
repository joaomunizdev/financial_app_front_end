import { defineStore } from 'pinia';
import http from "../plugins/http";

export const useCreditCardsStore = defineStore('creditCards', {
  state: () => ({ items: [] as any[] }),
  actions: {
    async fetch() {
      const { data } = await http.get('/credit-cards');
      this.items = data;
    },
    async create(payload: any) {
      await http.post('/credit-cards', payload);
      await this.fetch();
    },
  },
});
