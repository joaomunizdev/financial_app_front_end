# CLAUDE.md

Guidance for Claude Code when working in this repository. The source code is the source of truth.

## 1. Project Overview

Personal-finance SPA (credit cards, purchases/installments, statements, subscriptions, fixed expenses, income sources, tenants, expense categories, reports). It is a thin client over the **Financial App Backend** (NestJS, separate repo `joaomunizdev/financial_app_back_end`, usually checked out at `../financial_app_back_end`; Swagger at `http://localhost:3000/api/docs`). All financial calculations (statement composition/totals, installment impact, report aggregation, PDF generation) live in the backend; the frontend renders, filters, validates, formats and posts data.

Stack: Vue 3.5 (`<script setup lang="ts">`), TypeScript 5 (`strict`), Vite 5, Vuetify 3.9 (components auto-imported by `vite-plugin-vuetify`), Pinia 2, Vue Router 4, Axios 1, VeeValidate 4 + Yup 1, `@mdi/font`, Vitest 1 + `@vue/test-utils` + happy-dom, `vue-tsc`.

Language: identifiers, file names and API fields are English; **all user-facing text is pt-BR**. Money is BRL; dates displayed as pt-BR. The "tenant" entity is labeled **"Responsável"** in the UI. Backend error messages are English and are appended to pt-BR toasts as-is.

## 2. Architecture

```
src/
  main.ts                 # app bootstrap + app.config.errorHandler (ignores AxiosErrors, already reported)
  App.vue                 # renders <AppShell/>
  components/
    AppShell.vue          # auth layout vs. app layout: grouped, collapsible sidebar (240px / 64px rail, state in localStorage "financial-app-sidebar-rail"), top bar (breadcrumb, Ctrl+K page jump, ThemeSwitcher), account menu, global toast + <ConfirmDialog/>
    AppLogo.vue           # logo mark (indigo rounded square) + "Financial App" wordmark; `compact` = mark only
    PageHeader.vue        # page title + description + actions slot — every page starts with it
    BarList.vue           # ranked horizontal bars (single accent color, value + share labels)
    MonthlySpendingChart.vue # SVG column chart, last month emphasized, hover tooltip
    InvestmentsOverview.vue # dashboard "Investimentos": total + month contributions + 6-month sparkline + distribution bar/legend by type
    EmptyState.vue        # illustrated empty/error state (image, title, one line, single action)
    CategoryLabel.vue     # category icon + name ("Sem categoria" when missing)
    CategorySelect.vue    # clearable v-autocomplete of categories with icons (forms and filters)
    CodeVerification.vue  # 6-digit e-mail code step (v-otp-input, inline error, 60 s resend cooldown); used by VerifyEmailPage and the login 2FA step
    ConfirmDialog.vue     # global confirmation dialog driven by stores/confirm
    FilterBar.vue         # year + month (ReportsPage)
    PeriodFilterBar.vue   # card + year + month + find/generate/clear (StatementsPage)
    PurchaseForm.vue      # VeeValidate purchase form (PurchasesPage)
    SummaryStrip.vue      # headline numbers in one bordered strip (Dashboard, Reports); items typed as SummaryItem (utils/dashboard.ts), optional positive/negative tone
    ThemeSwitcher.vue
  composables/
    useCurrency.ts        # BRL parse/format/mask + toApiMoney (payload format)
    useFormErrors.ts      # Yup schema -> reactive per-field errors for :error-messages
    usePagedList.ts       # server-side paging for <v-data-table-server> (+ useDebounced for search fields)
  pages/*Page.vue         # one page per route; pages own their data fetching
  plugins/http.ts         # THE Axios instance (auth header, toasts, 401 handling)
  plugins/vuetify.ts      # themes, pt locale, component defaults (no global component registration)
  styles/app.css          # global look: Inter, page/section title classes, 12px cards, table header, buttons
  router/index.ts         # routes, RouteMeta typing, auth guard, catch-all
  schemas/                # purchaseSchema.ts (+ PurchaseFormValues), money.ts (moneyField)
  stores/                 # auth.ts, toast.ts (queue), confirm.ts (promise-based), connection.ts (offline flag)
  types/domain.ts         # API entity types (CreditCard, Purchase, Statement, ...)
  utils/                  # imports.ts (reason labels, supported formats, pt-BR import errors), investments.ts (types with fixed validated colors, movement kinds), cardBrands.ts (real card brands), payment.ts (payment methods), categories.ts (icon list, categoryMap), date.ts, jwt.ts, api-error.ts (+ authErrorMessage pt-BR map), dashboard.ts, br.ts (CPF/phone validation + masks), email.ts (blocked test domains, mirror of the backend list)
  test/                   # setup.ts (happy-dom shims), helpers.ts (fakeJwt)
```

