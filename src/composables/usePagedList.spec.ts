import { beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import { flushPromises } from "@vue/test-utils";
import { useDebounced, usePagedList } from "./usePagedList";

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../plugins/http", () => ({ default: http }));

const page = (items: string[], total: number) => ({ data: { items, total, page: 1, pageSize: 10 } });

function setup(filters = () => ({}) as Record<string, string | null>) {
  const scope = effectScope();
  const list = scope.run(() => usePagedList<string>("/things", filters))!;
  return { list, scope };
}

beforeEach(() => {
  vi.clearAllMocks();
  http.get.mockResolvedValue(page(["a"], 1));
});

describe("usePagedList", () => {
  it("loads on the table's first options event with page, size, sort and non-empty filters", async () => {
    const { list } = setup(() => ({ search: "", tenantId: "t1", categoryId: null }));
    list.onOptions({ page: 2, itemsPerPage: 25, sortBy: [{ key: "name", order: "desc" }] });
    await flushPromises();
    expect(http.get).toHaveBeenCalledWith("/things", {
      params: { page: 2, pageSize: 25, tenantId: "t1", sortBy: "name", sortDir: "desc" },
    });
    expect(list.items.value).toEqual(["a"]);
    expect(list.total.value).toBe(1);
  });

  it("ignores an options event that changes nothing after the first load", async () => {
    const { list } = setup();
    const opts = { page: 1, itemsPerPage: 10, sortBy: [] };
    list.onOptions(opts);
    list.onOptions({ ...opts });
    await flushPromises();
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it("goes back to page 1 when a filter changes", async () => {
    const tenant = ref("t1");
    const { list } = setup(() => ({ tenantId: tenant.value }));
    list.onOptions({ page: 3, itemsPerPage: 10, sortBy: [] });
    await flushPromises();
    tenant.value = "t2";
    await nextTick();
    await flushPromises();
    expect(http.get).toHaveBeenLastCalledWith("/things", {
      params: { page: 1, pageSize: 10, tenantId: "t2" },
    });
    expect(list.options.value.page).toBe(1);
  });

  it("steps back when the current page became empty (e.g. after a deletion)", async () => {
    http.get.mockResolvedValueOnce(page([], 11)).mockResolvedValueOnce(page(["k"], 11));
    const { list } = setup();
    list.onOptions({ page: 4, itemsPerPage: 5, sortBy: [] });
    await flushPromises();
    expect(http.get).toHaveBeenCalledTimes(2);
    expect(http.get).toHaveBeenLastCalledWith("/things", { params: { page: 3, pageSize: 5 } });
    expect(list.options.value.page).toBe(3);
    expect(list.items.value).toEqual(["k"]);
  });

  it("keeps only the latest response", async () => {
    let resolveFirst!: (v: unknown) => void;
    http.get
      .mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
      .mockResolvedValueOnce(page(["new"], 1));
    const { list } = setup();
    list.onOptions({ page: 1, itemsPerPage: 10, sortBy: [] });
    list.onOptions({ page: 2, itemsPerPage: 10, sortBy: [] });
    await flushPromises();
    resolveFirst(page(["old"], 1));
    await flushPromises();
    expect(list.items.value).toEqual(["new"]);
    expect(list.loading.value).toBe(false);
  });
});

describe("useDebounced", () => {
  it("follows the source only after it stops changing", async () => {
    vi.useFakeTimers();
    const src = ref("a");
    const out = useDebounced(src, 300);
    src.value = "ab";
    await nextTick();
    src.value = "abc";
    await nextTick();
    vi.advanceTimersByTime(299);
    expect(out.value).toBe("a");
    vi.advanceTimersByTime(1);
    expect(out.value).toBe("abc");
    vi.useRealTimers();
  });
});
