import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

const routes = [
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
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  // garante estado hidratado (em hard refresh)
  if (!auth.token) auth.hydrateFromStorage();

  if (to.meta.auth && !auth.isAuthenticated) return "/login";
  if ((to.path === "/login" || to.path === "/register") && auth.isAuthenticated)
    return "/dashboard";
  return true;
});

export default router;
