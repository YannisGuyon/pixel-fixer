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

let gl = renderer.getContext();
function GetACroppedRegionOfTheScreenColorAndOfTheSimulation(x: number, y: number, w: number, h: number) {
  // data[(pixel_y*7+pixel_x)*8 + 0] -> Red color
  // data[(pixel_y*7+pixel_x)*8 + 1] -> Green color
  // data[(pixel_y*7+pixel_x)*8 + 2] -> Blue color
  // data[(pixel_y*7+pixel_x)*8 + 3] -> Alpha color
  // data[(pixel_y*7+pixel_x)*8 + 4] -> State (255 -> Alive | 0 -> Dead)
  // data[(pixel_y*7+pixel_x)*8 + 5] -> A timestamp
  // data[(pixel_y*7+pixel_x)*8 + 6] -> Is Zombie (255 -> Yes | 0 -> No)
  // data[(pixel_y*7+pixel_x)*8 + 7] -> Visibility (255 -> Yes | 0 -> No)
  let pixel_state = simulation.GetCPUTexture();
  os.canvas_texture_webgl = renderer.properties.get(os.canvas_texture).__webglTexture;
  if (os.canvas_texture_webgl !== undefined) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, os.framebuffer_to_read_the_CPU_texture);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, os.canvas_texture_webgl, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE) {
      gl.readPixels(0, 0, os.width, os.height, gl.RGBA, gl.UNSIGNED_BYTE, os.canvas_texture_cpu);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  }

  const data = new Uint8Array(w * h * (4 + 4));
  for (let i=0; i<w; i++) {
    for (let j=0; j<h; j++) {
      const pixel_x = x+i-w/2;
      const pixel_y = y+j-h/2;
      if (pixel_x < 0 || pixel_x > os.width-w*0.5 || pixel_y < 0 || pixel_y > os.height-h*0.5) {
        for (let k=0; k<8; k++) {
          data[(j*w+i)*8+k] = 0;
        }
      } else {
        data[(j*w+i)*8 + 0] = os.canvas_texture_cpu[(pixel_y*w+pixel_x)*4 + 0];
        data[(j*w+i)*8 + 1] = os.canvas_texture_cpu[(pixel_y*w+pixel_x)*4 + 1];
        data[(j*w+i)*8 + 2] = os.canvas_texture_cpu[(pixel_y*w+pixel_x)*4 + 2];
        data[(j*w+i)*8 + 3] = os.canvas_texture_cpu[(pixel_y*w+pixel_x)*4 + 3];
        data[(j*w+i)*8 + 4] = pixel_state[(pixel_y*w+pixel_x)*4 + 0];
        data[(j*w+i)*8 + 5] = pixel_state[(pixel_y*w+pixel_x)*4 + 1];
        data[(j*w+i)*8 + 6] = pixel_state[(pixel_y*w+pixel_x)*4 + 2];
        data[(j*w+i)*8 + 7] = 255;
      }
    }
  }
  return data;
}

let tablette_shader = new THREE.ShaderMaterial({
  uniforms: {
    canvas: { value: os.canvas_texture },
    simulation: { value: simulation.GetTexture() },
  },
  vertexShader: `varying vec2 vUv; void main() {gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); vUv = uv;}`,
  fragmentShader: `varying vec2 vUv; uniform sampler2D canvas; uniform sampler2D simulation; void main() {
    ivec4 pixel = ivec4(texture2D(simulation, vUv)*255.0);
    vec4 screen = texture2D(canvas, vUv);
    if (pixel.b == 255) {
      gl_FragColor = mix(vec4(0.3, 0.7, 0.2, 1.0), screen, 0.1);
    } else if (pixel.r == 0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
      gl_FragColor = screen;
    }
  }`,
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
magnifier.SetVisible(false);

// Sounds
let first_interaction = false;
const sound_track = document.getElementById("SoundTrack")! as HTMLMediaElement;
const sounds_tap = [document.getElementById("SoundTap")! as HTMLMediaElement];
const sounds_pixel = [
  document.getElementById("SoundPixel1")! as HTMLMediaElement,
  document.getElementById("SoundPixel2")! as HTMLMediaElement,
  document.getElementById("SoundPixel3")! as HTMLMediaElement,
];

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
const mouse_position = new THREE.Vector2(0, 0);
document.addEventListener("mousedown", (event: MouseEvent) => {
  mouse_position.x = event.clientX;
  mouse_position.y = event.clientY;
  if (!success_overlay.hidden || !game_over_overlay.hidden) return;
  if (
    os.MagnifierSettingIsOn() &&
    event.clientX >= window.innerWidth / 2 + 370 &&
    event.clientX < window.innerWidth / 2 + 370 + 300 &&
    event.clientY >= window.innerHeight / 2 - 250 &&
    event.clientY < window.innerHeight / 2 + 300
  ) {
    arm_magnifier.visible = !arm_magnifier.visible;
    magnifier.SetVisible(arm_magnifier.visible);

    arm_magnifier.visible ? magnifier.Grab() : magnifier.Release();
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
      sounds_tap[THREE.MathUtils.randInt(0, sounds_tap.length - 1)];
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
  mouse_position.x = event.clientX;
  mouse_position.y = event.clientY;
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
  mouse_position.x = event.clientX;
  mouse_position.y = event.clientY;
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
  if(arm_magnifier.visible){
    magnifier.SetPosition(
      event.clientX - window.innerWidth / 2,
      -event.clientY + window.innerHeight / 2
    );
    magnifier.SetPixels(GetACroppedRegionOfTheScreenColorAndOfTheSimulation(mouse_position.x, mouse_position.y, magnifier.pixel_count, magnifier.pixel_count));
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
  }
  magnifier.Update(duration);
  // tablette.material.map!.needsUpdate = true;

  document.getElementById("Fps")!.textContent =
    average_duration.toString() + " s";

  const infection_propagation_speed =
    simulation.GetNumDeadPixels() < 6
      ? 0
      : 1 +
        simulation.GetDeadPixelRatio() * simulation.GetDeadPixelRatio() * 20;
  simulation.Simulate(infection_propagation_speed / 255);

  if (simulation.AreAllPixelsAlive()) {
    success_overlay.hidden = false;
  } else {
    success_overlay.hidden = true; // TODO: Should not be necessary
    if (simulation.AreMostPixelsDead()) {
      game_over_overlay.hidden = false;
    }
  }

  if (
    success_overlay.hidden &&
    game_over_overlay.hidden &&
    arm_magnifier.visible &&
    os.IsMouseOverTabletScreen(mouse_position.x, mouse_position.y) &&
    THREE.MathUtils.randInt(0, 63) == 0
  ) {
    const sound_pixel =
      sounds_pixel[THREE.MathUtils.randInt(0, sounds_pixel.length - 1)];
    sound_pixel.play();
  }

  renderer.autoClear = false;
  renderer.clear();
  renderer.render(scene, camera);

  GetACroppedRegionOfTheScreenColorAndOfTheSimulation(0, 0, 7, 7);

  previous_timestamp = timestamp;
}
renderLoop(0);
