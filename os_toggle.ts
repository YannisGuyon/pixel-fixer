import * as THREE from "three";

export class OsToggle {
  texture_off;
  texture_on;
  position = new THREE.Vector2();
  final_position = new THREE.Vector2();
  rabid = false;
  sound_toggle = document.getElementById("SoundToggle")! as HTMLMediaElement;

  public constructor(
    x: number,
    y: number,
    public on: boolean,
    public turns_rabid_when_toggled: boolean
  ) {
    this.position.x = x;
    this.position.y = y;
    this.RandomOffset();
    const loader = new THREE.TextureLoader();
    this.texture_off = loader.load(`resources/texture/toggle_off.png`);
    this.texture_off.minFilter = THREE.LinearFilter;
    this.texture_off.generateMipmaps = false;
    this.texture_on = loader.load(`resources/texture/toggle_on.png`);
    this.texture_on.minFilter = THREE.LinearFilter;
    this.texture_on.generateMipmaps = false;
  }

  public CollectEvent(mouse_x: number, mouse_y: number) {
    if (
      this.texture_off.image &&
      mouse_x >= this.final_position.x &&
      mouse_x < this.final_position.x + this.texture_off.image.width &&
      mouse_y >= this.final_position.y &&
      mouse_y < this.final_position.y + this.texture_off.image.height
    ) {
      if (this.rabid) return true; // Capture but do nothing
      this.sound_toggle.currentTime = 0;
      this.sound_toggle.volume = 0.4;
      this.sound_toggle.play();
      this.on = !this.on;
      if (this.on && this.turns_rabid_when_toggled) {
        this.rabid = true;
      }
      this.RandomOffset();
      return true;
    }
    return false;
  }

  private RandomOffset() {
    this.final_position.x = this.position.x + THREE.MathUtils.randInt(-16, 16);
    this.final_position.y = this.position.y + THREE.MathUtils.randInt(-2, 2);
  }

  public Draw(
    _: number,
    renderer: THREE.WebGLRenderer,
    canvas_texture: THREE.Texture
  ) {
    if (this.rabid) {
      this.RandomOffset();
      this.on = !this.on;
    }
    let texture = this.on ? this.texture_on : this.texture_off;
    if (texture.image) {
      renderer.copyTextureToTexture(
        this.final_position,
        texture,
        canvas_texture
      );
    }
  }
}
