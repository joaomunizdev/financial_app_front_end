# CLAUDE.md

Guidance for Claude Code when working in this repository. The source code is the source of truth; `README.md` describes intent and in several places does not match the implementation (see "README vs. implementation").

## 1. Project Overview

Personal-finance SPA (credit cards, purchases/installments, statements, subscriptions, fixed expenses, income sources, tenants, reports). It is a thin client over the **Financial App Backend** REST API (separate repo: `joaomunizdev/financial_app_back_end`, Swagger at `http://localhost:3000/api/docs` when running locally). All financial calculations (statement totals, installment impact, report totals, PDF generation) live in the backend; the frontend renders, filters, formats and posts data.

Stack (installed versions): Vue 3.5 (`<script setup lang="ts">`), TypeScript 5 (`strict`), Vite 5, Vuetify 3.9 (via `vite-plugin-vuetify`), Pinia 2, Vue Router 4, Axios 1, VeeValidate 4 + Yup 1, `@mdi/font`, Vitest 1. Sass is installed but no SFC uses `lang="scss"`; styles are plain scoped CSS.

Language: identifiers, file names and API fields are English; **all user-facing text is pt-BR** (labels, toasts, validation messages). Money is BRL, dates displayed as `pt-BR`. The "tenant" entity is labeled **"Responsável"** in the UI.

## 2. Architecture

```
src/
  main.ts                 # createApp + Pinia + router + vuetify + MDI css
  App.vue                 # renders <AppShell/> only
  components/
    AppShell.vue          # Layout: auth layout vs. drawer/app-bar layout, nav items, page titles, global <v-snackbar> (toast)
    FilterBar.vue         # year + month filter (used by ReportsPage)
    PeriodFilterBar.vue   # card + year + month + find/generate/clear (used by StatementsPage)
    PurchaseForm.vue      # VeeValidate form for purchases (used by PurchasesPage)
    StatCard.vue          # label/value/icon card
    ThemeSwitcher.vue     # toggles lightMinimal/darkMinimal, persists in localStorage "financial-app-theme"
  composables/useCurrency.ts   # BRL parse/format helpers (only composable)
  pages/*Page.vue         # one page per route; pages own their data fetching
  plugins/
    http.ts               # THE Axios instance (auth header, toasts, 401 handling) — default export
    vuetify.ts            # themes + component defaults
  router/index.ts         # routes + global auth guard
  schemas/purchaseSchema.ts    # Yup schema used by PurchaseForm
  stores/
    auth.ts               # token/email, login/register/logout; also re-exports `http`
    toast.ts              # global snackbar state
    credit-cards.ts, purchases.ts, reports.ts, tenants.ts   # UNUSED (see §5)
  api/http.ts             # UNUSED legacy Axios instance (see §12)
```

### Actual data flow

```
Page (<script setup>)  ──>  http (src/plugins/http.ts)  ──>  backend
   local refs: items/loading/saving/open/form/errors
   after every mutation: re-fetch the list (fetchAll / load / loadPurchases)
```

Pages do **not** go through Pinia domain stores. Only `auth` and `toast` stores are live. Each page fetches its own reference data (cards, tenants) in parallel with `Promise.all` on `onMounted`.

## 3. Development Commands

```bash
npm install            # or npm ci
cp .env.example .env   # VITE_API_URL=http://localhost:3000/api
npm run dev            # Vite dev server, port 5173
npm run build          # vite build -> dist/ (NO type-checking step)
npm run preview        # vite preview --host 0.0.0.0 --port 5173
npm test               # vitest (watch mode). Use `npx vitest run` for a single run.
docker compose up -d --build   # builds image and serves via vite preview on 5173
```