Data flow: `Page (<script setup>, local refs) → http (plugins/http.ts) → backend`. After every mutation the page re-fetches its list. There are no domain Pinia stores; only `auth`, `toast` and `confirm` exist. Don't add domain stores unless the user asks.

## 3. Development Commands

```bash
npm install                 # or npm ci
cp .env.example .env        # VITE_API_URL=http://localhost:3000/api
npm run dev                 # Vite dev server on :5173
npm run typecheck           # vue-tsc --noEmit
npm run test:run            # vitest run (single run); `npm test` = watch mode
npx vitest run <path>       # run specific spec files
npm run build               # vite build -> dist/ (does NOT type-check; run typecheck too)
npm run preview             # vite preview on :5173
docker compose up -d --build                         # nginx image on http://localhost:5173
VITE_API_URL=https://api.example.com/api docker compose up -d --build   # API URL is a BUILD arg
```

CI (`.github/workflows/ci.yml`): `npm ci → typecheck → test:run → build` on pushes to `main` and PRs.

## 4. Coding Conventions

### Components and pages
- `<script setup lang="ts">`, Composition API only. Template, script, then `<style scoped>`.
- Pages: `src/pages/<Domain>Page.vue`; routes lazy-loaded. Props/emits declared type-only (`defineProps<{...}>()`, `defineEmits<{ (e: "x", v: T): void }>()`).
- `<script setup>` must not export types; put shared form types next to their schema (e.g. `PurchaseFormValues` in `schemas/purchaseSchema.ts`).
- Every page starts with `<PageHeader title description>` (actions in its default slot). CRUD page template: PageHeader + "Novo…" button calling `openNew()`, `<v-card><v-data-table-server>` bound to `usePagedList` (`:items :items-length="total" :loading :page :items-per-page :sort-by @update:options="onOptions"`, `class="pa-2"`), actions column (`mdi-pencil` / `mdi-delete color="error"`, both with `aria-label`), `<v-dialog v-model="open">` with the form. Page wrapper: `d-flex flex-column ga-6`.
- Dialog reset: `openNew()` resets the form explicitly; `watch(open, v => !v && reset)` + `:key="dialogKey"` on the dialog.
- Multi-field dialogs are one `reactive({ open, loading/saving, ... })` object (`generateDlg`, `detailDlg`, `payDlg`, `exportDlg`).
- Filter bars use "local ref + two-way watch": props `modelValue*`, emits `update:*` + action events. Invalid years are not emitted (`isValidYear`, API range 2000–2100).
- Spacing: Vuetify `ga-*`/`ma-*`/`pa-*` utilities (`gap-*` is not a Vuetify class). No empty `<v-row>` spacers.
- Headings: `.page-title` (24px/600) via PageHeader, `.section-title` (15px/600) for card/section titles; numbers use `.tabular-nums`.
- Filter bars: `<v-sheet class="pa-3 ..." color="surface" border>` (no elevation, no `rounded-xl`).

### TypeScript
- No `any`. Use `types/domain.ts` for API entities and type HTTP calls (`http.get<CreditCard[]>(...)`). Local view-model types extend them (e.g. `FixedExpense & { tenantName: string }`).
- Form state types live in the page (`type FormT = {...}`) with an `emptyForm()` factory.

