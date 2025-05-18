import * as THREE from "three";
import { OsIcon } from "./os_icon";
import { OsPanel } from "./os_panel";
import { OsPanelEmails } from "./os_panel_emails";
import { OsToggle } from "./os_toggle";

export class Os {
  canvas_texture;
  wallpaper_texture;
  wallpaper_texture_position = new THREE.Vector2(0, 0);

  lockscreen_texture;
  screen_is_locked = true;
  started_swiping_at_y = -1;

  started_dragging_at_x = -1;
  started_dragging_at_y = -1;

  icons = new Array<OsIcon>();
  panels = new Array<OsPanel>();
  toggles = new Array<OsToggle>(); // Settings panel only
  mouse_x = -1;
  mouse_y = -1;
  mouse_down = false;
  mouse_pressed = false;
  mouse_released = false;
  data;
  sound_swipe = document.getElementById("SoundSwipe")! as HTMLMediaElement;
  sound_icon_notes = document.getElementById(
    "SoundIconNotes"
  )! as HTMLMediaElement;
  sound_icon_clock = document.getElementById(
    "SoundIconClock"
  )! as HTMLMediaElement;
  sound_icon_weather = document.getElementById(
    "SoundIconWeather"
  )! as HTMLMediaElement;
  sound_icon_emails = document.getElementById(
    "SoundIconEmails"
  )! as HTMLMediaElement;
  sound_xorcize_move = document.getElementById(
    "SoundXorcizeMove"
  )! as HTMLMediaElement;
  sound_xorcize_success = document.getElementById(
    "SoundXorcizeSuccess"
  )! as HTMLMediaElement;

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

    const loader = new THREE.TextureLoader();
    this.wallpaper_texture = loader.load(`resources/texture/wallpaper.png`);
    this.wallpaper_texture.minFilter = THREE.LinearFilter;
    this.wallpaper_texture.generateMipmaps = false;
    this.lockscreen_texture = loader.load(`resources/texture/lockscreen.png`);
    this.lockscreen_texture.minFilter = THREE.LinearFilter;
    this.lockscreen_texture.generateMipmaps = false;

    this.icons.push(new OsIcon("notes", 100, 300, true, true));
    this.icons.push(new OsIcon("clock", 200, 300, true, true));
    this.icons.push(new OsIcon("weather", 400, 300, true, true));
    this.icons.push(new OsIcon("emails", 300, 300, true, true));
    this.icons.push(new OsIcon("settings", 100, 130, true, true));
    // Add more icons here
    this.icons.push(new OsIcon("lock", 450, 100, true, true));
    this.icons.push(new OsIcon("xorcize", 200, 130, false, false));

    this.panels.push(new OsPanel("notes", 20, 30, false));
    this.panels.push(new OsPanel("clock", 47, 31, false));
    this.panels.push(new OsPanel("weather", 278, 34, false));
    this.panels.push(new OsPanelEmails("emails_page_one", 43, 12, false));
    this.panels.push(new OsPanel("settings", 100, 70, false));

