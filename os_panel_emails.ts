import * as THREE from "three";

import { OsPanel } from "./os_panel";

export class OsPanelEmails extends OsPanel {
  page = 0;
  show_email_details = false;
  second_page_texture;
  no_connectivity_texture;
  sound_404 = document.getElementById("Sound404")! as HTMLMediaElement;

  public constructor(name: string, x: number, y: number, enabled: boolean) {
    super(name, x, y, enabled);
    const loader = new THREE.TextureLoader();
    this.second_page_texture = loader.load(
      `resources/texture/panel_emails_page_two.png`
    );
    this.second_page_texture.minFilter = THREE.LinearFilter;
    this.second_page_texture.generateMipmaps = false;
    this.no_connectivity_texture = loader.load(
      `resources/texture/panel_emails_404.png`
    );
    this.no_connectivity_texture.minFilter = THREE.LinearFilter;
    this.no_connectivity_texture.generateMipmaps = false;
  }

  override CollectEvent(mouse_x: number, mouse_y: number) {
    const prev_arrow_x = 392;
    const next_arrow_x = 455;
    const arrow_y = 10;
    const arrow_size = 31;
    if (this.enabled && this.texture.image) {
      if (
        mouse_x >= this.final_position.x + prev_arrow_x &&
        mouse_x < this.final_position.x + prev_arrow_x + arrow_size &&
        mouse_y >= this.final_position.y + arrow_y &&
        mouse_y < this.final_position.y + arrow_y + arrow_size
      ) {
        this.page = 0;
      }
      if (
        mouse_x >= this.final_position.x + next_arrow_x &&
        mouse_x < this.final_position.x + next_arrow_x + arrow_size &&
        mouse_y >= this.final_position.y + arrow_y &&
        mouse_y < this.final_position.y + arrow_y + arrow_size
      ) {
        this.page = 1;
      }
      if (
        !this.show_email_details &&
        mouse_x >= this.final_position.x + 15 &&
        mouse_x < this.final_position.x + this.texture.image.width - 15 &&
        mouse_y >= this.final_position.y + 45 + this.page * 80 &&
        mouse_y < this.final_position.y + this.texture.image.height - 55
      ) {
        this.show_email_details = true;
        this.sound_404.play();
      }
    }
    return super.CollectEvent(mouse_x, mouse_y);
  }

  override Draw(
    _: number,
    renderer: THREE.WebGLRenderer,
    canvas_texture: THREE.Texture
  ) {
    if (!this.enabled) {
      this.show_email_details = false;
      return;
    }
    let texture = this.show_email_details
      ? this.no_connectivity_texture
      : this.page == 0
      ? this.texture
      : this.second_page_texture;
    if (texture.image) {
      renderer.copyTextureToTexture(
        this.final_position,
        texture,
        canvas_texture
      );
    }
  }
}
