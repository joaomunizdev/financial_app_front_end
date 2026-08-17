# Financial App Frontend

Responsive web application for personal financial management, including credit cards, purchases, installments, statements, recurring subscriptions, fixed expenses, income sources, and financial reports.

## Overview

Financial App Frontend is the web interface for the Financial App platform.

The application provides a centralized dashboard where users can manage their credit cards and financial information while monitoring expenses, income, recurring payments, installments, and monthly results.

It communicates with the Financial App Backend through a REST API and uses JWT authentication to protect private financial data.

## Main Features

- User registration and login
- JWT-based authenticated sessions
- Protected application routes
- Financial dashboard
- Credit card management
- Purchase management
- Installment purchase support
- Monthly statement management
- Credit card statement payment workflows
- Subscription management
- Fixed expense management
- Income source management
- Tenant management
- Financial reports
- Monthly and period-based filtering
- Future installment visualization
- Currency formatting
- Reusable financial UI components
- Centralized API error handling
- Global success and error notifications
- Responsive Vuetify interface
- Theme switching
- Docker-based production preview

## Tech Stack

| Category | Technology |
| --- | --- |
| Framework | Vue.js 3 |
| Language | TypeScript |
| Build Tool | Vite |
| UI Framework | Vuetify 3 |
| State Management | Pinia |
| Routing | Vue Router |
| HTTP Client | Axios |
| Forms | VeeValidate |
| Validation | Yup |
| Icons | Material Design Icons |
| Styling | Sass |
| Testing | Vitest |
| Containers | Docker / Docker Compose |

## Architecture

The application is organized around pages, reusable components, Pinia stores, API configuration, and validation schemas.

```text
src/
├── api/
│   └── http.ts
│
├── assets/
│   ├── logo.png
│   └── white-logo.png
│
├── components/
│   ├── AppShell.vue
│   ├── FilterBar.vue
│   ├── PeriodFilterBar.vue
│   ├── PurchaseForm.vue
│   ├── StatCard.vue
│   └── ThemeSwitcher.vue
│
├── composables/
│   └── useCurrency.ts
│
├── pages/
│   ├── CreditCardsPage.vue
│   ├── DashboardPage.vue
│   ├── FixedExpensesPage.vue
│   ├── IncomeSourcesPage.vue
│   ├── LoginPage.vue
│   ├── PurchasesPage.vue
│   ├── RegisterPage.vue
│   ├── ReportsPage.vue
│   ├── StatementsPage.vue
│   ├── SubscriptionsPage.vue
│   └── TenantsPage.vue
│
├── plugins/
│   ├── http.ts
│   └── vuetify.ts
│
├── router/
│   └── index.ts
│
├── schemas/
│   └── purchaseSchema.ts
│
├── stores/
│   ├── auth.ts
│   ├── credit-cards.ts
│   ├── purchases.ts
│   ├── reports.ts
│   ├── tenants.ts
│   └── toast.ts
│
├── App.vue
└── main.ts
```

The typical frontend flow is:

```text
Vue Page / Component
       ↓
Pinia Store
       ↓
Axios HTTP Client
       ↓
Financial App Backend
       ↓
PostgreSQL
```

## Application Pages

The application contains dedicated pages for each major financial domain.

```text
/dashboard
/reports
/credit-cards
/fixed-expenses
/income-sources
/tenants
/purchases
/statements
/subscriptions
```

Authentication pages:

```text
/login
/register
```

## Authentication

Authentication state is managed with Pinia.

The login flow is:

```text
Email + Password
      ↓
POST /auth/login
      ↓
Backend JWT
      ↓
Pinia Auth Store
      ↓
localStorage
      ↓
Protected Routes
```

The token is automatically included in authenticated API requests:

```http
Authorization: Bearer <token>
```

## Protected Routes

Vue Router uses route metadata to identify protected pages.

Example:

```text
/dashboard     → authenticated
/reports       → authenticated
/credit-cards  → authenticated
/purchases     → authenticated
/statements    → authenticated
```

Unauthenticated users trying to access protected pages are redirected to:

```text
/login
```

Authenticated users trying to access `/login` or `/register` are redirected to:

```text
/dashboard
```

## Automatic Session Handling

The centralized Axios client automatically attaches the JWT to outgoing requests.

When the backend returns:

```http
401 Unauthorized
```

the application:

1. Clears the local authentication state.
2. Removes the stored token.
3. Redirects the user to the login page.

## Centralized Notifications

The application contains a global toast system used for feedback after create, update, and delete operations.

Supported entities include:

```text
Purchases
Credit Cards
Fixed Expenses
Income Sources
Tenants
Users
```

Errors are also automatically displayed when API operations fail.

## Financial Dashboard

The dashboard provides a summarized view of the user's financial situation.

It combines information from multiple areas of the platform, such as:

```text
Credit card purchases
Recurring subscriptions
Fixed expenses
Income sources
Financial balance
```

Reusable statistic cards are implemented through:

```text
StatCard.vue
```

## Credit Cards

The credit card page allows users to manage registered cards.

Cards contain information such as:

```text
Nickname
Brand
Last four digits
Credit limit
Active status
```

Cards are later used when registering purchases, subscriptions, and generating statements.

## Purchases

The purchases interface supports financial transactions associated with:

```text
Credit Card
Tenant
Description
Purchase Date
Amount
Installment Information
```

Purchases can be:

```text
One-time purchase
```

or:

```text
Installment purchase
```

A reusable component is used for purchase registration:

```text
PurchaseForm.vue
```

## Installments

The frontend allows users to visualize and manage installment-based purchases.

