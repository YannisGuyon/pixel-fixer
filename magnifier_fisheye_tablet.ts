import * as THREE from "three";

export class MagnifierFisheyeTablet {
  mesh;
  public constructor(scene: THREE.Scene, texture_tablet: THREE.Texture,
    texture_sim:THREE.Texture) {
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(640, 480, 1, 1),
      new THREE.ShaderMaterial({
        uniforms: {
          magnifier_center: { value: new THREE.Vector2() },
          canvas: { value: texture_tablet },
          simulation: { value: texture_sim },
        },
        vertexShader: `
        varying vec2 vUv;
        void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            vUv = uv;
        }`,
        fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D canvas;
        uniform sampler2D simulation;
        uniform vec2 magnifier_center;
        void main() {
            vec2 myUv = vec2(vUv.x*640./480.,vUv.y);
            vec2 diff = myUv-magnifier_center;
            if (length(diff) < 0.3) {
                vec2 newUv = magnifier_center + diff *0.05;
                vec2 newNewUv = vec2(newUv.x/640.*480., newUv.y);

                // gl_FragColor = vec4(mod(newNewUv.x*640.0,1.0), mod(newNewUv.y*480.0,1.0), 0, 1);
                gl_FragColor = texture2D(simulation, newNewUv);
                // gl_FragColor = texture2D(canvas, newNewUv);
            }
            else {
                discard;
            }
        }`,
      })
    );
    this.mesh.position.x = 0;
    this.mesh.position.y = 0;
    this.mesh.position.z = -8.4;
    scene.add(this.mesh);
  }

  public SetVisible(visible: boolean) {
    this.mesh.visible = visible;
  }

  SetPosition(center_x: number, center_y: number) {
    this.mesh.material.uniforms.magnifier_center.value.x =
      (center_x * 640) / 480;
    this.mesh.material.uniforms.magnifier_center.value.y = center_y;
  }
}
