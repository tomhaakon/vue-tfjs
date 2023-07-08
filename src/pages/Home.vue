<template>
  <div>
    <div class="mt-6 w-full">
      <Detector />
    </div>
  </div>
</template>
<script setup lang="ts">
import { defineAsyncComponent } from "@vue/runtime-core";

const Detector = defineAsyncComponent(
  () => import(/*webpackChunkName:"detector"*/ "../components/Detector.vue")
);
</script>
