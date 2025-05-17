import * as THREE from "three";

export class OsIcon {
  texture;
  texture_selected;
  position = new THREE.Vector2();
  final_position = new THREE.Vector2();
  overidden_position = new THREE.Vector2(-1, -1);
  overidden_position_offset = new THREE.Vector2(0, 0);
  selected = false;

  public constructor(
    name: string,
    x: number,
    y: number,
    public enabled: boolean,
    public jitter: boolean
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
      this.enabled &&
      this.texture.image &&
      mouse_x >= this.final_position.x &&
      mouse_x < this.final_position.x + this.texture.image.width &&
      mouse_y >= this.final_position.y &&
      mouse_y < this.final_position.y + this.texture.image.height
    ) {
      this.selected = true;
      this.RandomOffset();
      this.OverridePosition();
      return true;
    }
    return false;
  }

  private OverridePosition() {
    if (this.overidden_position.x !== -1 && this.overidden_position.y !== -1) {
      this.final_position.x = Math.max(
        0,
        Math.min(
          this.overidden_position.x - this.overidden_position_offset.x,
          640 - 64
        )
      );
      this.final_position.y = Math.max(
        0,
        Math.min(
          this.overidden_position.y - this.overidden_position_offset.y,
          480 - 64
        )
      );
    }
  }

  private RandomOffset() {
    if (this.jitter) {
      this.final_position.x = this.position.x + THREE.MathUtils.randInt(-8, 8);
      this.final_position.y = this.position.y + THREE.MathUtils.randInt(-8, 8);
    } else {
      this.final_position.x = this.position.x;
      this.final_position.y = this.position.y;
    }
  }

  public Draw(
    _: number,
    renderer: THREE.WebGLRenderer,
    canvas_texture: THREE.Texture
  ) {
    if (!this.enabled) return;
    this.OverridePosition();
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