### Money and dates (critical)
- **API money is a string with ≤ 2 decimals** (backend `IsMoney`, e.g. `"1500.00"`; adjustments may be negative). Always build payloads with `toApiMoney(value)` from `useCurrency`. Never send numbers or raw user text.
- Money inputs: mask with `formatCurrencyOnType` (non-negative) or `sanitizeCurrencyInput` + `toDecimalBRL` (signed, e.g. statement adjustment); validate with `moneyField({ allowNegative?, positive?, requiredMessage? })` from `schemas/money.ts`.
- Display money with `useCurrency().toCurrencyBRL`. Keep numeric values numeric in table rows so columns sort correctly; format in item slots.
- Dates: API uses `"YYYY-MM-DD"`. Default "today" is `todayLocalISO()` (never `toISOString().slice(0,10)` — UTC shifts the day in Brazil after 21:00). Bind `<input type="date">` via `toDateInput()`. Display with `formatDateBR()` (UTC on purpose). Periods: `formatPeriod(year, month)`, months list `MONTHS` (1-based).

### Validation
- Default pattern: inline Yup schema + `useFormErrors(schema, ["field", ...] as const)` → `errors`, `validateAll(form)`, `validateField(field, form)`, `clearErrors()`; bind `:error-messages="errors.field"`. Messages in pt-BR. Mirror backend DTO limits (lengths, sign-up password ≥ 8 chars, email format).
- `PurchaseForm` uses VeeValidate `useForm` + `purchaseSchema` (date kept as a string, never cast to `Date`).

## 5. State Management (Pinia)

- `auth`: `token` (localStorage key `"token"`, dropped when expired), `isAuthenticated`, `register`, `login`, `logout({ silent? })`, `clearSession()`, `syncSession()` (re-reads storage, drops expired tokens; called by the router guard on every navigation). Login/logout wait 900 ms so their toast is visible before the full-page reload — this is the only intentional delay.
- `toast`: `show({ message, color?: "success" | "error", timeout? })`; messages are queued, never overwritten. Rendered by AppShell.
- `confirm`: `await useConfirmStore().ask({ title, message, confirmText? })` → `boolean`. **Every destructive action must go through it.**
- Loading flags are page-local and reset in `finally`.

## 6. API Integration

Single client: **`src/plugins/http.ts`** (default export). Never create another Axios instance.

- `baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000/api"`; relative paths only.
- Adds `Authorization: Bearer <token>`.
- **Automatic toasts** (no artificial delay): POST/PUT/PATCH/DELETE on paths in `ENTITY_MATCHERS` (statements incl. `/:id/pay` → "pagamento de Fatura", subscriptions, purchases, credit cards, fixed expenses, income sources, tenants, register) show success/error toasts; failed **GETs** show "Não foi possível carregar os dados." Error toasts append the backend detail via `utils/api-error.ts` (4xx `message`; 5xx → "Erro interno do servidor."; no response → connection message).
  - Don't add manual toasts for these requests. For a new entity, add a matcher (pt-BR name).
  - Pass `{ skipToast: true }` when the caller reports the outcome itself (batch operations, 404-is-normal lookups) — see `StatementsPage.generate/fetchStatements`, `ReportsPage.exportPdfReport`.
- **401**: clears the session once and `location.assign("/login")`; no toast.
- Errors are re-thrown. Pages use `try/finally` (no empty `catch`); `app.config.errorHandler` in `main.ts` swallows AxiosErrors because the interceptor already reported them. Add a `catch` only for specific UX (e.g. keeping a batch going).

