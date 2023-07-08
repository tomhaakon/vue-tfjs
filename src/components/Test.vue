<template>
  <div class="flex gap-2 pb-2">
    <div class="flex gap-2 pb-2">
      <div v-if="!isPlaying">
        <button @click="startVideo" class="btn">Start</button>
      </div>
      <div v-else>
        <button @click="stopVideo" class="btn">Stop</button>
      </div>
    </div>
  </div>
  <div class="w-full h-auto md:w-[840px] relative bg-slate-300">
    <canvas
      ref="drawingBoard"
      class="absolute w-full h-full bg-transparent top-0 left-0 mx-auto"
    ></canvas>
    <video
      ref="video"
      class="w-full h-full mx-auto"
      playsinline
      muted
      playbackRate="1"
    >
      <source src="../assets/car_passing.mp4" type="video/mp4" />
    </video>
  </div>
  <div class="text-3xl">
    <pre>Total Count: {{ totalCount }}</pre>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import * as cocoSSD from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs-backend-cpu";
import "@tensorflow/tfjs-backend-webgl";

// Refs
const video = ref<HTMLVideoElement>();
const isPlaying = ref(false);
const drawingBoard = ref<HTMLCanvasElement | null>();
const totalCount = ref(0);
let frameCounter = 0;
let previousFrameObjects: { label: string; bbox: number[] }[] = [];

// Other variables
let model: cocoSSD.ObjectDetection;
let animationFrameId: number | null = null;

// Constants
const predictionSetting = 65;
const threshold = 30;
const resetAge = 5 * 60 * 5;

// Function to handle video end event
const handleVideoEnded = () => {
  stopVideo();
  console.log("Video has ended");
};

// Function to start playing the video and tracking objects
const startVideo = () => {
  isPlaying.value = true;
  if (video.value) {
    video.value.play();
    startStreaming();
    video.value.addEventListener("ended", handleVideoEnded);
  }
};

// Function to stop playing the video and tracking objects
const stopVideo = () => {
  isPlaying.value = false;
  if (video.value) {
    video.value.pause();
  }
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
};

// Lifecycle hook when component is mounted
onMounted(async () => {
  model = await cocoSSD.load();
});

// Lifecycle hook when component is unmounted
onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (video.value) {
    const mediaStream = video.value.srcObject as MediaStream;
    mediaStream?.getTracks().forEach((track) => track.stop());
  }
});

// Function to start the object tracking and counting
const startStreaming = () => {
  const detect = async () => {
    await detectObjects();
    if (isPlaying.value) {
      animationFrameId = requestAnimationFrame(detect);
    }
  };
  detect();
};

// Function to handle object detection and counting logic
const detectObjects = async () => {
  let context: CanvasRenderingContext2D;
  const predictions: cocoSSD.DetectedObject[] = await model.detect(
    video.value as HTMLVideoElement
  );

  if (drawingBoard.value) {
    context = drawingBoard.value.getContext("2d") as CanvasRenderingContext2D;
    drawingBoard.value.height = (video.value as HTMLVideoElement).videoHeight;
    drawingBoard.value.width = (video.value as HTMLVideoElement).videoWidth;

    let count = 0;

    const frameObjects: { label: string; bbox: number[] }[] = [];

    for (const prediction of predictions) {
      const [x, y, width, height] = prediction.bbox;
      const label: string = prediction.class;
      const predictScore = Math.floor(prediction.score * 100);

      if (context && predictScore > predictionSetting) {
        // Draw bounding box and other visualizations

        frameObjects.push({ label, bbox: [x, y, width, height] });
      }
    }

    count = countOverlappingObjects(frameObjects, previousFrameObjects);

    if (count > 0 && frameCounter === 0) {
      totalCount.value += count;
    }

    frameCounter = count;
    previousFrameObjects = frameObjects;

    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};

// Function to count overlapping objects between current and previous frames
const countOverlappingObjects = (
  currentObjects: { label: string; bbox: number[] }[],
  previousObjects: { label: string; bbox: number[] }[]
): number => {
  let count = 0;
  for (const currentObject of currentObjects) {
    for (const previousObject of previousObjects) {
      if (bboxOverlap(currentObject.bbox, previousObject.bbox)) {
        count++;
        break;
      }
    }
  }
  return count;
};

// Function to check if two bounding boxes overlap
const bboxOverlap = (bbox1: number[], bbox2: number[]): boolean => {
  const x1 = bbox1[0];
  const y1 = bbox1[1];
  const w1 = bbox1[2];
  const h1 = bbox1[3];

  const x2 = bbox2[0];
  const y2 = bbox2[1];
  const w2 = bbox2[2];
  const h2 = bbox2[3];

  const left = Math.max(x1, x2);
  const right = Math.min(x1 + w1, x2 + w2);
  const top = Math.max(y1, y2);
  const bottom = Math.min(y1 + h1, y2 + h2);

  return left < right && top < bottom;
};
</script>
