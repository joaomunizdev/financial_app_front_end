import { ref, watch, type Ref } from "vue";
import http from "../plugins/http";
import type { Page } from "../types/domain";

type SortItem = { key: string; order?: boolean | "asc" | "desc" };
export type TableOptions = { page: number; itemsPerPage: number; sortBy: SortItem[] };
type Filters = Record<string, string | number | boolean | null | undefined>;

/** Waits for typing to stop before searching (one request per pause, not per key). */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Server-side paging for `<v-data-table-server>`: bind `items`, `total`, `loading`,
 * `options.*` and `@update:options="onOptions"`. The table emits its options when
 * mounted, which triggers the first load. Changing the filters goes back to page 1.
 * Empty filter values are not sent.
 */
export function usePagedList<T>(
  url: string,
  filters: () => Filters = () => ({}),
  initial: Partial<TableOptions> = {}
) {
  const items = ref([]) as Ref<T[]>;
  const total = ref(0);
  const loading = ref(false);
  const options = ref<TableOptions>({ page: 1, itemsPerPage: 10, sortBy: [], ...initial });
  // Only the latest request may update the table (fast filter/page changes).
  let requestId = 0;

  async function load() {
    const id = ++requestId;
    loading.value = true;
    try {
      const { page, itemsPerPage, sortBy } = options.value;
      const sort = sortBy[0];
      const params: Filters = { page, pageSize: itemsPerPage };
      for (const [k, v] of Object.entries(filters())) {
        if (v !== "" && v !== null && v !== undefined) params[k] = v;
      }
      if (sort) {
        params.sortBy = sort.key;
        params.sortDir = sort.order === "desc" ? "desc" : "asc";
      }
      const { data } = await http.get<Page<T>>(url, { params });
      if (id !== requestId) return;
      // A deletion can empty the last page: step back to the new last one.
      const lastPage = Math.max(1, Math.ceil(data.total / itemsPerPage));
      if (!data.items.length && page > lastPage) {
        options.value = { ...options.value, page: lastPage };
        return load();
      }
      items.value = data.items;
      total.value = data.total;
    } finally {
      if (id === requestId) loading.value = false;
    }
  }

  // The table's first options event must load even though nothing changed.
  let loaded = false;
  function onOptions(next: TableOptions) {
    const cur = options.value;
    const same =
      next.page === cur.page &&
      next.itemsPerPage === cur.itemsPerPage &&
      JSON.stringify(next.sortBy) === JSON.stringify(cur.sortBy);
    options.value = { page: next.page, itemsPerPage: next.itemsPerPage, sortBy: next.sortBy };
    if (!same || !loaded) {
      loaded = true;
      void load();
    }
  }

  watch(
    filters,
    () => {
      options.value = { ...options.value, page: 1 };
      void load();
    },
    { deep: true }
  );

  return { items, total, loading, options, onOptions, reload: load };
}

/** Ref that follows `source` after the user stops typing (for search fields). */
export function useDebounced<T>(source: Ref<T>, ms = SEARCH_DEBOUNCE_MS): Ref<T> {
  const out = ref(source.value) as Ref<T>;
  let timer: ReturnType<typeof setTimeout> | undefined;
  watch(source, (v) => {
    clearTimeout(timer);
    timer = setTimeout(() => (out.value = v), ms);
  });
  return out;
}
