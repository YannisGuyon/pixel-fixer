import * as THREE from "three";
import { OsIcon } from "./os_icon";
import { OsPanel } from "./os_panel";

export class Os {
  canvas_texture;
  icons = new Array<OsIcon>();
  panels = new Array<OsPanel>();
  mouse_x = -1;
  mouse_y = -1;
  mouse_down = false;
  mouse_pressed = false;
  mouse_released = false;
  data;

  public constructor(
    public width: number,
    public height: number,
    public renderer: THREE.WebGLRenderer
  ) {
    this.data = new Uint8Array(width * height * 4);
    for (let i = 0; i < width * height * 4; ++i) this.data[i] = 255;
    this.canvas_texture = new THREE.DataTexture(this.data, width, height);
    this.canvas_texture.minFilter = THREE.LinearFilter;
    this.canvas_texture.generateMipmaps = false;
    this.canvas_texture.needsUpdate = true;
    this.canvas_texture.flipY = true;

    this.icons.push(new OsIcon("notes", 100, 300, true));
    this.icons.push(new OsIcon("clock", 200, 300, true));
    this.icons.push(new OsIcon("emails", 300, 300, true));
    this.icons.push(new OsIcon("weather", 400, 300, true));

    this.panels.push(new OsPanel("notes", 20, 30, false));
    this.panels.push(new OsPanel("clock", 47, 31, false));
  }

  public SetMouse(x: number, y: number, down: boolean) {
    // Centered
    let tablet_x = Math.floor((window.innerWidth - this.width) / 2);
    let tablet_y = Math.floor((window.innerHeight - this.height) / 2);
    if (
      down &&
      x >= tablet_x &&
      x < tablet_x + this.width &&
      y >= tablet_y &&
      y < tablet_y + this.height
    ) {
      this.mouse_x = x - tablet_x;
      this.mouse_y = this.height - (y - tablet_y);
      this.mouse_pressed = !this.mouse_down && down;
      this.mouse_released = this.mouse_down && !down;
    } else {
      this.mouse_x = -1;
      this.mouse_y = -1;
      this.mouse_pressed = false;
      this.mouse_released = false;
    }
    this.mouse_down = down;
  }

  public Update(duration: number) {
    for (let i = 0; i < this.width * this.height * 4; ++i) this.data[i] = 255;
    this.canvas_texture.needsUpdate = true;
    if (this.mouse_pressed) {
      for (const icon of this.icons) {
        icon.Reset();
      }
    }

    if (this.mouse_pressed) {
      for (let i = this.panels.length - 1; i >= 0; --i) {
        if (this.panels[i].CollectEvent(this.mouse_x, this.mouse_y)) {
          break;
        }
      }
      for (let i = this.icons.length - 1; i >= 0; --i) {
        if (this.icons[i].CollectEvent(this.mouse_x, this.mouse_y)) {
          if (i < this.panels.length) {
            this.panels[i].enabled = true;
          }
          break;
        }
      }
    }

    for (const icon of this.icons) {
      icon.Draw(duration, this.renderer, this.canvas_texture);
    }
    for (const panel of this.panels) {
      panel.Draw(duration, this.renderer, this.canvas_texture);
    }

    this.mouse_pressed = false;
    this.mouse_released = false;
  }
}
