import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import { useAuthStore } from "../stores/auth";

declare module "vue-router" {
  interface RouteMeta {
    auth?: boolean;
    layout?: "auth";
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: "/login",
    component: () => import("../pages/LoginPage.vue"),
    meta: { layout: "auth" },
  },
  {
    path: "/register",
    component: () => import("../pages/RegisterPage.vue"),
    meta: { layout: "auth" },
  },
  {
    path: "/verify-email",
    component: () => import("../pages/VerifyEmailPage.vue"),
    meta: { layout: "auth" },
  },
  { path: "/", redirect: "/dashboard" },
  {
    path: "/dashboard",
    component: () => import("../pages/DashboardPage.vue"),
    meta: { auth: true },
  },
  {
    path: "/reports",
    component: () => import("../pages/ReportsPage.vue"),
    meta: { auth: true },
  },
  {
    path: "/credit-cards",
    component: () => import("../pages/CreditCardsPage.vue"),
    meta: { auth: true },
  },
  {
    path: "/fixed-expenses",
    component: () => import("../pages/FixedExpensesPage.vue"),
    meta: { auth: true },
  },
  {
    path: "/income-sources",
    component: () => import("../pages/IncomeSourcesPage.vue"),
    meta: { auth: true },
  },
  {
    path: "/tenants",
    component: () => import("../pages/TenantsPage.vue"),
    meta: { auth: true },
  },
  {
    path: "/purchases",
    component: () => import("../pages/PurchasesPage.vue"),
    meta: { auth: true },
  },
  {
    path: "/statements",
    component: () => import("../pages/StatementsPage.vue"),
    meta: { auth: true },
  },
  {
    path: "/subscriptions",
    component: () => import("../pages/SubscriptionsPage.vue"),
    meta: { auth: true },
  },
  {
    path: "/:pathMatch(.*)*",
    component: () => import("../pages/NotFoundPage.vue"),
    meta: { auth: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  auth.syncSession();

  if (to.meta.auth && !auth.isAuthenticated) return "/login";
  if (to.meta.layout === "auth" && auth.isAuthenticated) return "/dashboard";
  return true;
});

export default router;
