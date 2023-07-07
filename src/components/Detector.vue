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
const camera = ref<string>("");
const objectCount = ref(0);
const crossingCount = ref(0);
const lineX = ref(300); // horizontal placement
const lineY = ref(230); // horizontal placement

const showMeNumbers = ref();

let objectID = ref();
const objectStore = ref([]);
const uniqueStore = ref([]);
const movementStore = ref([]);
let interval: NodeJS.Timeout | null = null;
let model: cocoSSD.ObjectDetection;
let mediaStream: MediaStream | null = null;

const average = (numbers) => {
  let total = numbers.reduce(
    (accumulator, current) => accumulator + current,
    0
  );
  return total / numbers.length;
};

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
  if (mediaStream) {
    showLine.value = false;
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
    console.log(mediaStream);
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

    if (showLine.value) {
      // redline
      context.beginPath();
      context.moveTo(lineX.value, 0);
      context.lineTo(lineX.value, drawingBoard.value.height);
      context.strokeStyle = "red";
      context.lineWidth = 5;
      context.stroke();
      //horizontal line
      context.beginPath();
      context.moveTo(0, lineY.value);
      context.lineTo(drawingBoard.value?.width, lineY.value);
      context.strokeStyle = "green";
      context.lineWidth = 5;
      context.stroke();
      //counter
      if (
        x < lineX.value &&
        x + width > lineX.value &&
        y < lineY.value &&
        y + height > lineY.value
      ) {
        crossingCount.value++;
      }
    }

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
          const currentObjectId = objectID.value;
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
      //console.log(objectStore.value);
      //console.log(uniqueStore.value);
      //  console.log(uniqueDetection.value.toFixed(0));
      // let currentTime = new Date();
      // let hours = currentTime.getHours();
      // let minutes = currentTime.getMinutes();
      // let seconds = currentTime.getSeconds();
      // console.log(`${hours}:${minutes}:${seconds}`);
    }
  });
};
</script>
