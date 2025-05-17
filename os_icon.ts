import * as THREE from "three";

export class OsIcon {
  texture;
  texture_selected;
  position = new THREE.Vector2();
  final_position = new THREE.Vector2();
  selected = false;

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
    this.texture = loader.load(`resources/texture/icon_${name}.png`);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.texture_selected = loader.load(
      `resources/texture/icon_${name}_selected.png`
    );
    this.texture_selected.minFilter = THREE.LinearFilter;
    this.texture_selected.generateMipmaps = false;
  }

  public Reset() {
    this.selected = false;
  }

  public CollectEvent(mouse_x: number, mouse_y: number) {
    if (
      this.texture.image &&
      mouse_x >= this.final_position.x &&
      mouse_x < this.final_position.x + this.texture.image.width &&
      mouse_y >= this.final_position.y &&
      mouse_y < this.final_position.y + this.texture.image.height
    ) {
      this.selected = true;
      this.RandomOffset();
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
    let texture = this.selected ? this.texture_selected : this.texture;
    if (texture.image) {
      renderer.copyTextureToTexture(
        this.final_position,
        texture,
        canvas_texture
      );
    }
  }
}
