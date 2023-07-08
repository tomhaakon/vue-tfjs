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
    <p v-for="counter in objectCounter" :key="counter.detected.label">
      {{ counter.detected.label }}: {{ counter.detected.number }}
    </p>
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
const objectCounter = ref<ObjectCounter[]>([]);
const showCount = ref();

// TypeScript types
interface TrackedObject {
  id: number;
  centroid: { x: number; y: number };
  lastSeen: number;
  label: string;
  counted: boolean;
}

interface ObjectCounter {
  detected: {
    label: string;
    number: number;
    time: number;
  };
}

// Other variables
let trackedObjects: TrackedObject[] = [];
let trackedIndex = 0;
let animationFrameId: number | null = null;
let model: cocoSSD.ObjectDetection;
let totalCount = ref(0);
// Constants
const predictionSetting = 70;
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

// Function to handle object detection and tracking logic
const detectObjects = async () => {
  let context: CanvasRenderingContext2D;
  const predictions: cocoSSD.DetectedObject[] = await model.detect(
    video.value as HTMLVideoElement
  );
  // Reset the total count for each frame
  totalCount.value = 0;

  if (drawingBoard.value) {
    context = drawingBoard.value.getContext("2d") as CanvasRenderingContext2D;
    drawingBoard.value.height = (video.value as HTMLVideoElement).videoHeight;
    drawingBoard.value.width = (video.value as HTMLVideoElement).videoWidth;

    // Reset the counters for each object in the current frame
    for (let i = 0; i < trackedObjects.length; i++) {
      trackedObjects[i].counted = false;
    }

    for (const prediction of predictions) {
      const [x, y, width, height] = prediction.bbox;
      const label = prediction.class;
      const predictScore = Math.floor(prediction.score * 100);

      if (context && predictScore > predictionSetting) {
        context.clearRect(
          0,
          0,
          drawingBoard.value.width,
          drawingBoard.value.height
        );

        context.beginPath();
        context.font = "72px Arial";
        context.fillStyle = "rgba(255, 0, 0, 0.6)";
        context.lineWidth = 1;
        context.fillRect(x, y, width, height);
        context.fillStyle = "yellow";
        context.fillText(`${predictScore}%`, x, y + height + 20);

        const bBoxX = Number(prediction.bbox[0]);
        const bBoxY = Number(prediction.bbox[1]);
        const bBoxWidth = prediction.bbox[2];
        const bBoxHeight = prediction.bbox[3];

        const centroid = {
          x: bBoxX + bBoxWidth / 2,
          y: bBoxY + bBoxHeight / 2,
        };

        let minDistance = Number.MAX_VALUE;
        let closestTrackedObject: TrackedObject | null = null;

        for (let i = 0; i < trackedObjects.length; i++) {
          const distance = Math.hypot(
            trackedObjects[i].centroid.x - centroid.x,
            trackedObjects[i].centroid.y - centroid.y
          );

          if (distance < minDistance) {
            minDistance = distance;
            closestTrackedObject = trackedObjects[i];
          }
        }

        if (minDistance < threshold) {
          if (closestTrackedObject) {
            closestTrackedObject.centroid = centroid;
            closestTrackedObject.lastSeen = Date.now();
          }
        } else {
          trackedObjects.push({
            id: trackedIndex++,
            centroid: centroid,
            lastSeen: Date.now(),
            label: label,
            counted: false,
          });
        }

        if (closestTrackedObject && !closestTrackedObject.counted) {
          const existingCounterIndex = objectCounter.value.findIndex(
            (counter) => counter.detected.label === label
          );

          if (existingCounterIndex !== -1) {
            // Update the existing counter
            objectCounter.value[existingCounterIndex].detected.number++;
            totalCount.value++; // Increment the totalCount
          } else {
            objectCounter.value.push({
              detected: {
                label,
                number: 1,
                time: Date.now(),
              },
            });
            totalCount.value++; // Increment the totalCount
          }

          closestTrackedObject.counted = true;
        }
      }
    }

    const maxAge = resetAge;

    trackedObjects = trackedObjects.filter(
      (obj) => Date.now() - obj.lastSeen <= maxAge
    );

    // Remove counted objects from the trackedObjects array
    trackedObjects = trackedObjects.filter((obj) => !obj.counted);

    showCount.value = objectCounter.value.length;

    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};
</script>
