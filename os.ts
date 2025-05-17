export class Os {
  width = 640;
  height = 480;
  canvas = new Uint8Array(0);

  mouse_x = 0;
  mouse_y = 0;
  mouse_down = false;

  time = 0;

  public Initialize() {
    const num_pixels = this.width * this.height;
    this.canvas = new Uint8Array(num_pixels * 4);
    for (let i = 0; i < num_pixels; ++i) {
      this.canvas[i * 4 + 0] = 255;
      this.canvas[i * 4 + 1] = Math.floor((255 * i) / num_pixels);
      this.canvas[i * 4 + 2] = 0;
      this.canvas[i * 4 + 3] = 255;
    }
  }

  public SetMousePosition(x: number, y: number, down: boolean) {
    this.mouse_x = x;
    this.mouse_y = y;
    this.mouse_down = down;
  }

  public Update(frame_duration: number) {
    this.time += frame_duration * 100;
    while (this.time > 255) this.time -= 255;

    const num_pixels = this.width * this.height;
    for (let i = 0; i < num_pixels; ++i) {
      this.canvas[i * 4 + 0] = Math.floor(this.time);
      this.canvas[i * 4 + 1] = Math.floor((255 * i) / num_pixels);
      this.canvas[i * 4 + 2] = Math.floor(this.time);
      this.canvas[i * 4 + 3] = 255;
    }
  }

  public GetBuffer() {
    return this.canvas;
  }
}