Facts to keep in mind:
- There are **no test files**; `npx vitest run` currently exits with code 1 ("No test files found").
- There is **no working type-check command**: no `vue-tsc`, no `env.d.ts`, and `npx tsc --noEmit` fails on `node_modules` typings. `npm run build` succeeds but does not validate types. Do not claim types were checked unless you set up and ran an actual check (and adding tooling requires user approval).
- No ESLint/Prettier config exists. Match the surrounding formatting (double quotes and semicolons in most files; a few stores use single quotes — follow the file you edit).
- Production bundle has one ~610 kB chunk (Vuetify registers all components/directives); a size warning on build is expected.

## 4. Coding Conventions

### Components and pages
- Always `<script setup lang="ts">`; Composition API only. Template first, then script, then `<style scoped>` (ThemeSwitcher is the exception with script first).
- Pages: `src/pages/<Domain>Page.vue`, PascalCase. Routes are lazy-loaded in `router/index.ts`.
- Props/emits are declared with type-only `defineProps<{...}>()` / `defineEmits<{ (e: "x", v: T): void }>()`.
- Filter components use a "local ref + two-way watch" pattern: props `modelValueYear`/`modelValueMonth`/`modelValueCardId`, emit `update:year`/`update:month`/`update:cardId`, plus action events (`apply`, `find`, `generate`, `clear`). Parent binds with `@update:year="(v) => (year = v)"`. Follow this pattern when extending them.
- CRUD page template (CreditCards, Tenants, FixedExpenses, IncomeSources, Subscriptions): header row (`text-h5` title + "Novo…" `v-btn prepend-icon="mdi-plus"`), `<v-card><v-data-table :items :headers :loading class="pa-2">`, an actions column (`mdi-pencil` edit, `mdi-delete` with `color="error"`), and a `<v-dialog v-model="open">` with the form. Title switches on `form.id` ("Editar …" / "Novo …").
- Dialog reset convention: `watch(open, v => { if (!v) { resetForm(); clearErrors(); dialogKey.value++ } })` with `:key="dialogKey"` on the dialog.
- Table headers: `{ title, key, align: "end" as const, sortable: false }`; money columns `align: "end"`; actions column has empty title.
- Reusable dialogs with several fields are modeled as one `reactive({ open, ...fields, loading/saving })` object (see `generateDlg`, `installmentsDlg`, `exportDlg`).
- Status values use `<v-chip variant="tonal" size="small">` with `primary`/`secondary`/`success` colors.

### TypeScript
- `strict` is on, but existing code uses `any` heavily for API entities (`ref<any[]>`, `(it: any)`). There are no shared entity types. For **new or touched code**, prefer local `type` aliases (as in `SubscriptionsPage.vue`: `type Subscription = {...}`, and form types `type FormT = {...}`) instead of adding more `any`. Don't introduce a global types layer unless asked.
- API ids are strings (UUID-like); money fields arrive from the API as decimal strings (e.g. `"0.00"`); `year`/`month` are numbers, month is 1-based.

