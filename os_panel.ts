import * as THREE from "three";

export class OsPanel {
  texture;
  position = new THREE.Vector2();
  final_position = new THREE.Vector2();

  public constructor(
    name: string,
    x: number,
    y: number,
    public enabled: boolean
  ) {
    this.position.x = x;
    this.position.y = y;
    this.RandomOffset();
    const loader = new THREE.TextureLoader();
    this.texture = loader.load(`resources/texture/panel_${name}.png`);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
  }

  public CollectEvent(mouse_x: number, mouse_y: number) {
    if (this.enabled) {
      if (
        this.texture.image &&
        mouse_x >= this.final_position.x &&
        mouse_x < this.final_position.x + this.texture.image.width &&
        mouse_y >= this.final_position.y &&
        mouse_y < this.final_position.y + this.texture.image.height
      ) {
        this.enabled = true;
      } else {
        this.RandomOffset();
        this.enabled = false;
      }
      return true;
    }
    return false;
  }

  private RandomOffset() {
    this.final_position.x = this.position.x + THREE.MathUtils.randInt(-8, 8);
    this.final_position.y = this.position.y + THREE.MathUtils.randInt(-8, 8);
  }

  public Draw(
    _: number,
    renderer: THREE.WebGLRenderer,
    canvas_texture: THREE.Texture
  ) {
    if (!this.enabled) return;
    let texture = this.texture;
    if (texture.image) {
      renderer.copyTextureToTexture(
        this.final_position,
        texture,
        canvas_texture
      );
    }
  }
}
