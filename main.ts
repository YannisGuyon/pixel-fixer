import * as THREE from "three";
import { Magnifier } from "./magnifier";
import { Simulation } from "./simulation";
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

const width = 640;
const height = 480;
let simulation = new Simulation(renderer, width, height);

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

const loader = new THREE.TextureLoader();
const table = new THREE.Mesh(
  new THREE.PlaneGeometry(2016, 1512, 1, 1),
  new THREE.MeshStandardMaterial({
    map: loader.load("resources/texture/bureau.webp"),
  })
);
table.position.x = 0;
table.position.y = 0;
table.position.z = -10;
scene.add(table);

const os = new Os(width, height, renderer, simulation);

let tablette_shader = new THREE.ShaderMaterial({
  uniforms: {
    canvas: { value: os.canvas_texture },
    simulation: { value: simulation.GetTexture() },
  },
  vertexShader: `varying vec2 vUv; void main() {gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); vUv = uv;}`,
  fragmentShader: `varying vec2 vUv; uniform sampler2D canvas; uniform sampler2D simulation; void main() {gl_FragColor = mix(texture2D(simulation, vUv), texture2D(canvas, vUv), 0.5);}`,
  transparent: true,
});
let tablette = new THREE.Mesh(
  new THREE.PlaneGeometry(width, height, 1),
  //new THREE.MeshStandardMaterial({ map: os.canvas_texture})
  //new THREE.MeshStandardMaterial({ map: simulation.GetTexture() })
  tablette_shader
);
tablette.position.x = 0;
tablette.position.y = 0;
tablette.position.z = -9;
scene.add(tablette);

const arm_release = new THREE.Mesh(
  new THREE.PlaneGeometry(1007 * 0.5, 3098 * 0.5, 1, 1),
  new THREE.MeshStandardMaterial({
    map: loader.load("resources/texture/release.webp"),
  })
);
arm_release.position.x = 200;
arm_release.position.y = -700;
arm_release.position.z = -7;
arm_release.material.transparent = true;
scene.add(arm_release);

const arm_press = new THREE.Mesh(
  new THREE.PlaneGeometry(1007 * 0.5, 3098 * 0.5, 1, 1),
  new THREE.MeshStandardMaterial({
    map: loader.load("resources/texture/press.webp"),
  })
);
arm_press.position.x = 200;
arm_press.position.y = -700;
arm_press.position.z = -7;
arm_press.material.transparent = true;
scene.add(arm_press);
arm_press.visible = false;

const arm_magnifier = new THREE.Mesh(
  new THREE.PlaneGeometry(1501 * 0.5, 3208 * 0.5, 1, 1),
  new THREE.MeshStandardMaterial({
    map: loader.load("resources/texture/arm_magnifier.webp"),
  })
);
arm_magnifier.position.x = 0;
arm_magnifier.position.y = 0;
arm_magnifier.position.z = -7;
arm_magnifier.material.transparent = true;
scene.add(arm_magnifier);
arm_magnifier.visible = false;

const the_magnifier = new THREE.Mesh(
  new THREE.PlaneGeometry(1296 * 0.28, 2304 * 0.28, 1, 1),
  new THREE.MeshStandardMaterial({
    map: loader.load("resources/texture/magnifier.webp"),
  })
);
the_magnifier.position.x = 520;
the_magnifier.position.y = -30;
the_magnifier.position.z = -8;
the_magnifier.material.transparent = true;
scene.add(the_magnifier);
the_magnifier.visible = false;

const magnifier = new Magnifier(scene);

// Sounds
let first_interaction = false;
const sound_track = document.getElementById("SoundTrack")! as HTMLMediaElement;
const sound_taps = [document.getElementById("SoundTap")! as HTMLMediaElement];

// Overlays
const game_over_overlay = document.getElementById(
  "GameOverOverlay"
)! as HTMLElement;
const success_overlay = document.getElementById(
  "GameSuccessOverlay"
)! as HTMLElement;
for (const retry_button of document.getElementsByClassName("RetryButton")) {
  (retry_button as HTMLElement).onclick = () => {
    location.reload();
  };
}

