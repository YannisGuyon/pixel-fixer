import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

function CreateRenderer() {
  let canvas = document.createElement("canvas");
  var context = canvas.getContext("webgl2");
  if (context) {
    return new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas: canvas,
      context: context,
    });
  } else {
    return new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
  }
}

const renderer: THREE.WebGLRenderer = CreateRenderer();
renderer.setPixelRatio(window.devicePixelRatio);

// Environment
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(
  /*fov=*/ 60,
  /*aspect=*/ window.innerWidth / window.innerHeight,
  /*near=*/ 0.001,
  /*far=*/ 100
);

const controls = new OrbitControls(camera, renderer.domElement);
let debug_camera = false;
let debug_stop = false;
let debug_inspect = false;

// Objects
const scene = new THREE.Scene();
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

const table = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0xff0000 })
);
table.position.x = 0;
table.position.y = 0;
table.position.z = -1;
scene.add(table);

const tablette = new THREE.Mesh(
  new THREE.PlaneGeometry(1.2, 0.8, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x00ff00 })
);
tablette.position.x = 0;
tablette.position.y = 0;
tablette.position.z = -0.9;
scene.add(tablette);

// Inputs
document.addEventListener("keydown", onDocumentKeyDown, false);
function onDocumentKeyDown(event: KeyboardEvent) {
  var keyCode = event.key;
  if (keyCode == "Shift" && debug_inspect) {
    debug_camera = !debug_camera;
    if (debug_camera) {
      camera.position.x = 0;
      camera.position.y = 0;
      camera.position.z = 20;
    }
  } else if (keyCode == "ArrowLeft") {
    // player.StartMoveLeft();
  } else if (keyCode == "ArrowRight") {
    // player.StartMoveRight();
  } else if (keyCode == " ") {
    debug_stop = !debug_stop;
    document.getElementById("Pause")!.style.display = debug_stop
      ? "block"
      : "none";
  }
}

document.addEventListener("keyup", onDocumentKeyUp, false);
function onDocumentKeyUp(event: KeyboardEvent) {
  var keyCode = event.key;
  if (keyCode == "ArrowLeft") {
    // player.EndMoveLeft();
  } else if (keyCode == "ArrowRight") {
    // player.EndMoveRight();
  }
}

// Events
window.addEventListener("resize", onWindowResize, false);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.render(scene, camera);
}

let previous_timestamp: null | number = null;
let average_duration = 0.016;
function renderLoop(timestamp: number) {
  requestAnimationFrame(renderLoop);

  if (previous_timestamp == null) {
    previous_timestamp = timestamp;
  }
  average_duration = THREE.MathUtils.lerp(
    average_duration,
    (timestamp - previous_timestamp) / 1000,
    0.1
  );
  // const duration = average_duration; // Can also be hardcoded to 0.016.

  if (!debug_stop) {
    // GameLoop(duration, factor);
  }

  document.getElementById("Fps")!.textContent =
    average_duration.toString() + " ms";

  if (debug_camera) {
    controls.update();
  }

  renderer.autoClear = false;
  renderer.clear();
  renderer.render(scene, camera);

  previous_timestamp = timestamp;
}
renderLoop(0);