### Composables and helpers
- `useCurrency()` is the canonical BRL helper: `toNumberBRL` (parses "R$ 1.234,56", "1234.56", etc.), `toCurrencyBRL`, `formatCurrencyOnType` (cents-based input mask), `digitsOnly(v, maxLen)`, `sanitizeCurrencyInput`, `formatCurrencyString`. Use it for new money inputs/display.
- Several pages still define a local `currency(v)` (Number + `toLocaleString("pt-BR", BRL)`), `formatDateBR(d)` (with `timeZone: "UTC"` — keep UTC so ISO dates don't shift a day), and a pt-BR `months` array. Reuse these patterns; if you need them in a new place, prefer `useCurrency` and consider extracting only when the user asks for refactoring.

### Styling
- Vuetify components + utility classes. Theme colors via `rgb(var(--v-theme-primary))`; global defaults (outlined/comfortable fields, `rounded="lg"` buttons, `rounded="xl"` cards) are set in `plugins/vuetify.ts` — don't repeat them per component unless overriding.
- Note: `gap-2`/`gap-3`/`gap-4` used throughout are **not Vuetify classes** (Vuetify 3 uses `ga-*`) and currently have no effect. For new spacing use `ga-*` or scoped CSS `gap:`. Pages also use empty `<v-row><v-col cols="12"></v-col>…</v-row>` blocks as vertical spacers; don't spread this further.

## 5. State Management (Pinia)

Live stores (options API `defineStore`):
- `auth` (`stores/auth.ts`): state `token` (initialized from `localStorage["token"]`), `email`; getter `isAuthenticated = !!token`; actions `register`, `login` (stores token, shows toast, waits `REQUEST_DELAY_MS`), `logout({ silent? })`, `hydrateFromStorage()`. It also does `export { default as http } from "../plugins/http"` — several pages import `http` from here; it is the same instance as `plugins/http`.
- `toast` (`stores/toast.ts`): `show({ message, color: "success" | "error", timeout = 3500 })`, `hide()`. Rendered once by `AppShell.vue`.

Unused stores: `credit-cards.ts`, `purchases.ts`, `reports.ts`, `tenants.ts` are imported nowhere. They are partial (e.g. no update/delete for cards) and call endpoints like `/reports/global` and `POST /purchases/:id/installments-paid` that no page uses. Do not assume they reflect current behavior. When adding features, follow the page-local pattern unless the user asks to migrate to stores; don't delete these files without approval.

Loading/error state is page-local: `loading` for list fetches, `saving` for submits, `detailLoading`/dialog `loading` for secondary fetches, always reset in `finally`.

## 6. API Integration

Single HTTP client: **`src/plugins/http.ts`** (default export; also available as `import { http } from "../stores/auth"`). Never use `src/api/http.ts` or create a new Axios instance.

- `baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000/api"`. Paths are relative (`/credit-cards`), never hard-code hosts.
- Request interceptor: adds `Authorization: Bearer <auth.token>`; attaches `__toastMeta` for mutating requests on known entities.
- **Automatic toasts**: for `POST`→create, `PUT/PATCH`→update, `DELETE`→delete, when the URL matches `ENTITY_MATCHERS` (`/purchases`, `/credit-cards`, `/fixed-expenses`, `/income-sources`, `/tenants`, `/auth/register`, `/users`). The response is **delayed by `REQUEST_DELAY_MS` (900 ms)** and a pt-BR success/error toast is shown. Consequences:
  - Do not add manual success/error toasts for these entities (they would duplicate).
  - `/statements` and `/subscriptions` are **not** matched → no toast, no delay. If a new entity needs toasts, add a matcher (entity name in pt-BR) rather than calling the toast store from the page.
  - Any new POST under a matched path (e.g. `/purchases/:id/...`) will show a "cadastro de Compra" toast.
- Response error interceptor: on **401** → `auth.logout({ silent: true })` and `location.assign("/login")` (unless already there). Errors are always re-thrown.
- GET failures have no user-facing feedback (no toast); pages generally don't `catch`. `StatementsPage.findByPeriod` treats 404 as empty result. Keep `try/finally` for loading flags; add `catch` only where you need specific UX.

### Endpoints used by the UI
| Domain | Calls |
|---|---|
| Auth | `POST /auth/login {email,password}` → `{accessToken}`; `POST /auth/register {name,email,password}` |
| Credit cards | `GET /credit-cards`; `POST`; `PATCH /:id`; `DELETE /:id` — body `{nickname, brand, last4, limitAmount:number}` |
| Tenants | `GET /tenants` (client-side name search); `POST`/`PATCH /:id` `{name}`; `DELETE /:id` |
| Purchases | `GET /purchases` (supports `creditCardId`, `tenantId` params; UI currently sends none); `POST`; `PATCH /:id`; `DELETE /:id` — body from `PurchaseForm` |
| Statements | `GET /statements?year&month[&creditCardId]` (array; code also tolerates a single object); `GET /statements?creditCardId`; `POST /statements {creditCardId,year,month}` (generate); `GET /statements/:id` (detail with `items[] {label, amount}`); `PATCH /statements/:id {closingDate,dueDate,locked,adjustmentAmount}`; `POST /statements/:id/pay {amount, paidAt}` |
| Subscriptions | `GET/POST /subscriptions`; `PATCH/DELETE /subscriptions/:id` — body `{creditCardId, tenantId, description, amount:string, active}` |
| Fixed expenses | `GET/POST /fixed-expenses`; `PATCH/DELETE /:id` — `{tenantId, description, amount:number}`; list items include `tenant.name` |
| Income sources | `GET/POST /income-sources`; `PATCH/DELETE /:id` — `{tenantId, description, amount:number, incomeType: "fixed"|"one_time"}` |
| Reports | `GET /reports/by-tenant?year&month` → `[{tenantName, reportExpensesTotal}]`; `GET /reports/installments-total?creditCardId&tenantId&year&month` → `{totalAmount}`; `GET /reports/tenants/:id/monthly-pdf?year&month` (`responseType: "blob"`) |

Payload money formats are inconsistent across domains (number with 2 decimals vs. decimal string). **Preserve each domain's existing format** — the backend contract is not visible here; verify in Swagger before changing.

## 7. Routing and Authentication

- `createWebHistory`; `/` → `/dashboard`. Protected routes have `meta: { auth: true }`; `/login` and `/register` have `meta: { layout: "auth" }` (AppShell switches layout on `route.meta.layout === "auth"`).
- Guard (`router.beforeEach`): hydrates token from localStorage if missing; `meta.auth && !isAuthenticated` → `/login`; authenticated user on `/login`/`/register` → `/dashboard`.
- Token: raw JWT stored in `localStorage["token"]`. No decoding, no expiry check, no refresh — the session ends only via logout or a backend 401.
- Post-login/logout/register navigation uses `location.assign(...)` (full reload), not `router.push`. Keep that unless deliberately changing auth flow (a reload guarantees clean store state).
- Register flow: `register` then immediately `login` with the same credentials.
- Adding a page requires three edits: route in `router/index.ts` (with `meta: { auth: true }`), nav item in `AppShell.vue` `items`, and title in AppShell's `title` map.

## 8. Business Domains (frontend-implemented behavior only)

- **Dashboard** (`DashboardPage.vue`): fetches cards + tenants; shows card count, tenant count, and combined limit (sum of `limitAmount`, falls back to `limitamount`). "Cartões ativos" lists all cards (no active filter exists). No income/expense/balance data.
- **Credit cards** (`CreditCardsPage.vue`): inline Yup schema — nickname/brand required, `last4` exactly 4 digits (input sanitized with `digitsOnly`), limit must parse to a non-negative BRL number; limit input uses `formatCurrencyOnType` mask and is sent as `Number(n.toFixed(2))`. Cards are reference data for purchases, statements, subscriptions, reports.
- **Tenants** (`TenantsPage.vue`): name required; per-field validation on blur; search is client-side. Tenants are referenced by purchases, subscriptions, fixed expenses, income sources and reports — deletions may be rejected/cascaded by the backend.
- **Purchases** (`PurchasesPage.vue` + `PurchaseForm.vue` + `schemas/purchaseSchema.ts`): the only VeeValidate form. Rules: card, tenant, description, positive `totalAmount`, valid `purchaseDate` required; if `isInstallment`, `installmentsTotal` integer ≥ 2 and `installmentsPaid` integer 0..installmentsTotal. Amount input is masked (`maskedTotalAmount`) while the form field holds a number. `PurchaseForm` reads `modelValue` only into `initialValues` (no re-init on prop change) and emits `submit` with `{...values, id}`; the page strips `id` and POSTs/PATCHes. Installment amounts per month are computed by the backend.
- **Statements** (`StatementsPage.vue` + `PeriodFilterBar.vue`): list by year/month (+ optional card); "Gerar fatura" dialog generates for every selected card × month **sequentially** (one POST each), then reloads those periods; detail dialog edits closing/due dates (free-text `YYYY-MM-DD`), adjustment amount, and `locked`; lock toggle from the table; pay dialog posts amount/date (defaults: statement total, today). `isFiltered` decides whether refresh uses `findByPeriod` or `load`. Statement totals/items come from the backend.
- **Subscriptions** (`SubscriptionsPage.vue`): card/status filters and description search are client-side (`applyFilters` is a no-op; filtering is reactive). Amount is free text, `,` replaced with `.`, sent as string; no form validation. New form preselects first card/tenant.
- **Fixed expenses** / **Income sources**: same CRUD pattern with tenant select, description, masked BRL amount; income adds `incomeType` (`fixed` → "Fixa", `one_time` → "Pontual"), default `fixed`.
- **Reports** (`ReportsPage.vue` + `FilterBar.vue`): by-tenant totals for year/month; rows with total 0 are hidden; "Total filtrado" is the **client-side sum** of the visible rows (not `/reports/global`). The table value is pre-formatted to a currency string (so sorting is lexical). "Parcelas futuras" queries the backend installments total for card+tenant+period. "Exportar PDF" builds the period list from existing statements of all cards (deduplicated by `MM/YYYY`), then downloads one PDF per tenant × period sequentially via blob + temporary `<a download>`.
- **Period filters**: months are 1-based numbers with pt-BR long names; defaults are the current year/month.

Rules NOT implemented in the frontend (backend responsibility): statement composition and totals, installment scheduling, report aggregation, PDF content, ownership/authorization of data, cascading deletes.

## 9. UI and Forms

- Themes: `lightMinimal` (default) and `darkMinimal` defined in `plugins/vuetify.ts`; logos swap between `assets/logo.png` and `assets/white-logo.png` by theme. New colors should be theme tokens, not hard-coded hex.
- Responsiveness: AppShell drawer becomes rail/expand-on-hover on `mdAndDown`; pages use `v-row`/`v-col cols="12" md="…"` and flex-wrap filter sheets.
- Validation has two coexisting patterns — follow the one already used by the page you edit:
  1. VeeValidate `useForm({ validationSchema })` + `defineField` (PurchaseForm; schema in `src/schemas/`).
  2. Inline Yup schema + `reactive` `errors: Record<field, string[]>` + `validateAll()` with `abortEarly: false`, bound via `:error-messages` (CreditCards, Tenants, FixedExpenses, IncomeSources).
  For a new standalone form, pattern 2 is the most common; put a reusable schema in `src/schemas/` only when it's shared or used with VeeValidate.
- Validation messages in pt-BR.
- Empty states: `v-alert type="info" variant="tonal"` (Dashboard) or `#no-data` slot (Subscriptions).
- Notifications: global snackbar via `useToastStore().show(...)`; prefer the interceptor's automatic toasts for CRUD.

## 10. Testing and Quality

Current state: Vitest is installed with default config (no `vitest.config.*`, no `@vue/test-utils`, no jsdom/happy-dom). No tests exist.

- Pure logic (e.g. `useCurrency`, `purchaseSchema`) can be tested with Vitest as-is: colocate as `*.spec.ts` (Vitest default include `**/*.{test,spec}.?(c|m)[jt]s?(x)`) and run `npx vitest run <path>`.
- Component/page tests need `@vue/test-utils` and a DOM environment — new dev dependencies; ask before adding.
- Store tests need `setActivePinia(createPinia())`; `plugins/http.ts` imports stores, so mock `axios`/the http module rather than hitting the network.

Validation checklist for every change:
1. `npm run build` succeeds (catches template/SFC compile errors, not type errors).
2. If you added tests: `npx vitest run` for the relevant files.
3. Type safety: review manually (no type-check script exists); don't widen to `any`.
4. Exercise loading, error (backend down / 4xx), and empty-list states of the affected page.
5. If the backend is available (`VITE_API_URL`), verify requests/payloads against Swagger.
6. Check dependent pages: changes to cards/tenants affect Purchases, Statements, Subscriptions, FixedExpenses, IncomeSources, Reports, Dashboard; changes to `plugins/http.ts` affect every request and toast.
Only report a check as done if you actually ran it.

## 11. Development Guidelines

- Read the target page and its siblings before changing anything; copy the closest existing pattern rather than inventing one.
- Keep changes in scope. No opportunistic refactors (e.g. migrating pages to stores, deduplicating `currency()`/`formatDateBR`/`months`, replacing `any`) unless requested — mention them instead.
- Reuse `http`, `useCurrency`, `StatCard`, `FilterBar`/`PeriodFilterBar`, and existing Vuetify defaults. Don't add dependencies when Vuetify/Yup/VeeValidate/Axios cover the need.
- Respect existing API payload shapes and field names; never rename fields or change number/string money formats without confirming the backend contract.
- Every async action: set its loading flag, reset in `finally`, and refresh the affected list after mutations (current convention is re-fetch, not optimistic update).
- Bug fixes: reproduce from the code path, fix minimally, check whether the same bug pattern exists in sibling pages and report it (fix only if asked).
- New domain page: route + AppShell nav item + AppShell title + page following the CRUD template; add an `ENTITY_MATCHERS` entry if it should get automatic toasts.
- Ask before destructive actions (deleting files including the unused stores/`api/http.ts`, changing auth storage, altering Docker/build config).

## 12. Important Constraints and Known Pitfalls

- **One HTTP client.** `src/plugins/http.ts` owns auth headers, toasts, the 900 ms mutation delay and 401 handling. `src/api/http.ts` is dead code and reads a different key (`localStorage["accessToken"]`) than the auth store (`"token"`) — using it would send unauthenticated requests.
- **Circular import**: `plugins/http.ts` ⇄ `stores/auth.ts`. It works because stores are resolved lazily inside interceptors/actions; keep `useAuthStore()`/`useToastStore()` calls inside functions, never at module top level.
- **Sensitive data**: financial data and JWT live in the browser. Don't log API responses/tokens to the console, don't persist financial data in localStorage, keep the token key `token` unless changing the whole auth flow.
- `LoginPage.vue` pre-fills `admin@example.com` / `Admin@123` (dev convenience) — don't propagate; flag if asked about production readiness.
- `VITE_*` vars are **build-time**. `docker-compose.yml` sets `VITE_API_URL` as a runtime env var, which does not affect the already-built bundle; there is no `.dockerignore`, so a local `.env` is copied into the Docker build context and used at build time.
- `PurchasesPage`: "Nova" doesn't reset `form` (after closing an edit dialog without saving, "Nova" reopens in edit mode), and `PurchaseForm` initializes from `modelValue` only once.
- `StatementsPage`: `@clear` calls `load()` without resetting filters; `clearFilter()` is unused.
- `TenantsPage.vue` has a stray `<` text node at the top of the template.
- Unused code: `stores/{credit-cards,purchases,reports,tenants}.ts`, `CreditCardsPage.openNew`, `PurchasesPage.filters`, `SubscriptionsPage.applyFilters`, `api/http.ts`.

### README vs. implementation
- README flow "Page → Pinia Store → Axios" — pages call Axios directly; domain stores are unused.
- README Dashboard "combines purchases, subscriptions, fixed expenses, income, balance" — it only shows cards, tenants and combined limit.
- README "cards have Active status" — no active field in the card UI/payload.
- README says filter bars serve statements/purchases/reports — `FilterBar` is only in Reports, `PeriodFilterBar` only in Statements; Purchases has no filter UI.
- README "income used to calculate balance" — not done in the frontend.
- README `npm test` — no tests exist; command runs Vitest in watch mode and finds nothing.
