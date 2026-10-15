# Design system — Financial App (redesign)

## Product context
Personal-finance web app (pt-BR, BRL) used by one person to manage credit and debit cards, purchases and installments, monthly card statements (faturas), subscriptions, fixed expenses, income sources and per-person financial groupings ("Responsáveis"). Primary jobs: see the month at a glance, register purchases fast, close and pay statements, and export monthly reports per person. Desktop-first, fully responsive.

Pages: Dashboard (Resumo), Relatórios, Cartões, Despesas fixas, Fontes de renda, Responsáveis, Compras, Faturas, Assinaturas, plus Login/Cadastro. Most pages are a header with a primary action, an optional filter bar, and a data table with row actions; forms open in dialogs.

## Visual direction
Neutral SaaS product UI in the spirit of Linear, Stripe Dashboard and Vercel: calm neutral surfaces, one accent color, crisp 1px borders instead of heavy shadows, strong typographic hierarchy, generous but efficient spacing, information-dense tables. No gradients on backgrounds, no glassmorphism, no illustrations, no decorative blobs.

## Color (light theme is the default; dark theme mirrors it)
Neutrals (zinc):
- background `#FAFAFA` (app canvas), surface `#FFFFFF` (cards, tables, dialogs), subtle surface `#F4F4F5` (table header, hover, filter bars)
- border `#E4E4E7`, strong border `#D4D4D8`
- text primary `#18181B`, text secondary `#52525B`, text muted `#71717A`, disabled `#A1A1AA`

Accent (single brand color — indigo):
- primary `#4F46E5`, primary hover `#4338CA`, primary subtle bg `#EEF2FF`, primary subtle text `#4338CA`

Semantic (only for state, never decoration):
- success `#059669` (subtle bg `#ECFDF5`) — paid, active, income
- warning `#D97706` (subtle bg `#FFFBEB`) — open/pending
- danger `#DC2626` (subtle bg `#FEF2F2`) — delete, overdue, expenses when emphasized
- info `#0284C7` (subtle bg `#F0F9FF`)

Dark theme: background `#09090B`, surface `#18181B`, subtle `#27272A`, border `#27272A`, strong border `#3F3F46`, text `#FAFAFA` / `#A1A1AA` / `#71717A`, primary `#818CF8` (hover `#A5B4FC`, subtle bg `rgba(129,140,248,.12)`), semantic colors one step lighter.

## Typography
- Font: **Inter** (fallback system-ui). Numbers use `font-variant-numeric: tabular-nums`.
- Page title 24/32 semibold (600), letter-spacing -0.01em; section/card title 15/22 semibold; body 14/20 regular; small/table 13/20; caption/label 12/16 medium, muted, uppercase not used.
- KPI values 28/36 semibold tabular; currency always formatted `R$ 1.234,56`.

## Spacing, radius, elevation
- 4px grid; page padding 32px desktop / 16px mobile; gap between sections 24px; card padding 20px.
- Radius: 8px controls (buttons, inputs, chips use full pill only for status badges), 12px cards/dialogs/tables.
- Elevation: cards and tables are flat with 1px border; only menus/dialogs get a soft shadow `0 8px 24px rgba(0,0,0,.08)`.

## Components
- **Sidebar** (240px, collapsible to 64px icon rail): surface background, right border; logo at top; nav items 36px tall, 8px radius, icon + label, muted text; active item = primary subtle bg + primary text; optional section labels ("Visão geral", "Lançamentos", "Configurações"); user/account block at the bottom.
- **Top bar** (56px): surface, bottom border; page title or breadcrumb on the left; on the right: search/command field (⌘K style), theme toggle, avatar menu.
- **Buttons**: primary = solid indigo, white text; secondary = white with border; ghost = text only; danger = red text or solid red in confirmations. Height 36px, 8px radius, medium weight, icon 16px.
- **Inputs/selects**: 36px, 1px border, 8px radius, focus ring 3px primary subtle.
- **KPI card**: label (12px muted) + icon in a 32px subtle square, value (28px semibold), optional delta/badge line.
- **Tables**: inside a card; header row subtle bg, 12px medium muted labels; rows 44px with bottom border; numbers right-aligned tabular; row actions as ghost icon buttons revealed on hover; empty state centered with icon + one line + action.
- **Status badges**: pill, subtle bg + semantic text (Aberta = warning, Fechada = neutral, Paga = success, Ativa = success, Inativa = neutral, Crédito = primary subtle, Débito = neutral).
- **Dialogs**: 12px radius, title 16px semibold, footer with right-aligned actions (secondary + primary).
- **Toasts**: solid surface with left semantic accent bar, top-right.
- Icons: Material Design Icons (outline variants), 16–20px, muted color unless active.

## Logo
A new, simple identity is welcome: a geometric mark (e.g. rounded square in the primary color with a minimal abstract symbol such as ascending bars or a stylized card) followed by the wordmark "Financial App" in Inter semibold. No gradients, glow or drop shadow.

## Motion
Subtle and fast: 150ms ease-out for hover/focus, 200ms for dialogs and drawer collapse. No bouncy or decorative animation.

## Constraints
- All copy stays in Brazilian Portuguese; amounts in BRL.
- Vuetify 3 is the component library in code: the design must be implementable with Vuetify components + theme tokens + light custom CSS.
- Accessibility: AA contrast, visible focus rings, icon-only buttons with labels.
