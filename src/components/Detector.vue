<template>
  <div class="w-full h-auto md:w-[840px] relative">
    <div v-for="(count, label) in classCounts" :key="label">
      {{ label }}: {{ count }}
    </div>
    <div>Crossing Count: {{ crossingCount }}</div>
    <canvas
      ref="drawingBoard"
      class="absolute w-full h-full bg-transparent top-0 left-0 mx-auto"
    ></canvas>
    <video
      ref="video"
      class="w-full h-full mx-auto"
      autoplay
      playsinline
    ></video>
  </div>

  <Selector v-model="camera">
    <option value="">Change Camera</option>
    <option
      v-for="(item, index) in devices"
      :key="index"
      :value="item.deviceId"
    >
      {{ item.label }}
    </option>
  </Selector>
</template>

<script setup lang="ts">
import { defineAsyncComponent, onMounted, onUnmounted, ref, watch } from "vue";
import * as cocoSSD from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs-backend-cpu";
import "@tensorflow/tfjs-backend-webgl";

const Selector = defineAsyncComponent(
  () => import("../components/Selector.vue")
);
const classCounts = ref(new Map<string, number>());
const video = ref<HTMLVideoElement>();
const devices = ref<MediaDeviceInfo[]>([]);
const drawingBoard = ref<HTMLCanvasElement>();
const camera = ref<string>("");
let model: cocoSSD.ObjectDetection;
const objectCount = ref(0);
const crossingCount = ref(0);
const lineY = ref(0); // Replace 200 with the position of your line

onMounted(async () => {
  if ("mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices) {
    devices.value = await navigator.mediaDevices.enumerateDevices();
    devices.value = devices.value.filter((item) => item.kind == "videoinput");
    camera.value = devices.value[0].deviceId;
    model = await cocoSSD.load();
    startStreaming();
  }
});
onUnmounted(() => {
  (video.value as HTMLVideoElement).srcObject
    ?.getTracks()
    .forEach((track) => track.stop());
});
watch(camera, () => startStreaming());

function startStreaming(): void {
  navigator.mediaDevices
    .getUserMedia({
      audio: false,
      video: {
        deviceId: camera.value as string,
        facingMode: "user",
        width: 600,
        height: 420,
      },
    })
    .then((stream: MediaStream) => {
      (video.value as HTMLVideoElement).srcObject = stream;
      setInterval(() => {
        detectObjects();
      }, 1500);
    });
}

async function detectObjects(): Promise<void> {
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
  }
  // clear canvas before drawing new boxes
  predictions.forEach((prediction) => {
    // context?.clearRect(
    //   0,
    //   0,
    //   drawingBoard.value.width,
    //   drawingBoard.value.height
    // );
    const [x, y, width, height] = prediction.bbox;
    const label = prediction.class;
    const predictScore = (prediction.score * 100).toFixed(2);
    const color = "yellow";
    const strokeWidth = 1;
    const font = "16px Arial";

    context.beginPath();
    context.moveTo(200, 200);
    context.lineTo(drawingBoard.value.width, drawingBoard.value.height);

    context.strokeStyle = "red";
    context.lineWidth = 5;
    context.stroke();

    if (y < lineY.value && y + height > lineY.value) {
      crossingCount.value++;
    }

    if (classCounts.value.has(label)) {
      classCounts.value.set(label, classCounts.value.get(label)! + 1);
    } else {
      classCounts.value.set(label, 1);
    }

    console.log("detected:", prediction.class, "with ", predictScore, "%");
    console.log(prediction.bbox);

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
}
</script>
