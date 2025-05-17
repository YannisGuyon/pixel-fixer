import * as THREE from "three";

export class Os {
  // data;
  canvas_texture;
  icon_texture: undefined | THREE.Texture = undefined;
  public constructor(public renderer: THREE.WebGLRenderer) {
    const data = new Uint8Array(512 * 512 * 4);
    this.canvas_texture = new THREE.DataTexture(data, 512, 512);
    this.canvas_texture.minFilter = THREE.LinearFilter;
    this.canvas_texture.generateMipmaps = false;
    this.canvas_texture.needsUpdate = true;
  }
  public async Initialize() {
    const loader = new THREE.TextureLoader();
    this.icon_texture = await loader.loadAsync("resources/texture/sand.png");
    this.icon_texture.minFilter = THREE.LinearFilter;
    this.icon_texture.generateMipmaps = false;
  }

  public Update(_: number) {
    if (this.icon_texture !== undefined) {
      const position = new THREE.Vector2();
      position.x = 0;
      position.y = 512 - 20;
      this.renderer.copyTextureToTexture(
        position,
        this.icon_texture,
        this.canvas_texture
      );
    }
  }
}
