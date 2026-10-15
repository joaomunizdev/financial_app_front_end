import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createVuetify } from "vuetify";
import CategoriesPage from "./CategoriesPage.vue";
import type { Category } from "../types/domain";

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("../plugins/http", () => ({ default: http }));

const categories: Category[] = [
  { id: "d1", name: "Lazer", icon: "mdi-party-popper", isDefault: true },
  { id: "u1", name: "Academia", icon: "mdi-dumbbell", isDefault: false },
];

type PageVm = {
  openNew: () => void;
  edit: (c: Category) => void;
  save: () => Promise<void>;
  form: { id: string; name: string; icon: string };
  errors: { name: string[] };
};

async function mountPage() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const wrapper = mount(CategoriesPage, {
    global: { plugins: [pinia, createVuetify()] },
  });
  await flushPromises();
  return { wrapper, vm: wrapper.vm as unknown as PageVm };
}

// GET /categories: a page per scope (tables) or the full array (duplicate check).
function serve(list: Category[]) {
  http.get.mockImplementation(async (_url: string, config?: { params?: { scope?: string } }) => {
    const scope = config?.params?.scope;
    if (!scope) return { data: list };
    const items = list.filter((c) => c.isDefault === (scope === "default"));
    return { data: { items, total: items.length, page: 1, pageSize: 10 } };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  serve(categories);
  http.post.mockResolvedValue({ data: {} });
  http.patch.mockResolvedValue({ data: {} });
});

describe("CategoriesPage", () => {
  it("only offers edit/delete for the user's own categories", async () => {
    const { wrapper } = await mountPage();
    const rows = wrapper.findAll("tbody tr");
    const row = (name: string) => rows.find((r) => r.text().includes(name))!;
    expect(row("Lazer").find('[aria-label="Editar"]').exists()).toBe(false);
    expect(row("Academia").find('[aria-label="Editar"]').exists()).toBe(true);
    expect(row("Academia").find('[aria-label="Excluir"]').exists()).toBe(true);
  });

  it("invites to create a category when the user has none of their own", async () => {
    serve([categories[0]]);
    const { wrapper } = await mountPage();
    expect(wrapper.text()).toContain("Crie categorias do seu jeito");
    expect(wrapper.text()).toContain("Lazer");
  });

  it("loads each table from the server with its scope", async () => {
    await mountPage();
    expect(http.get).toHaveBeenCalledWith("/categories", {
      params: { page: 1, pageSize: 10, scope: "own" },
    });
    expect(http.get).toHaveBeenCalledWith("/categories", {
      params: { page: 1, pageSize: 10, scope: "default" },
    });
  });

  it("refuses a name already used by a default category, ignoring case", async () => {
    const { vm } = await mountPage();
    vm.openNew();
    vm.form.name = " lazer ";
    await vm.save();
    expect(http.post).not.toHaveBeenCalled();
    expect(vm.errors.name).toEqual(["Já existe uma categoria com esse nome"]);
  });

  it("creates a category with a trimmed name and the chosen icon", async () => {
    const { vm } = await mountPage();
    vm.openNew();
    vm.form.name = "  Mercado do bairro ";
    vm.form.icon = "mdi-cart-outline";
    await vm.save();
    expect(http.post).toHaveBeenCalledWith("/categories", {
      name: "Mercado do bairro",
      icon: "mdi-cart-outline",
    });
  });

  it("keeps its own name when renaming a category", async () => {
    const { vm } = await mountPage();
    vm.edit(categories[1]);
    vm.form.icon = "mdi-run";
    await vm.save();
    expect(http.patch).toHaveBeenCalledWith("/categories/u1", {
      name: "Academia",
      icon: "mdi-run",
    });
  });
});