    this.toggles.push(new OsToggle(480, 350, false, false)); // Dark mode
    this.toggles.push(new OsToggle(480, 280, false, true)); // Wi-Fi
    this.toggles.push(new OsToggle(480, 210, true, false)); // Nothing
    this.toggles.push(new OsToggle(480, 150, false, false)); // Magnifier
    this.toggles.push(new OsToggle(480, 90, false, false)); // Advanced tools
  }

  public IsMouseOverTabletScreen(x: number, y: number) {
    // Centered
    let tablet_x = Math.floor((window.innerWidth - this.width) / 2);
    let tablet_y = Math.floor((window.innerHeight - this.height) / 2);
    return (
      x >= tablet_x &&
      x < tablet_x + this.width &&
      y >= tablet_y &&
      y < tablet_y + this.height
    );
  }
  public SetMouseMove(x: number, y: number) {
    // Centered
    let tablet_x = Math.floor((window.innerWidth - this.width) / 2);
    let tablet_y = Math.floor((window.innerHeight - this.height) / 2);
    if (this.IsMouseOverTabletScreen(x, y)) {
      this.mouse_x = x - tablet_x;
      this.mouse_y = this.height - (y - tablet_y);
    } else if (this.mouse_down) {
      // Going offscreen, keep data for a frame.
      this.mouse_released = true;
    } else {
      this.mouse_x = -1;
      this.mouse_y = -1;
    }
  }

  public SetMousePressed(x: number, y: number) {
    if (this.IsMouseOverTabletScreen(x, y)) {
      this.mouse_pressed = true;
      this.mouse_released = false;
      this.mouse_down = true;
    }
  }
  public SetMouseReleased(x: number, y: number) {
    if (this.IsMouseOverTabletScreen(x, y)) {
      this.mouse_pressed = false;
      this.mouse_released = true;
    } else {
      this.mouse_released = this.mouse_down;
    }
    this.mouse_down = false;
  }

  private CollectEvents() {
    if (this.panels[this.panels.length - 1].enabled) {
      for (let i = this.toggles.length - 1; i >= 0; --i) {
        if (i === 0 && this.toggles[i].on) {
          // Half killed already, do not toggle off
          continue;
        }
        if (this.toggles[i].CollectEvent(this.mouse_x, this.mouse_y)) {
          if (i == 0) {
            // Kill half pixels
          }
          return;
        }
      }
    }
    for (let i = this.panels.length - 1; i >= 0; --i) {
      if (this.panels[i].CollectEvent(this.mouse_x, this.mouse_y)) {
        return;
      }
    }
    for (let i = this.icons.length - 1; i >= 0; --i) {
      if (this.icons[i].CollectEvent(this.mouse_x, this.mouse_y)) {
        if (i < this.panels.length) {
          this.panels[i].enabled = true;
          if (i === 0) this.sound_icon_notes.play();
          if (i === 1) this.sound_icon_clock.play();
          if (i === 2) this.sound_icon_weather.play();
          if (i === 3) this.sound_icon_emails.play();
        } else if (i == this.icons.length - 2) {
          this.screen_is_locked = true;
        } else if (i == this.icons.length - 1) {
          // Player needs to drag the Xorcize app icon over all unalive pixels
          this.started_dragging_at_x = this.mouse_x;
          this.started_dragging_at_y = this.mouse_y;
          this.icons[i].overidden_position_offset.x =
            this.mouse_x - this.icons[i].final_position.x;
          this.icons[i].overidden_position_offset.y =
            this.mouse_y - this.icons[i].final_position.y;
        }
        return;
      }
    }
  }

  public Update(duration: number, disable_all_interactions: boolean) {
    this.icons[6].enabled = this.toggles[4].on;

    if (disable_all_interactions) {
      this.mouse_pressed = false;
      this.mouse_released = false;
      return;
    }

    if (this.mouse_pressed) {
      for (const icon of this.icons) {
        icon.Reset();
      }
    }

    if (this.screen_is_locked) {
      if (this.lockscreen_texture.image) {
        this.renderer.copyTextureToTexture(
          this.wallpaper_texture_position,
          this.lockscreen_texture,
          this.canvas_texture
        );
      }

      if (
        this.mouse_released &&
        this.started_swiping_at_y !== -1 &&
        this.started_swiping_at_y + 100 < this.mouse_y
      ) {
        this.started_swiping_at_y = -1;
        this.screen_is_locked = false;

        this.sound_swipe.play();
      } else if (this.mouse_pressed) {
        this.started_swiping_at_y = this.mouse_y;
      } else if (!this.mouse_down || this.mouse_y < this.started_swiping_at_y) {
        this.started_swiping_at_y = -1;
      }
    } else {
      if (this.mouse_pressed) {
        this.CollectEvents();
      }

      // Xorcize
      if (!this.mouse_down || !this.icons[6].enabled) {
        this.started_dragging_at_x = -1;
        this.started_dragging_at_y = -1;
      } else if (
        this.started_dragging_at_x !== -1 &&
        this.started_dragging_at_y !== -1 &&
        (this.icons[6].overidden_position.x !== this.mouse_x ||
          this.icons[6].overidden_position.y !== this.mouse_y)
      ) {
        this.icons[6].overidden_position.x = this.mouse_x;
        this.icons[6].overidden_position.y = this.mouse_y;
        // TODO: Check Xorcize position against dead pixels here
        //       and play sound in function
        if (THREE.MathUtils.randInt(0, 20) == 0) {
          this.sound_xorcize_success.currentTime = 0;
          this.sound_xorcize_success.play();
        } else {
          this.sound_xorcize_move.play();
        }
      }

      if (this.wallpaper_texture.image) {
        this.renderer.copyTextureToTexture(
          this.wallpaper_texture_position,
          this.wallpaper_texture,
          this.canvas_texture
        );
      }
      for (const icon of this.icons) {
        icon.Draw(duration, this.renderer, this.canvas_texture);
      }
      for (const panel of this.panels) {
        panel.Draw(duration, this.renderer, this.canvas_texture);
      }
      if (this.panels[this.panels.length - 1].enabled) {
        for (const toggle of this.toggles) {
          toggle.Draw(duration, this.renderer, this.canvas_texture);
        }
      }
    }

    this.mouse_pressed = false;
    this.mouse_released = false;
  }

  public MagnifierSettingIsOn() {
    return this.toggles[3].on;
  }
}
