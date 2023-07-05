<template>
  <button @click="startCamera" class="btn">Start Camera</button>
  <button @click="stopCamera" class="btn">Stop Camera</button>
  <button
    @click="showCrossCount"
    :class="showLine ? ' bg-red-600 active btn' : 'btn'"
    class=""
  >
    <p v-if="!showLine">Activate crossingline</p>
    <p v-else>Deactivate crossingline</p>
  </button>
  <div class="w-full h-auto md:w-[840px] relative">
    <canvas
      ref="drawingBoard"
      class="absolute w-full h-full bg-transparent top-0 left-0 mx-auto"
    ></canvas>
    <video
      ref="video"
      class="w-full h-full mx-auto"
      playsinline
      autoplay
    ></video>
  </div>
  <div>Crossing Count: {{ crossingCount }}</div>
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
const isActive = ref(false);
const showLine = ref(false);
const classCounts = ref(new Map<string, number>());
const video = ref<HTMLVideoElement>();
const devices = ref<MediaDeviceInfo[]>([]);
const drawingBoard = ref<HTMLCanvasElement>();
const camera = ref<string>("");
const objectCount = ref(0);
const crossingCount = ref(0);
const lineX = ref(300); // horizontal placement

let interval: NodeJS.Timeout | null = null;
let model: cocoSSD.ObjectDetection;
let mediaStream: MediaStream | null = null;

const showCrossCount = () => {
  if (mediaStream) {
    isActive.value = true;
    showLine.value = !showLine.value;
    console.log("showLine:", showLine.value);
  } else {
    console.log("camera not started");
  }
};

///
onMounted(async () => {
  if ("mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices) {
    devices.value = await navigator.mediaDevices.enumerateDevices();
    devices.value = devices.value.filter((item) => item.kind == "videoinput");
    camera.value = devices.value[0].deviceId || "";
    model = await cocoSSD.load();
  }
});

//lifecycle
onUnmounted(() => {
  clearInterval(interval);
  interval = null;

  (video.value as HTMLVideoElement).srcObject
    ?.getTracks()
    .forEach((track) => track.stop());
});
watch(camera, (newValue, oldValue) => {
  if (oldValue && !newValue) {
    stopCamera();
  }
});
//start camera
const startCamera = () => {
  console.log("start");
  if (mediaStream) {
    console.log("Camera already started");
    return;
  }
  startStreaming();
};
//stop camera
const stopCamera = () => {
  console.log("stop");
  if (mediaStream) {
    showLine.value = false;
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
    (video.value as HTMLVideoElement).srcObject = null;
    const context = drawingBoard.value?.getContext("2d");
    //stop detecting interval
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
    if (context) {
      context.clearRect(
        0,
        0,
        drawingBoard.value!.width,
        drawingBoard.value!.height
      );
    }
  } else {
    console.log("Camera not started");
  }
};

// start stream function
const startStreaming = () => {
  console.log("startStreaming triggered");
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
      mediaStream = stream;
      (video.value as HTMLVideoElement).srcObject = stream;

      interval = setInterval(() => {
        detectObjects();
      }, 1500);
    })
    .catch((error) => {
      console.error("Error starting the camera: ", error);
    });
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
  }
  // clear canvas before drawing new boxes
  predictions.forEach((prediction) => {
    const [x, y, width, height] = prediction.bbox;
    const label = prediction.class;
    const predictScore = (prediction.score * 100).toFixed(2);
    const color = "yellow";
    const strokeWidth = 1;
    const font = "16px Arial";

    if (showLine.value) {
      context.beginPath();
      context.moveTo(lineX.value, 0);
      context.lineTo(lineX.value, drawingBoard.value.height);
      context.strokeStyle = "red";
      context.lineWidth = 5;
      context.stroke();
      //counter for red line crossing
      if (x < lineX.value && x + width > lineX.value) {
        crossingCount.value++;
      }
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
