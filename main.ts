import * as THREE from "three";
import { Magnifier } from "./magnifier";
import { Os } from "./os";

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
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Objects
const scene = new THREE.Scene();
scene.add(new THREE.AmbientLight(0xffffff, 1.0));

const camera = new THREE.OrthographicCamera(
  Math.floor(window.innerWidth / -2),
  Math.floor(window.innerWidth / -2) + window.innerWidth,
  Math.floor(window.innerHeight / 2),
  Math.floor(window.innerHeight / 2) - window.innerHeight,
  0,
  10
);
scene.add(camera);

const table = new THREE.Mesh(
  new THREE.PlaneGeometry(500, 250, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0xff0000 })
);
table.position.x = 0;
table.position.y = 0;
table.position.z = -10;
scene.add(table);

const width = 640;
const height = 480;
const os = new Os(width, height, renderer);

const tablette = new THREE.Mesh(
  new THREE.PlaneGeometry(width, height, 1),
  new THREE.MeshStandardMaterial({ map: os.canvas_texture })
);
tablette.position.x = 0;
tablette.position.y = 0;
tablette.position.z = -9;
scene.add(tablette);

const magnifier = new Magnifier(scene);

document.addEventListener("mousedown", (event: MouseEvent) => {
  os.SetMousePressed(event.clientX, event.clientY);
});
document.addEventListener("mouseup", (event: MouseEvent) => {
  os.SetMouseReleased(event.clientX, event.clientY);
});
document.addEventListener("mousemove", (event: MouseEvent) => {
  os.SetMouseMove(event.clientX, event.clientY);
  magnifier.SetPosition(
    event.clientX - window.innerWidth / 2,
    -event.clientY + window.innerHeight / 2
  );
});

document.addEventListener("keydown", (event: KeyboardEvent) => {
  if (event.code === "ShiftLeft") {
    magnifier.Grab();
  }
});
document.addEventListener("keyup", (event: KeyboardEvent) => {
  if (event.code === "ShiftLeft") {
    magnifier.Release();
  }
});

// Events
window.addEventListener("resize", onWindowResize);
function onWindowResize() {
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
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
  const duration = average_duration; // Can also be hardcoded to 0.016.

  os.Update(duration);
  magnifier.Update(duration);
  // tablette.material.map!.needsUpdate = true;

  document.getElementById("Fps")!.textContent =
    average_duration.toString() + " s";

  renderer.autoClear = false;
  renderer.clear();
  renderer.render(scene, camera);

  previous_timestamp = timestamp;
}
renderLoop(0);