// Events
document.addEventListener("mousedown", (event: MouseEvent) => {
  if (!success_overlay.hidden || !game_over_overlay.hidden) return;
  if (
    os.MagnifierSettingIsOn() &&
    event.clientX >= window.innerWidth / 2 + 370 &&
    event.clientX < window.innerWidth / 2 + 370 + 300 &&
    event.clientY >= window.innerHeight / 2 - 250 &&
    event.clientY < window.innerHeight / 2 + 300
  ) {
    arm_magnifier.visible = !arm_magnifier.visible;
  }
  if (arm_magnifier.visible) {
    arm_release.visible = false;
    arm_press.visible = false;
  } else {
    arm_release.visible = false;
    arm_press.visible = true;
  }
  if (!first_interaction) {
    sound_track.play();
    first_interaction = true;
  }
  os.SetMousePressed(event.clientX, event.clientY);
  if (arm_press.visible) {
    const sound_tap =
      sound_taps[THREE.MathUtils.randInt(0, sound_taps.length - 1)];
    sound_tap.play();
    if (
      os.IsMouseOverTabletScreen(event.clientX, event.clientY) &&
      !os.IsXorcizing()
    ) {
      const x = os.GetMouseXInTabletScreenSpace(event.clientX);
      const y = os.GetMouseYInTabletScreenSpace(event.clientY);
      simulation.PressScreen(x, y);
    }
  }
});
document.addEventListener("mouseup", (event: MouseEvent) => {
  if (!success_overlay.hidden || !game_over_overlay.hidden) return;
  if (arm_magnifier.visible) {
    arm_release.visible = false;
    arm_press.visible = false;
  } else {
    arm_release.visible = true;
    arm_press.visible = false;
  }
  os.SetMouseReleased(event.clientX, event.clientY);
});
document.addEventListener("mousemove", (event: MouseEvent) => {
  if (!success_overlay.hidden || !game_over_overlay.hidden) return;
  os.SetMouseMove(event.clientX, event.clientY);
  if (
    arm_press.visible &&
    os.IsMouseOverTabletScreen(event.clientX, event.clientY) &&
    !os.IsXorcizing()
  ) {
    const x = os.GetMouseXInTabletScreenSpace(event.clientX);
    const y = os.GetMouseYInTabletScreenSpace(event.clientY);
    simulation.PressScreen(x, y);
    // TODO: Also call PressScreen() on all pixels from last PressScreen()
    //       position in a line if not interrupted
  }
  arm_release.position.x =
    event.clientX - 350 - window.innerWidth / 2 + 960 / 2;
  arm_release.position.y =
    window.innerHeight - event.clientY - window.innerHeight / 2 - 755;
  arm_press.position.x = arm_release.position.x;
  arm_press.position.y = arm_release.position.y;
  arm_magnifier.position.x = arm_release.position.x + 80;
  arm_magnifier.position.y = arm_release.position.y + 100;
  magnifier.SetPosition(
    event.clientX - window.innerWidth / 2,
    -event.clientY + window.innerHeight / 2
  );
});

document.addEventListener("keydown", (event: KeyboardEvent) => {
  if (!success_overlay.hidden || !game_over_overlay.hidden) return;
  if (event.code === "ShiftLeft") {
    magnifier.Grab();
  }
});
document.addEventListener("keyup", (event: KeyboardEvent) => {
  if (!success_overlay.hidden || !game_over_overlay.hidden) return;
  if (event.code === "ShiftLeft") {
    magnifier.Release();
  }
});

window.addEventListener("resize", onWindowResize);
function onWindowResize() {
  camera.left = Math.floor(window.innerWidth / -2);
  camera.right = Math.floor(window.innerWidth / -2) + window.innerWidth;
  camera.top = Math.floor(window.innerHeight / 2);
  camera.bottom = Math.floor(window.innerHeight / 2) - window.innerHeight;
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

  os.Update(duration, arm_magnifier.visible);

  the_magnifier.visible = os.MagnifierSettingIsOn() && !arm_magnifier.visible;

  if (magnifier.is_enabled !== os.MagnifierSettingIsOn()) {
    magnifier.is_enabled = os.MagnifierSettingIsOn();
    magnifier.Release();
  }
  magnifier.Update(duration);
  // tablette.material.map!.needsUpdate = true;

  document.getElementById("Fps")!.textContent =
    average_duration.toString() + " s";

  simulation.Simulate();

  if (simulation.AreAllPixelsAlive()) {
    success_overlay.hidden = false;
  } else if (simulation.AreMostPixelsDead()) {
    game_over_overlay.hidden = true;
  }

  renderer.autoClear = false;
  renderer.clear();
  renderer.render(scene, camera);

  previous_timestamp = timestamp;
}
renderLoop(0);