### Endpoint notes (verified against the backend)
| Domain | Notes |
|---|---|
| Auth | `POST /auth/register` `{name,email,password,cpf,phone,birthDate}` (digits only; 409 e-mail/CPF in use) → no token, code e-mailed; `POST /auth/verify-email {email,code}` → `{ accessToken }`; `POST /auth/login` → `{ accessToken }` \| `{ twoFactorRequired, challengeToken }` \| `{ emailVerificationRequired, email }`; `POST /auth/login/verify {challengeToken,code}`; resend: `/auth/resend-verification`, `/auth/login/resend` (JWT `exp` = 1 day) |
| Users | `GET /users/me` (`UserProfile`), `PATCH /users/me` (name, cpf, phone, birthDate), `POST /users/me/password`, `PATCH /users/me/two-factor {enabled,password}`; wrong current password = 400 |
| Credit cards | CRUD `/credit-cards`; `brand` must be one of the real brands (`CARD_BRANDS`, 400 otherwise); `cardType: "credit" \| "debit"` (debit: `limitAmount` null, no installment purchases → 400). **PATCH credit→debit converts the card's installment purchases into monthly one-time purchases** (same description, statement items relabeled "Compra à vista", statement totals unchanged; irreversible). Delete → 409 if the card has purchases or statements (deactivate with `PATCH {active:false}`) |
| Categories | `GET /categories` → defaults + own `{id,name,icon,isDefault}`; POST/PATCH/DELETE own only (defaults → 403); name 1–60, unique per account ignoring case incl. defaults (409); `icon` = MDI class (`^mdi-[a-z0-9-]+$`); delete leaves records uncategorized |
| Tenants | CRUD `/tenants`; delete → 403 "Tenant has purchases" when it has purchases |
| Purchases | CRUD `/purchases`; `paymentMethod: "card" \| "pix" \| "cash"` (default card): Pix/cash have `creditCardId: null`, are never installments and never enter statements — reports and the PDF add them by purchase date; list filter `paymentMethod`; optional `categoryId` (nullable); **an update that only changes `categoryId` is accepted even for purchases in locked/paid statements** (other changes → 409); list filters `creditCardId`, `tenantId` (also `dateStart`, `dateEnd`, `isInstallment`, unused); `installmentsTotal/Paid` validated only when `isInstallment` |
| Statements | `GET /statements` → list; **with `creditCardId`+`year`+`month` → single object or 404**; `POST` generates (`{creditCardId, year, month}`); `GET /:id` includes `items` (each with `categoryId`, kept in sync with the purchase/subscription); `PATCH /:id` (`closingDate`, `dueDate` nullable, `locked`, signed `adjustmentAmount`); `POST /:id/pay` (`amount`, `paidAt`) — **only for locked statements** (400 otherwise). Inactive cards' statements are hidden |
| Subscriptions / Fixed expenses / Income sources | CRUD; subscriptions take an optional `categoryId`; `description` ≤ 180; `tenantId` nullable in entities (SET NULL on tenant delete); income `incomeType: "fixed" \| "one_time"` + `startDate`/`endDate` (nullable; one-time `startDate` = receipt day, defaulted to today by the backend; fixed = validity window, end ≥ start) |
| Investments | CRUD `/investments` (`name` ≤ 120, `type` ∈ 7 types, `institution` nullable; list paged with `search`/`type`, rows carry computed `currentValue`, `investedTotal`, `lastMovementDate`); movements `GET/POST /investments/:id/movements` (`kind` contribution\|withdrawal\|balance, `amount`, `date`; withdrawal above the value on that date → 400), `DELETE /investments/:id/movements/:movementId` |
| Imports | `POST /imports/preview` (FormData `file`, `kind`, `creditCardId?`; 422 with English messages mapped by `importErrorMessage`) → `ImportPreview` (lines with `key`, `suggestedAction`, `reason`, `categoryId`, `duplicateOf`; nothing saved); `POST /imports/confirm` `{kind, creditCardId?, lines:[{key, action, date, description, amount, installment, tenantId, categoryId, paymentMethod?}]}` → `{purchases, incomes, skipped}` |
| Reports | `GET /reports/by-category?year&month&tenantId?`; `GET /reports/by-tenant` rows: `purchasesTotal`, `subscriptionsTotal`, `reportExpensesTotal`, `fixedExpensesTotal`, `incomeSourcesTotal`, `accumulatedAmount` (= income − fixed − purchases − subscriptions); `GET /reports/investments?year&month` → `InvestmentsSummary` (dashboard); `GET /reports/by-category?year&month` → `CategoryTotal[]` (statement items + Pix/cash purchases of the month per category, largest first, `categoryId: null` = uncategorized; used by the dashboard); `GET /reports/by-tenant?year&month` (also returns purchases/subscriptions/fixed/income/accumulated totals per tenant); `GET /reports/installments-total` (not used by the UI); `GET /reports/tenants/:id/monthly-pdf` (blob) |

