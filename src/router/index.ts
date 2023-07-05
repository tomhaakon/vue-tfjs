import { createRouter, createWebHistory } from "vue-router";
import Test from "../components/Test.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: () => import("../pages/Home.vue"),
  },
  {
    path: "/test",
    name: "Test",
    component: Test,
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
