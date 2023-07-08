import { createRouter, createWebHistory } from "vue-router";
import VideoCount from "../components/VideoCount.vue";
import WebcamCount from "../components/WebcamCount.vue";

const routes = [
  {
    path: "/",
    name: "VideoCount",
    component: VideoCount,
  },
  {
    path: "/webcamcount",
    name: "WebcamCount",
    component: WebcamCount,
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