The backend stores the original purchase and calculates the monthly installment impact when generating credit card statements.

The interface can therefore present both:

```text
Original purchase amount
```

and:

```text
Current monthly installment impact
```

## Statements

The statements page is responsible for interacting with monthly credit card invoices.

The API supports:

```text
Statement generation
Statement listing
Statement details
Statement updates
Statement payments
```

Statements combine purchases and their corresponding installments for a specific month.

## Subscriptions

The subscriptions page manages recurring credit card expenses such as:

```text
Streaming services
Cloud subscriptions
Software subscriptions
Memberships
```

Subscriptions can be activated or deactivated and associated with both a credit card and a tenant.

## Fixed Expenses

Fixed expenses are financial obligations that do not necessarily depend on a credit card.

Examples:

```text
Rent
Electricity
Internet
Condominium
Insurance
```

These expenses are included in broader financial reports.

## Income Sources

Income sources represent recurring or expected income.

Examples:

```text
Salary
Freelance
Consulting
Rental income
```

These values are used together with expenses to calculate the user's available financial balance.

## Tenants

Tenants are used as financial grouping entities.

They can represent:

```text
A person
A household
A company
A department
A financial responsibility group
```

This allows reports to separate financial data by responsible entity.

## Financial Reports

The reports page consumes backend reporting endpoints to provide consolidated financial data.

Reports can combine:

```text
Purchases
Subscriptions
Fixed expenses
Income
Installment commitments
```

The backend also supports grouping by tenant and global financial summaries.

## Period Filters

Reusable filtering components are available for financial views.

```text
FilterBar.vue
PeriodFilterBar.vue
```

They allow users to filter data according to selected financial periods.

This is especially useful for:

```text
Monthly reports
Statements
Purchases
Financial summaries
```

## Currency Formatting

Currency formatting logic is centralized in:

```text
src/composables/useCurrency.ts
```

This avoids duplicating monetary formatting logic across different financial pages and components.

## Form Validation

The project uses:

```text
VeeValidate
Yup
```

for form handling and validation.

Purchase-specific validation is also organized in:

```text
src/schemas/purchaseSchema.ts
```

## UI Framework

The interface is built with Vuetify 3.

The project uses reusable layouts and components such as:

```text
AppShell
StatCard
FilterBar
PeriodFilterBar
ThemeSwitcher
```

Material Design Icons are provided through:

```text
@mdi/font
```

## Theme Support

The application includes a theme switcher:

```text
ThemeSwitcher.vue
```

allowing the interface to support different visual themes.

## Environment Variables

Create the environment file:

```bash
cp .env.example .env
```

Default configuration:

```env
VITE_API_URL=http://localhost:3000/api
```

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Base URL of the Financial App Backend API |

## Requirements

For local execution:

- Node.js
- npm
- Financial App Backend running and accessible

Recommended backend URL:

```text
http://localhost:3000/api
```

## Installation

Clone the repository:

```bash
git clone https://github.com/joaomunizdev/financial_app_front_end.git
cd financial_app_front_end
```

Install dependencies:

```bash
npm install
```

or:

```bash
npm ci
```

Create the environment file:

```bash
cp .env.example .env
```

## Running Locally

Start the Vite development server:

```bash
npm run dev
```

The application will normally be available at:

```text
http://localhost:5173
```

Make sure the backend is running at the URL configured in:

```env
VITE_API_URL
```

## Production Build

Build the application:

```bash
npm run build
```

The generated production files will be placed in:

```text
dist/
```

Preview the production build locally:

```bash
npm run preview
```

## Running with Docker

Build and start the frontend:

```bash
docker compose up -d --build
```

View container status:

```bash
docker compose ps
```

View logs:

```bash
docker compose logs -f frontend
```

Stop the container:

```bash
docker compose down
```

## Backend Integration

The frontend communicates with the backend through Axios.

Main API domains include:

```text
/auth
/credit-cards
/tenants
/purchases
/statements
/subscriptions
/fixed-expenses
/income-sources
/reports
```

Example backend URL:

```text
http://localhost:3000/api
```

## API Documentation

When the Financial App Backend is running locally, Swagger documentation is available at:

```text
http://localhost:3000/api/docs
```

## Main Routes

| Route | Description |
| --- | --- |
| `/login` | User login |
| `/register` | User registration |
| `/dashboard` | Financial overview |
| `/reports` | Financial reports |
| `/credit-cards` | Credit card management |
| `/fixed-expenses` | Fixed expense management |
| `/income-sources` | Income source management |
| `/tenants` | Financial grouping management |
| `/purchases` | Purchase and installment management |
| `/statements` | Credit card statement management |
| `/subscriptions` | Recurring subscription management |

## Testing

The project uses Vitest.

Run tests with:

```bash
npm test
```

## Related Repository

Backend API:

```text
https://github.com/joaomunizdev/financial_app_back_end
```

## Development Flow

A typical local development setup is:

```text
PostgreSQL
    ↓
Financial App Backend
http://localhost:3000
    ↓
Financial App Frontend
http://localhost:5173
```

The frontend communicates with:

```text
http://localhost:3000/api
```

and the backend exposes Swagger at:

```text
http://localhost:3000/api/docs
```

## Security Notes

Before deploying to production:

- Use HTTPS.
- Do not commit `.env` files.
- Restrict backend CORS to the production frontend domain.
- Use secure JWT configuration in the backend.
- Avoid exposing sensitive financial information through browser logs.
- Review local storage usage according to the authentication requirements of the production environment.
- Configure the API URL using deployment environment variables.

## License

No explicit license file is currently included in this repository.
