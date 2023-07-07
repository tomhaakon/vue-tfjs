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
      loop
      playbackRate="1"
    >
      <source src="../assets/car_passing.mp4" type="video/mp4" />
    </video>
  </div>
  <div><p v-for="obj in showCount">x</p></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import * as cocoSSD from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs-backend-cpu";
import "@tensorflow/tfjs-backend-webgl";

//refs
const video = ref<HTMLVideoElement>();
const isPlaying = ref(false);
const drawingBoard = ref<HTMLCanvasElement | null>();
const showCount = ref();

// type script array
interface TrackedObject {
  id: number;
  centroid: { x: number; y: number };
  lastSeen: number;
  label: string;
}
interface ObjectCounter {
  detected: { label: string; number: number; time: number };
}
//
let trackedObjects: TrackedObject[] = [];
let objectCounter: ObjectCounter[] = [];
let number = 1;
let trackedIndex = 0;
let animationFrameId: number | null = null;
let model: cocoSSD.ObjectDetection;
///
// settings

const predictionSetting = 1000;
const threshold = 500; // Define your threshold here

const startVideo = () => {
  console.log("startVideo triggered");
  isPlaying.value = true;
  if (video.value) {
    video.value.play();
    startStreaming();
  }
};
const stopVideo = () => {
  console.log("stopVideo triggered");
  isPlaying.value = false;
  if (video.value) {
    video.value.pause();
  }
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
};
///
onMounted(async () => {
  model = await cocoSSD.load();
});
//lifecycle
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
if (video.value) {
  const mediaStream = video.value.srcObject as MediaStream;
  mediaStream?.getTracks().forEach((track) => track.stop());
}

// start stream function
const startStreaming = () => {
  console.log("startStreaming triggered");
  const detect = async () => {
    await detectObjects();
    if (isPlaying.value) {
      // ensure we're still playing
      animationFrameId = requestAnimationFrame(detect);
    }
  };
  detect();
};

const detectObjects = async () => {
  let context: CanvasRenderingContext2D;
  const predictions: cocoSSD.DetectedObject[] = await model.detect(
    video.value as HTMLVideoElement
  );

  if (drawingBoard.value) {
    context = drawingBoard.value.getContext("2d") as CanvasRenderingContext2D;
    drawingBoard.value.height = (video.value as HTMLVideoElement).videoHeight;
    drawingBoard.value.width = (video.value as HTMLVideoElement).videoWidth;

    // for eeach detected object
    predictions.forEach((prediction) => {
      // yellow detection box
      const [x, y, width, height] = prediction.bbox;

      const label = prediction.class;
      const predictScore = Math.floor(prediction.score * 100);

      // detection box
      if (context && predictScore > 50) {
        if (drawingBoard.value) {
          context.clearRect(
            0,
            0,
            drawingBoard.value.width,
            drawingBoard.value.height
          );
        }

        context.beginPath();
        context.font = "72px Arial";
        context.fillStyle = "rgba(255, 0, 0, 0.6)";
        context.lineWidth = 1;
        context.fillRect(x, y, width, height);
        context.fillStyle = "yellow";
        context.fillText(`${predictScore}%`, x, y + height + 20); // + 20 to push the text abit down

        const bBoxX = Number(prediction.bbox[0]);
        const bBoxY = Number(prediction.bbox[1]);
        const bBoxWidth = prediction.bbox[2];
        const bBoxHeight = prediction.bbox[3];

        const centroID = {
          x: bBoxX + bBoxWidth / 2,
          y: bBoxY + bBoxHeight / 2,
        };
        let minDistance = Number.MAX_VALUE;
        let closestTrackedObject = null;

        // Calculate the distance to all tracked objects
        for (let i = 0; i < trackedObjects.length; i++) {
          const distance = Math.hypot(
            trackedObjects[i].centroid.x - centroID.x,
            trackedObjects[i].centroid.y - centroID.y
          );

          if (distance < minDistance) {
            minDistance = distance;
            closestTrackedObject = trackedObjects[i];
          }
        }

        // Check if a tracked object is close enough to be associated with the new detection
        if (minDistance < threshold) {
          // Update the tracked object's centroid and last seen timestamp
          if (closestTrackedObject) {
            closestTrackedObject.centroid = centroID;
            closestTrackedObject.lastSeen = Date.now();
            console.log("new car");
          }
        } else {
          // Create a new tracked object
          trackedObjects.push({
            id: trackedIndex++,
            centroid: centroID,
            lastSeen: Date.now(),
            label: label,
          });
          //  counted: { label: string; number: number; when: number };

          console.log("mew car registered");
          objectCounter.push({
            detected: {
              label: label,
              number: number++,
              time: Date.now(),
            },
          });
        }
        const maxAge = 1000; //* 60 * 5; // 5 minutes in milliseconds

        trackedObjects = trackedObjects.filter(
          (obj) => Date.now() - obj.lastSeen <= maxAge
        );
      } // end of context && preiction.score
    }); // end of prediction for each
  } // end of detect objects function
  showCount.value = objectCounter;
  console.log(showCount.value);
};
</script>
