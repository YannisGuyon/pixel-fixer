import * as THREE from "three";
import { MagnifierFisheye } from "./magnifier_fisheye";
import { MagnifierFisheyeTablet } from "./magnifier_fisheye_tablet";
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
    darkmode: { value: 0 },
    canvas: { value: os.canvas_texture },
    simulation: { value: simulation.GetTexture() },
  },
  vertexShader: `varying vec2 vUv; void main() {gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); vUv = uv;}`,
  fragmentShader: `varying vec2 vUv; uniform sampler2D canvas; uniform sampler2D simulation; uniform int darkmode; void main() {
    ivec4 pixel = ivec4(texture2D(simulation, vUv)*255.0);
    vec4 screen = texture2D(canvas, vUv);
    if (darkmode == 1) {
      screen.rgb = vec3(1.0)-screen.rgb;
    }
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

const magnifier_fisheye = new MagnifierFisheye(scene);
magnifier_fisheye.SetVisible(false);
const magnifier_fisheye_tablet = new MagnifierFisheyeTablet(
  scene, os.canvas_texture, simulation.GetTexture());
magnifier_fisheye_tablet.SetVisible(false);

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
const last_sim_press_screen = new THREE.Vector2(-1, -1);
document.addEventListener("mousedown", (event: MouseEvent) => {
  mouse_position.x = event.clientX;
  mouse_position.y = event.clientY;
  last_sim_press_screen.x = -1;
  last_sim_press_screen.y = -1;
  if (!success_overlay.hidden || !game_over_overlay.hidden) return;
  if (
    os.MagnifierSettingIsOn() &&
    event.clientX >= window.innerWidth / 2 + 370 &&
    event.clientX < window.innerWidth / 2 + 370 + 300 &&
    event.clientY >= window.innerHeight / 2 - 250 &&
    event.clientY < window.innerHeight / 2 + 300
  ) {
    arm_magnifier.visible = !arm_magnifier.visible;
    // magnifier.SetVisible(arm_magnifier.visible);

    // arm_magnifier.visible ? magnifier.Grab() : magnifier.Release();
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
      simulation.PressScreen(
        os.GetMouseXInTabletScreenSpace(event.clientX),
        os.GetMouseYInTabletScreenSpace(event.clientY)
      );
      last_sim_press_screen.x = event.clientX;
      last_sim_press_screen.y = event.clientY;
    }
  }
  SetMagnifiersPositions(event.clientX, event.clientY);
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
  SetMagnifiersPositions(event.clientX, event.clientY);
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
    const x = event.clientX;
    const y = event.clientY;
    if (last_sim_press_screen.x !== -1 && last_sim_press_screen.y !== -1) {
      let from_x = last_sim_press_screen.x;
      let from_y = last_sim_press_screen.y;
      let x_diff = x - from_x;
      let y_diff = y - from_y;
      const max_num_pixels = Math.min(
        100,
        Math.max(Math.abs(x_diff), Math.abs(y_diff))
      );
      x_diff /= max_num_pixels;
      y_diff /= max_num_pixels;
      for (let i = 2; i < max_num_pixels; ++i) {
        from_x += x_diff;
        from_y += y_diff;
        simulation.PressScreen(
          os.GetMouseXInTabletScreenSpace(Math.round(from_x)),
          os.GetMouseYInTabletScreenSpace(Math.round(from_y))
        );
      }
    }
    last_sim_press_screen.x = x;
    last_sim_press_screen.y = y;
    simulation.PressScreen(
      os.GetMouseXInTabletScreenSpace(x),
      os.GetMouseYInTabletScreenSpace(y)
    );
  } else {
    last_sim_press_screen.x = -1;
    last_sim_press_screen.y = -1;
  }
  arm_release.position.x =
    event.clientX - 350 - window.innerWidth / 2 + 960 / 2;
  arm_release.position.y =
    window.innerHeight - event.clientY - window.innerHeight / 2 - 755;
  arm_press.position.x = arm_release.position.x;
  arm_press.position.y = arm_release.position.y;
  arm_magnifier.position.x = arm_release.position.x + 77;
  arm_magnifier.position.y = arm_release.position.y + 103;
  SetMagnifiersPositions(event.clientX, event.clientY);
});

function SetMagnifiersPositions(x:number, y:number) {
  if (arm_magnifier.visible) {
    magnifier_fisheye.SetPosition(
      (x + 2016 / 2 - window.innerWidth / 2) / 2016,
      (-y + 1512 / 2 + window.innerHeight / 2) / 1512
    );
    magnifier_fisheye_tablet.SetPosition(
      (x + 640*2 / 2 - window.innerWidth / 2) / 640,
      (-y + 480*2 / 2 + window.innerHeight / 2) / 480
    );
  } else {
    magnifier_fisheye.SetPosition(
      (window.innerWidth / 2+ the_magnifier.position.x+20 + 2016 / 2 - window.innerWidth / 2) / 640,
      (-(window.innerHeight / 2 + the_magnifier.position.y-60) + 480 / 2 + window.innerHeight / 2) / 480
    );
    magnifier_fisheye_tablet.SetPosition(
      (window.innerWidth / 2+ the_magnifier.position.x+20 + 640*2 / 2 - window.innerWidth / 2) / 640,
      (-(window.innerHeight / 2 + the_magnifier.position.y-60) + 480*2 / 2 + window.innerHeight / 2) / 480
    );
  }
}

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
  tablette_shader.uniforms.darkmode.value = os.toggles[0].on;

  the_magnifier.visible = os.MagnifierSettingIsOn() && !arm_magnifier.visible;
  magnifier_fisheye.SetVisible(os.MagnifierSettingIsOn());
  magnifier_fisheye_tablet.SetVisible(os.MagnifierSettingIsOn());

  // document.getElementById("Fps")!.textContent =
  //   average_duration.toString() + " s";

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
    sound_pixel.volume = 0.4;
    sound_pixel.play();
  }

  renderer.autoClear = false;
  renderer.clear();
  renderer.render(scene, camera);

  previous_timestamp = timestamp;
}
renderLoop(0);
