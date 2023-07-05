<template>
  <div class="flex gap-2 pb-2">
    <div v-if="isPlaying">
      <button
        @click="showCrossCount"
        :class="showLine ? ' bg-red-600 active btn' : 'btn'"
        class="hover:bg-red-500"
      >
        <p v-if="!showLine">Activate crossingline</p>
        <p v-else>Deactivate crossingline</p>
      </button>
    </div>
    <div class="flex gap-2 pb-2">
      <button @click="startVideo" class="btn">Start</button>
      <button @click="stopVideo" class="btn">Stop</button>
    </div>
  </div>
  <div class="w-full h-auto md:w-[840px] relative bg-slate-300">
    <canvas
      ref="drawingBoard"
      class="absolute w-full h-full bg-transparent top-0 left-0 mx-auto"
    ></canvas>
    <video ref="video" class="w-full h-full mx-auto" loop playsinline muted>
      <source src="../assets/car_passing.mp4" type="video/mp4" />
    </video>
  </div>
  <div>Crossing Line Count: {{ crossingCount }}</div>
  <div v-for="(count, label) in classCounts" :key="label">
    {{ label }}: {{ count }}
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import * as cocoSSD from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs-backend-cpu";
import "@tensorflow/tfjs-backend-webgl";

//refs

const showLine = ref(false);
const classCounts = ref(new Map<string, number>());
const video = ref<HTMLVideoElement>();
const isPlaying = ref(true);
const drawingBoard = ref<HTMLCanvasElement>();

const objectCount = ref(0);
const crossingCount = ref(0);
const lineX = ref(600); // horizontal placement

let interval: NodeJS.Timeout | null = null;
let model: cocoSSD.ObjectDetection;

const showCrossCount = () => {
  showLine.value = !showLine.value;
};
const startVideo = () => {
  console.log("startVideo triggered");
  (video.value as HTMLVideoElement).play();
  startStreaming();
};
const stopVideo = () => {
  console.log("stopVideo triggered");
  (video.value as HTMLVideoElement).pause();
  clearInterval(interval);
  interval = null;
};
///
onMounted(async () => {
  model = await cocoSSD.load();
});
//lifecycle
onUnmounted(() => {
  clearInterval(interval);
  interval = null;

  (video.value as HTMLVideoElement).srcObject
    ?.getTracks()
    .forEach((track) => track.stop());
});

// start stream function
const startStreaming = () => {
  console.log("startStreaming triggered");

  interval = setInterval(() => {
    detectObjects();
  }, 10);
};

const detectObjects = async () => {
  console.log("start detecting");
  const predictions: cocoSSD.DetectedObject[] = await model.detect(
    video.value as HTMLVideoElement
  );
  objectCount.value = predictions.length;
  classCounts.value = new Map<string, number>();
  let context: CanvasRenderingContext2D;

  if (drawingBoard.value) {
    context = drawingBoard.value.getContext("2d") as CanvasRenderingContext2D;
    drawingBoard.value.height = (video.value as HTMLVideoElement).videoHeight;
    drawingBoard.value.width = (video.value as HTMLVideoElement).videoWidth;

    //red øome
    if (showLine.value) {
      context.beginPath();
      context.moveTo(lineX.value, 0);
      context.lineTo(lineX.value, drawingBoard.value.height);
      context.strokeStyle = "red";
      context.lineWidth = 5;
      context.stroke();
    }
  }

  predictions.forEach((prediction) => {
    const [x, y, width, height] = prediction.bbox;
    const label = prediction.class;
    const predictScore = (prediction.score * 100).toFixed(2);
    const color = "yellow";
    const strokeWidth = 1;
    const font = "16px Arial";

    //counter for red line crossing
    if (x < lineX.value && x + width > lineX.value) {
      crossingCount.value++;
    }
    if (classCounts.value.has(label)) {
      classCounts.value.set(label, classCounts.value.get(label)! + 1);
    } else {
      classCounts.value.set(label, 1);
    }

    console.log(predictScore, "%:  ", prediction.class);

    // detection box
    if (context) {
      context.beginPath();
      context.font = font;
      context.strokeStyle = color;
      context.fillStyle = color;
      context.lineWidth = strokeWidth;
      context.fillText(`${label} ${predictScore}%`, x, y + height + 20); // + 20 to push the text abit down
      context.rect(x, y, width, height);
      context.stroke();
    }
  });
};
</script>