**Paging**: list screens page on the server. `usePagedList(url, () => filters)` sends `page`, `pageSize`, `sortBy` (the header `key`, which must be in the endpoint's sort whitelist), `sortDir` and the non-empty filters; the endpoint answers `Page<T>` (`{ items, total, page, pageSize }`). Changing a filter goes back to page 1; an emptied last page steps back; only the latest response is applied. Search fields go through `useDebounced` (300 ms). Without `page` the same endpoints return full arrays — use that for selects/lookups (cards, tenants, categories) and aggregations; for counts request `page=1&pageSize=1` and read `total`. Filters, search and sort must be server-side (a client filter would only see the current page). Reports by tenant and statement items stay client-side (small, already aggregated/loaded).

Backend `ValidationPipe` uses `forbidNonWhitelisted`: send only DTO fields — build payloads explicitly, never spread entities.

## 7. Routing and Authentication

- `RouteMeta` is typed (`auth?`, `layout?: "auth"`). Protected routes: `meta: { auth: true }`; `/login`, `/register`: `meta: { layout: "auth" }`. Unknown paths render `NotFoundPage` (protected, so unauthenticated users go to `/login`).
- Guard: `auth.syncSession()`, then `auth && !isAuthenticated → /login`; auth-layout routes while authenticated → `/dashboard`.
- Login/register/logout navigate with `location.assign` (full reload). Keep it unless deliberately reworking the auth flow.
- Auth flows (store `auth.ts`): `register` (no session, toast "código enviado") → `/verify-email?email=` → `verifyEmail` starts the session. `login` returns `LoginResult`: `authenticated`, `two_factor` (LoginPage switches to the code step with the `challengeToken`), or `verify_email` (redirect to `/verify-email`). Code/verify/resend calls use `skipToast` and show `authErrorMessage(...)` inline.
- `/profile` (account menu → "Meu perfil", breadcrumb "Conta"): personal data, password change and the optional login second factor (toggling asks for the password). E-mail is read-only; **the CPF is permanent** (read-only once set; older accounts may fill it in once).
- Sign-up refuses fictitious/test e-mail domains (`utils/email.ts`, same list as the backend).
- Adding a page = route (with `meta`) + AppShell nav item + AppShell title map + page.

## 8. Business Domains (frontend behavior)

- **Dashboard**: period select (last 12 months) driving a summary strip (cards, tenants, combined credit limit, "Gastos no mês" = the month's statement totals + Pix/cash purchases dated in the month, + % vs. previous month), "Onde você mais gastou" (BarList of `GET /reports/by-category` for the period: top 6 categories + one "Outros" row with the rest, the "Outros" category and uncategorized items — `topCategories`) and "Gastos por mês" (6 months), card tiles and tenant chips. The other spending figures are **statement totals** (`GET /statements`) plus Pix/cash purchases of the 6-month range (`GET /purchases?paymentMethod=pix|cash&dateStart&dateEnd`, `monthsRange`), aggregated in `utils/dashboard.ts` (`monthlyTotals`); card spending only shows for months with generated statements. Below the charts, `InvestmentsOverview` (from `GET /reports/investments` for the period) shows the value at the month's end, contributions/withdrawals of the month, a 6-month sparkline and the distribution by type (stacked bar + legend with share and value; each type keeps its color from `utils/investments.ts`, palette validated with the dataviz script in light and dark).
- **Credit cards**: nickname ≤ 80, brand picked from `CARD_BRANDS` (`utils/cardBrands.ts`, mirror of the backend list of real brands; the API rejects others), `last4` exactly 4 digits, type Crédito/Débito; limit money ≥ 0 required for credit, hidden and sent as `null` for debit. Editing credit → debit asks for confirmation (conversion of installment purchases) before the PATCH.
- **Tenants**: name ≤ 120, client-side search.
- **Categories**: two sections sharing one search — "Suas categorias" (edit/delete with confirm; `empty-categories` invitation when the user has none) and "Categorias padrão" (read-only, no actions). Name ≤ 60, duplicate check against the loaded list, icon picked from `CATEGORY_ICONS`. Purchases, subscriptions and statement items show the category (`CategoryLabel`, resolved with `categoryMap` from `GET /categories`); Purchases and Subscriptions filter by category (server-side). New subscriptions default to "Assinaturas".
- **Purchases**: filters by card/tenant/category/payment method (server-side params); `PurchaseForm` starts with "Forma de pagamento" (Cartão/Pix/Dinheiro, `utils/payment.ts`): the card select and the "Parcelada?" switch only exist for card purchases, and the payload sends `creditCardId: null` + one-time fields for Pix/cash; the list's "Pagamento" column shows the card or a Pix/Dinheiro chip. Rules: card (card purchases only), tenant, description ≤ 255, amount > 0, date `YYYY-MM-DD`; installments: total integer ≥ 2, paid 0..total; the "Parcelada?" switch is hidden and forced off for debit cards. Payload sends `installmentsTotal: null, installmentsPaid: 0` for one-time purchases.
- **Statements**: list by period (+ optional card), applied on "Buscar fatura" (the bar's fields alone don't reload); after a batch generation the list shows the generated year and first month (and the card when only one was chosen); "Limpar" resets to current month/all cards; batch generation runs sequentially, continues on failure and reports a summary; detail dialog edits dates, signed adjustment and lock, then re-reads the statement; pay dialog requires amount > 0 and a date (defaults: total, local today) and locks an open statement first (`skipToast`, so only the payment toast shows); the lock toggle shows its own "fechada/reaberta" toasts.
- **Subscriptions**: server-side filters (search, card, status, category); validated form with money mask.
- **Import** (`/imports`, nav "Importar"): choose "Extrato da conta"/"Fatura do cartão" (+ credit card for invoices), upload PDF/OFX/CSV, review every line (action Compra/Renda/Ignorar, editable description, category, tenant; default tenant and Pix/Dinheiro for statement purchases; filter Todas/A importar/Ignoradas), confirm (via `confirm` store). Both calls use `skipToast`; read errors show inline, the result as a toast + success alert. The preview table is client-side (transient, not a server list). Invoice total read vs. printed total is shown when the bank prints one.
- **Investments** (`/investments`, nav "Lançamentos"): paged list (search, type filter) with type dot, total invested and current value; dialog per investment for movements (Aporte / Resgate / Atualizar saldo — balance = value reported on a date, may be 0; others > 0; date ≤ today), list reloads after each change. Empty state uses `empty-investiments`.
- **Fixed expenses / Income sources**: tenant select, description ≤ 180, masked amount; income type default `fixed`. Income dates: one-time → "Data de recebimento" (`startDate`, required, defaults to today); fixed → optional "Início"/"Fim" (`startDate`/`endDate`, end ≥ start, empty = open-ended; `endDate` is sent as `null` for one-time). The list's "Data" column shows the receipt day or the validity window ("Sempre" when open).
- **Reports**: period from `FilterBar` (data shown for the applied period) plus a tenant select in its slot (applies at once; "Limpar" resets it): the strip, table and expense chart use that tenant's row (the chart becomes "Composição das despesas"), categories are refetched with `tenantId` (latest request wins), and "Exportar PDFs" preselects it. `SummaryStrip` (total expenses = purchases + subscriptions + fixed, income, signed balance, tenants with movement), "Despesas por responsável" and "Gastos por categoria" (`BarList`, `topCategories` of `GET /reports/by-category`), and the per-tenant table (purchases, subscriptions, fixed, total, income, balance in green/red; numeric columns, totals row; tenants with no movement hidden) with a PDF download per row for the month on screen. "Exportar PDFs" = tenants × months (months from one `GET /statements`, the month on screen preselected), sequential downloads, failures summarized.

Backend-owned rules: statement composition/totals, installment scheduling, report aggregation, PDF content, ownership checks, cascades.

## 9. UI and Forms

- Visual direction: neutral SaaS (zinc neutrals, single indigo accent `#4F46E5` / dark `#818CF8`, Inter, 1px borders instead of shadows, 12px card radius, semantic colors only for states). Themes `lightMinimal`/`darkMinimal` in `plugins/vuetify.ts` (extra token `surface-light` for subtle backgrounds); use theme tokens (`rgb(var(--v-theme-…))`), not hex.
- Vuetify defaults: fields `outlined` + `compact`; buttons `flat` primary, `rounded="lg"`, sentence case; cards `flat` + `border`; buttons inside `v-data-table` default to neutral color (row actions are quiet; delete keeps `color="error"`). Secondary actions use `variant="outlined" color="default"`.
- Vuetify locale is `pt` (table pagination, etc.).
- Charts follow the dataviz rules: bars/columns over pie/donut, single axis, accent color only for the emphasized value, categorical palettes validated for CVD, direct labels + hover tooltips.
- Responsiveness: drawer rails on `mdAndDown`; use `v-row/v-col` and `flex-wrap` sheets.
- Empty states: `v-alert type="info" variant="tonal"` or the table `#no-data` slot.
- Icon-only buttons need `aria-label`.
- Empty states: every list uses `<EmptyState>` in the table `#no-data` slot with an illustration from `src/assets/empty/` (400px-tall transparent WebP) and the page's create action. When filters/search caused the empty result, show `empty-search` + "Limpar filtros" instead of the create invitation. Unknown routes render `NotFoundPage`; when a request gets no response the http interceptor sets `connection.offline` and AppShell replaces the page with the offline state ("Tentar de novo" reloads) instead of a toast.
- Dashboard shows a "Primeiros passos" checklist (`onboardingSteps` in `utils/dashboard.ts`: responsável → cartão → compra → fatura) until all steps are done or it is dismissed (localStorage `financial-app-onboarding-dismissed`).
- Login/Register use `AuthSplitLayout`: brand illustration + message on the left (hidden below 860px), form on the right. Illustrations live in `src/assets/auth/` as ~1070px-wide WebP (quality 90) (login and register each draw one of two per visit).

## 10. Testing and Quality

- Specs are colocated as `*.spec.ts` under `src/` (`vite.config.ts` → `test`: happy-dom, `setupFiles: src/test/setup.ts`, Vuetify inlined).
- Patterns in place:
  - Pure logic: `useCurrency`, `utils/*`, `schemas/*`.
  - Stores: `setActivePinia(createPinia())` per test; fake timers for the toast queue.
  - HTTP interceptors: replace `http.defaults.adapter` with a canned response (`plugins/http.spec.ts`); `vi.stubGlobal("location", ...)` for redirects.
  - Components/pages: `mount(..., { global: { plugins: [pinia, createVuetify()] } })`; mock `../plugins/http` with `vi.mock` + `vi.hoisted`; access `<script setup>` bindings via `wrapper.vm`; vee-validate needs several `flushPromises()` + small timeouts before asserting messages.
- Checklist for every change:
  1. `npm run typecheck`
  2. `npm run test:run` (add/adjust specs for changed logic)
  3. `npm run build`
  4. Exercise loading, error (backend down / 4xx) and empty states of affected pages.
  5. When the backend is available, verify payloads against its DTOs (`../financial_app_back_end/src/presentation/dtos`) or Swagger.
  6. Check dependents: cards/tenants feed Purchases, Statements, Subscriptions, Fixed expenses, Income sources, Reports, Dashboard; `plugins/http.ts` affects every request.
  Only report a check as done if it was actually run.

## 11. Development Guidelines

- Read the target page and its siblings first; copy the closest existing pattern.
- Stay in scope; mention (don't do) unrelated refactors.
- Reuse `http`, `useCurrency`, `useFormErrors`, `moneyField`, `utils/date`, `useConfirmStore`, `SummaryStrip`, `BarList`, filter bars. No new dependencies when existing tools suffice.
- Respect API contracts (string money, explicit payloads, `forbidNonWhitelisted`).
- Async actions: loading flag + `finally`; re-fetch after mutations.
- Bug fixes: fix minimally, add a spec reproducing the bug when practical, check sibling pages for the same pattern.
- Ask before destructive or wide changes (deleting files, auth storage, Docker/CI/build config).

## 12. Important Constraints

- One HTTP client; keep `useAuthStore()`/`useToastStore()` calls inside functions in `plugins/http.ts` (circular import `http ⇄ auth` is safe only that way).
- Sensitive data: never log API responses or tokens; don't persist financial data in localStorage. JWT in localStorage is a known XSS trade-off (no CSP yet — Vuetify inline styles make a strict CSP non-trivial).
- `VITE_*` variables are build-time: Docker takes `VITE_API_URL` as a build arg; `.dockerignore` keeps `.env` out of the image. Production image is nginx (`nginx.conf`: SPA fallback, asset caching, security headers).
- Backend CORS allows `FRONTEND_ORIGIN` (default `http://localhost:5173`) — keep the dev/Docker port 5173 or update the backend.
