import { createRouter, createWebHistory } from "vue-router";

const routes = [
  {
    path: "/",
    name: "Home",
    component: () => import(/*webpackChunkName:"home"*/ "../pages/Home.vue"),
  },

  {
    path: "/webcam",
    name: "Webcam",
    component: () =>
      import(/*webpackChunkName:"webcam"*/ "../pages/Webcam.vue"),
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
