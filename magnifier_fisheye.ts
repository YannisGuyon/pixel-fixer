import * as THREE from "three";

export class MagnifierFisheye {
  mesh;
  public constructor(scene: THREE.Scene) {
    const loader = new THREE.TextureLoader();
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2016, 1512, 1, 1),
      new THREE.ShaderMaterial({
        uniforms: {
          magnifier_center: { value: new THREE.Vector2() },
          canvas: { value: loader.load("resources/texture/bureau.webp") },
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
        uniform vec2 magnifier_center;
        void main() {
            vec2 myUv = vec2(vUv.x*2016./1512.,vUv.y);
            vec2 diff = myUv-magnifier_center;
            if (length(diff) < 0.09) {
                vec2 newUv = magnifier_center + diff *0.2;
                gl_FragColor = texture2D(canvas, vec2(newUv.x/2016.*1512., newUv.y));
            }
            else {
                discard;
            }
        }`,
      })
    );
    this.mesh.position.x = 0;
    this.mesh.position.y = 0;
    this.mesh.position.z = -8.5;
    scene.add(this.mesh);
  }

  public SetVisible(visible: boolean) {
    this.mesh.visible = visible;
  }

  SetPosition(center_x: number, center_y: number) {
    this.mesh.material.uniforms.magnifier_center.value.x =
      (center_x * 2016) / 1512;
    this.mesh.material.uniforms.magnifier_center.value.y = center_y;
  }
}
