<template>
  <div class="flex gap-2 pb-2">
    <div v-if="isStreaming">
      <button
        @click="stopCamera"
        class="bg-orange-600 active btn hover:bg-orange-500 text-black"
      >
        Stop Camera
      </button>
    </div>
    <div v-else>
      <button @click="startCamera" class="btn">Start Camera</button>
    </div>
    <div v-if="isStreaming">
      <button
        @click="showCrossCount"
        :class="showLine ? ' bg-red-600 active btn' : 'btn'"
        class="hover:bg-red-500"
      >
        <p v-if="!showLine">Activate crossingline</p>
        <p v-else>Deactivate crossingline</p>
      </button>
    </div>
  </div>

  <div class="w-full h-auto md:w-[840px] relative bg-slate-300">
    <canvas
      ref="drawingBoard"
      class="absolute w-full h-full bg-transparent top-0 left-0 mx-auto"
    ></canvas>
    <div>
      <video
        ref="video"
        class="w-full h-full mx-auto"
        playsinline
        autoplay
      ></video>
    </div>
  </div>
  <div v-if="errorMessage" class="text-error">{{ errorMessage }}</div>
  <div>Crossing Line Count: {{ crossingCount }}</div>
  stored {{ objectStore.length }}
  <pre>

 {{ showMeNumbers }}
 </pre
  >
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
const isStreaming = ref(false);
const showLine = ref(false);
const classCounts = ref(new Map<string, number>());
const video = ref<HTMLVideoElement>();
const devices = ref<MediaDeviceInfo[]>([]);
const drawingBoard = ref<HTMLCanvasElement>();
const camera = ref<string | null>(null);
const errorMessage = ref(""); // Error message to be displayed

const objectCount = ref(0);
const crossingCount = ref(0);
const lineX = ref(300); // horizontal placement
const lineY = ref(230); // horizontal placement

const showMeNumbers = ref();

let objectID = ref<string>();
const objectStore = ref<{ id: string; label: string; timerId: number }[]>([]);

const uniqueStore = ref([]);
const movementStore = ref([]);
const mediaStream = ref<MediaStream | null>(null);
let model: cocoSSD.ObjectDetection;
let interval: number | null = null;

const showCrossCount = () => {
  if (mediaStream) {
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
    camera.value = devices.value[0]?.deviceId || null;
    model = await cocoSSD.load();
  }
});

//lifecycle
onUnmounted(() => {
  if (mediaStream.value) {
    const tracks = (mediaStream.value as any).getTracks(); // Type assertion
    tracks.forEach((track: any) => track.stop());
    mediaStream.value = null;
  }
});
watch(camera, (newValue, oldValue) => {
  if (oldValue && !newValue) {
    stopCamera();
  }
});
//start camera
const startCamera = () => {
  console.log("start");
  if (devices.value.length === 0) {
    errorMessage.value = "No video input devices found.";
    return;
  }
  isStreaming.value = true;
  if (mediaStream) {
    console.log("Camera already started");
    return;
  }
  startStreaming();
};
//stop camera
const stopCamera = () => {
  console.log("stop");
  isStreaming.value = false;
  if (mediaStream.value) {
    const tracks = (mediaStream.value as any).getTracks(); // Type assertion
    tracks.forEach((track: any) => track.stop());
    mediaStream.value = null;
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
      mediaStream.value = stream;

      interval = setInterval(() => {
        detectObjects();
      }, 100);
    })
    .catch((error) => {
      console.error("Error starting the camera: ", error);
    });
};

const detectObjects = async () => {
  //  console.log("start detecting");
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

    if (classCounts.value.has(label)) {
      classCounts.value.set(label, classCounts.value.get(label)! + 1);
    } else {
      classCounts.value.set(label, 1);
    }
    //
    // console.log(predictScore, "%:  ", prediction.class);

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
      // make unique detections
      const xMovement = Number(prediction.bbox[0].toFixed(2));
      const objectSize =
        (prediction.bbox[2] * prediction.bbox[3]) / prediction.bbox[1];
      objectID.value = objectSize.toFixed(0);

      showMeNumbers.value = prediction.bbox[1];
      const isTheSame = () => {
        // Find the object in the store, if it exists
        const existingObject = objectStore.value.find(
          (obj) => obj.id === objectID.value
        );

        if (!existingObject) {
          // If the object does not exist in the store, add it
          const currentObjectId = objectID.value || ""; // Use an empty string as default
          objectStore.value.push({
            id: currentObjectId,
            label: label,
            timerId: setTimeout(() => {
              // Remove the object after 2 seconds
              objectStore.value = objectStore.value.filter(
                (obj) => obj.id !== currentObjectId
              );
              //  console.log("Removed object", currentObjectId);
            }, 2000),
          });
          console.log("new object", currentObjectId);
        } else {
          // If the object already exists in the store, cancel the previous timer and set a new one
          clearTimeout(existingObject.timerId);
          existingObject.timerId = setTimeout(() => {
            // Remove the object after 2 seconds
            objectStore.value = objectStore.value.filter(
              (obj) => obj.id !== existingObject.id
            );
            //   console.log("Removed object", existingObject.id);
          }, 1000);
          //  console.log("Refreshed timer for object", existingObject.id);
        }
      };

      //   console.log(uniqueStore.value.length);
      // Call the function
      isTheSame();
    }
  });
};
</script>
