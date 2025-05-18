import * as THREE from "three";

function loadShader(gl:WebGLRenderingContext|WebGL2RenderingContext, type:GLenum, source:string) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader!, source);
  gl.compileShader(shader!);
  if (!gl.getShaderParameter(shader!, gl.COMPILE_STATUS)) {
    alert(
      `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader!)}`,
    );
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export class Simulation {
  private gl: WebGLRenderingContext|WebGL2RenderingContext;
  private program_simulate: WebGLProgram;
  private program_kill_pixels: WebGLProgram;
  private program_heal_pixels: WebGLProgram;
  private program_darkmode: WebGLProgram;
  private framebuffer: WebGLFramebuffer;
  private texture_input: WebGLTexture;
  private texture_framebuffer: WebGLTexture;
  private texture_width: number;
  private texture_height: number;
  private texture_three_js: THREE.Texture;

  private retrieved_buffer;
  private num_pixels;
  private num_alive_pixels;

  public constructor(renderer: THREE.WebGLRenderer, width: number, height: number) {
    this.gl = renderer.getContext();
    this.texture_input = this.gl.createTexture();
    this.texture_framebuffer = this.gl.createTexture();
    this.texture_width = width;
    this.texture_height = height;
    {
      const level = 0;
      const internalFormat = this.gl.RGBA8;
      const border = 0;
      const format = this.gl.RGBA;
      const type = this.gl.UNSIGNED_BYTE;
      let data = new Uint8Array(this.texture_width*this.texture_height*4);
      for(let i=0; i<this.texture_width*this.texture_height; i++) {
        data[i*4+0] = 255;
        data[i*4+1] = 255;
        data[i*4+2] = 0;
        data[i*4+3] = 255;
      }
      const starting_dead_pixel_x = 590;
      const starting_dead_pixel_y = 402;
      data[(starting_dead_pixel_y*this.texture_width+starting_dead_pixel_x)*4] = 0;
      data[(starting_dead_pixel_y*this.texture_width+starting_dead_pixel_x+1)*4] = 0;
      data[((starting_dead_pixel_y+1)*this.texture_width+starting_dead_pixel_x)*4] = 0;
      data[((starting_dead_pixel_y+1)*this.texture_width+starting_dead_pixel_x+1)*4] = 0;
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture_input);
      this.gl.texImage2D(this.gl.TEXTURE_2D, level, internalFormat,
        this.texture_width, this.texture_height, border, format, type, data);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture_framebuffer);
      this.gl.texImage2D(this.gl.TEXTURE_2D, level, internalFormat,
        this.texture_width, this.texture_height, border, format, type, data);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    }
    this.framebuffer = this.gl.createFramebuffer();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    const attachmentPoint = this.gl.COLOR_ATTACHMENT0;
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, attachmentPoint, this.gl.TEXTURE_2D, this.texture_framebuffer, 0);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    
    const vertex_shader_source = `#version 300 es
      out vec2 vUv;
      void main() {
        if (gl_VertexID == 0) {
          gl_Position = vec4(1.0, 1.0, 0.0, 1.0);
          vUv = vec2(1.0, 1.0);
        } else if (gl_VertexID == 1) {
          gl_Position = vec4(-1.0, 1.0, 0.0, 1.0);
          vUv = vec2(0.0, 1.0);
        } else if (gl_VertexID == 2) {
          gl_Position = vec4(1.0, -1.0, 0.0, 1.0);
          vUv = vec2(1.0, 0.0);
        } else {
          gl_Position = vec4(-1.0, -1.0, 0.0, 1.0);
          vUv = vec2(0.0, 0.0);
        }
      }
    `;

    // Red channel : Alive (255) | Dieing (127) | Dead (0)
    // Green channel : Timestamp
    // Blue channel : Zombie (255)
    const fragment_shader_simulation_source = `#version 300 es
      precision highp float;
      in vec2 vUv;
      out vec4 out_color;
		  uniform sampler2D simulation;
		  uniform vec2 simulation_size;
		  uniform float zombification_speed;
      void main() {
        vec2 pixel_size = vec2(1.0/simulation_size.x, 1.0/simulation_size.y);
        
        ivec4 data00 = ivec4(texture(simulation, vUv+vec2(-pixel_size.x, -pixel_size.y))*255.0);
        ivec4 data01 = ivec4(texture(simulation, vUv+vec2(0.0, -pixel_size.y))*255.0);
        ivec4 data02 = ivec4(texture(simulation, vUv+vec2(pixel_size.x, -pixel_size.y))*255.0);

        ivec4 data10 = ivec4(texture(simulation, vUv+vec2(-pixel_size.x, 0.0))*255.0);
        ivec4 data11 = ivec4(texture(simulation, vUv)*255.0);
        ivec4 data12 = ivec4(texture(simulation, vUv+vec2(pixel_size.x, 0.0))*255.0);

        ivec4 data20 = ivec4(texture(simulation, vUv+vec2(-pixel_size.x, pixel_size.y))*255.0);
        ivec4 data21 = ivec4(texture(simulation, vUv+vec2(0.0, pixel_size.y))*255.0);
        ivec4 data22 = ivec4(texture(simulation, vUv+vec2(pixel_size.x, pixel_size.y))*255.0);

        if (data11.r == 255) { // Alive
          int zombie_count = data00.b==255?1:0;
          zombie_count += data01.b==255?1:0;
          zombie_count += data02.b==255?1:0;
          zombie_count += data10.b==255?1:0;
          zombie_count += data12.b==255?1:0;
          zombie_count += data20.b==255?1:0;
          zombie_count += data21.b==255?1:0;
          zombie_count += data22.b==255?1:0;
          if (zombie_count > 0) {
            data11.r = 0;
            data11.g = 255;
          } else {
            data11.g -= zombie_count;
          }
        } else if (data11.r != 0 && data11.r < 255) { // Dieing
          data11.r -= 1;
        } else if (data11.r == 0) { // Dead
          int timer = data11.g - int(zombification_speed*255.0);
          if (timer <= 0) {
            data11.b = 255;
          } else {
            data11.g -= int(zombification_speed*255.0);
          }
        }
        out_color = vec4(data11)/255.0;
      }
    `;

    const fragment_shader_kill_pixels_source = `#version 300 es
      precision highp float;
      in vec2 vUv;
      out vec4 out_color;
		  uniform sampler2D simulation;
		  uniform vec2 position_click;
		  uniform float simulation_screen_ratio;
      void main() {
        ivec4 pixel = ivec4(texture(simulation, vUv)*255.0);
        if (length(vUv*vec2(simulation_screen_ratio, 1.0)-position_click*vec2(simulation_screen_ratio, 1.0))<0.02) {
          pixel = ivec4(254, 255, 0, 255); // Dieing
        }
        out_color = vec4(pixel)/255.0;
      }
    `;

    const fragment_shader_heal_pixels_source = `#version 300 es
      precision highp float;
      in vec2 vUv;
      out vec4 out_color;
		  uniform sampler2D simulation;
		  uniform vec2 position_click;
		  uniform vec2 icon_size;
		  uniform float simulation_screen_ratio;
      void main() {
        ivec4 pixel = ivec4(texture(simulation, vUv)*255.0);
        vec2 d = abs(vUv-position_click-vec2(0.05, 0.07))-icon_size;
        if (length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) < 0.0) {
          pixel = ivec4(255, 255, 127, 255); // Alive
        }
        out_color = vec4(pixel)/255.0;
      }
    `;

    const fragment_shader_darkmode_source = `#version 300 es
      precision highp float;
      vec2 n22 (vec2 p) {
        vec3 a = fract(p.xyx * vec3(123.34, 234.34, 345.65));
        a += dot(a, a + 34.45);
        return fract(vec2(a.x * a.y, a.y * a.z));
      }
      vec2 get_gradient(vec2 pos) {
        float twoPi = 6.283185;
        float angle = n22(pos).x * twoPi;
        return vec2(cos(angle), sin(angle));
      }
      float perlin_noise(vec2 uv, float cells_count) {
        vec2 pos_in_grid = uv * cells_count;
        vec2 cell_pos_in_grid =  floor(pos_in_grid);
        vec2 local_pos_in_cell = (pos_in_grid - cell_pos_in_grid);
        vec2 blend = local_pos_in_cell * local_pos_in_cell * (3.0f - 2.0f * local_pos_in_cell);
        
        vec2 left_top = cell_pos_in_grid + vec2(0, 1);
        vec2 right_top = cell_pos_in_grid + vec2(1, 1);
        vec2 left_bottom = cell_pos_in_grid + vec2(0, 0);
        vec2 right_bottom = cell_pos_in_grid + vec2(1, 0);
        
        float left_top_dot = dot(pos_in_grid - left_top, get_gradient(left_top));
        float right_top_dot = dot(pos_in_grid - right_top,  get_gradient(right_top));
        float left_bottom_dot = dot(pos_in_grid - left_bottom, get_gradient(left_bottom));
        float right_bottom_dot = dot(pos_in_grid - right_bottom, get_gradient(right_bottom));
        
        float noise_value = mix(mix(left_bottom_dot, right_bottom_dot, blend.x), 
          mix(left_top_dot, right_top_dot, blend.x), 
          blend.y);
        return (0.5 + 0.5 * (noise_value / 0.7));
      }
      in vec2 vUv;
      out vec4 out_color;
      void main() {
        out_color = vec4(min(perlin_noise(vUv, 10.0)*1.5+0.15, 1.0), 1.0, 0.0, 1.0);
      }
    `;

    const vertex_shader = loadShader(this.gl, this.gl.VERTEX_SHADER, vertex_shader_source);
    const fragment_shader_simulate = loadShader(this.gl, this.gl.FRAGMENT_SHADER, fragment_shader_simulation_source);
    const fragment_shader_kill_pixels = loadShader(this.gl, this.gl.FRAGMENT_SHADER, fragment_shader_kill_pixels_source);
    const fragment_shader_heal_pixels = loadShader(this.gl, this.gl.FRAGMENT_SHADER, fragment_shader_heal_pixels_source);
    const fragment_shader_darkmode = loadShader(this.gl, this.gl.FRAGMENT_SHADER, fragment_shader_darkmode_source);

    this.program_simulate = this.gl.createProgram();
    this.gl.attachShader(this.program_simulate, vertex_shader!);
    this.gl.attachShader(this.program_simulate, fragment_shader_simulate!);
    this.gl.linkProgram(this.program_simulate);

    this.program_kill_pixels = this.gl.createProgram();
    this.gl.attachShader(this.program_kill_pixels, vertex_shader!);
    this.gl.attachShader(this.program_kill_pixels, fragment_shader_kill_pixels!);
    this.gl.linkProgram(this.program_kill_pixels);

    this.program_heal_pixels = this.gl.createProgram();
    this.gl.attachShader(this.program_heal_pixels, vertex_shader!);
    this.gl.attachShader(this.program_heal_pixels, fragment_shader_heal_pixels!);
    this.gl.linkProgram(this.program_heal_pixels);

    this.program_darkmode = this.gl.createProgram();
    this.gl.attachShader(this.program_darkmode, vertex_shader!);
    this.gl.attachShader(this.program_darkmode, fragment_shader_darkmode!);
    this.gl.linkProgram(this.program_darkmode);

    const forceTextureInitialization = function() {
      const material = new THREE.MeshBasicMaterial();
      const geometry = new THREE.PlaneGeometry();
      const scene = new THREE.Scene();
      scene.add(new THREE.Mesh(geometry, material));
      const camera = new THREE.OrthographicCamera(
        Math.floor(width / -2),
        Math.floor(width / -2) + width,
        Math.floor(height / 2),
        Math.floor(height / 2) - height,
        0,
        10
      );
      return function forceTextureInitialization(texture: THREE.Texture) {
        material.map = texture;
        renderer.render(scene, camera);
      };
    }();
    this.texture_three_js = new THREE.Texture();
    forceTextureInitialization(this.texture_three_js);
    let texProps = renderer.properties.get(this.texture_three_js);
    texProps.__webglTexture = this.texture_input;

    this.num_pixels = this.texture_width * this.texture_height;
    this.num_alive_pixels = this.num_pixels - 1;
    this.retrieved_buffer = new Uint8Array(this.num_pixels * 4);
  }

  Simulate(zombification_speed: number) {
    const viewport = this.gl.getParameter(this.gl.VIEWPORT);
    const binded_framebuffer = this.gl.getParameter(this.gl.FRAMEBUFFER_BINDING);
    const binded_texture = this.gl.getParameter(this.gl.TEXTURE_BINDING_2D);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture_input);
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.viewport(0, 0, this.texture_width, this.texture_height);
    this.gl.useProgram(this.program_simulate);
    this.gl.uniform2f(this.gl.getUniformLocation(this.program_simulate, "simulation_size"), this.texture_width, this.texture_height);
    this.gl.uniform1f(this.gl.getUniformLocation(this.program_simulate, "zombification_speed"), zombification_speed);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    this.gl.copyTexImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA8, 0, 0, this.texture_width, this.texture_height, 0);
    this.gl.readPixels(0, 0, this.texture_width, this.texture_height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.retrieved_buffer);
    this.gl.bindTexture(this.gl.TEXTURE_2D, binded_texture);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, binded_framebuffer);
    this.gl.viewport(viewport[0], viewport[1], viewport[2], viewport[3]);

    this.num_alive_pixels = 0;
    for (let i = 0; i < this.num_pixels; ++i) {
      if (this.retrieved_buffer[i * 4] === 255) ++this.num_alive_pixels;
    }
  }

  PressScreen(x:number, y:number) {
    const viewport = this.gl.getParameter(this.gl.VIEWPORT);
    const binded_framebuffer = this.gl.getParameter(this.gl.FRAMEBUFFER_BINDING);
    const binded_texture = this.gl.getParameter(this.gl.TEXTURE_BINDING_2D);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture_input);
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.viewport(0, 0, this.texture_width, this.texture_height);
    this.gl.useProgram(this.program_kill_pixels);
    this.gl.uniform2f(this.gl.getUniformLocation(this.program_kill_pixels, "position_click"), x, y);
    this.gl.uniform1f(this.gl.getUniformLocation(this.program_kill_pixels, "simulation_screen_ratio"), this.texture_width/this.texture_height);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    this.gl.copyTexImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA8, 0, 0, this.texture_width, this.texture_height, 0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, binded_texture);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, binded_framebuffer);
    this.gl.viewport(viewport[0], viewport[1], viewport[2], viewport[3]);
  }

  HealPixelsAtPosition(x: number, y: number, width: number, height: number) {
    const viewport = this.gl.getParameter(this.gl.VIEWPORT);
    const binded_framebuffer = this.gl.getParameter(this.gl.FRAMEBUFFER_BINDING);
    const binded_texture = this.gl.getParameter(this.gl.TEXTURE_BINDING_2D);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture_input);
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.viewport(0, 0, this.texture_width, this.texture_height);
    this.gl.useProgram(this.program_heal_pixels);
    this.gl.uniform2f(this.gl.getUniformLocation(this.program_heal_pixels, "position_click"), x/this.texture_width, y/this.texture_height);
    this.gl.uniform2f(this.gl.getUniformLocation(this.program_heal_pixels, "icon_size"), 1.0/this.texture_width*width*0.5, 1.0/this.texture_width*height*0.7);
    this.gl.uniform1f(this.gl.getUniformLocation(this.program_heal_pixels, "simulation_screen_ratio"), this.texture_width/this.texture_height);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    this.gl.copyTexImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA8, 0, 0, this.texture_width, this.texture_height, 0);
    this.gl.readPixels(0, 0, this.texture_width, this.texture_height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.retrieved_buffer);
    this.gl.bindTexture(this.gl.TEXTURE_2D, binded_texture);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, binded_framebuffer);
    this.gl.viewport(viewport[0], viewport[1], viewport[2], viewport[3]);

    const previous_num_alive_pixels = this.num_alive_pixels;
    this.num_alive_pixels = 0;
    for (let i = 0; i < this.num_pixels; ++i) {
      if (this.retrieved_buffer[i * 4] === 255) ++this.num_alive_pixels;
    }
    return this.num_alive_pixels-previous_num_alive_pixels;
  }

  InstantlyKillMostPixels() {
    const viewport = this.gl.getParameter(this.gl.VIEWPORT);
    const binded_framebuffer = this.gl.getParameter(this.gl.FRAMEBUFFER_BINDING);
    const binded_texture = this.gl.getParameter(this.gl.TEXTURE_BINDING_2D);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture_input);
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.viewport(0, 0, this.texture_width, this.texture_height);
    this.gl.useProgram(this.program_darkmode);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    this.gl.copyTexImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA8, 0, 0, this.texture_width, this.texture_height, 0);
    this.gl.readPixels(0, 0, this.texture_width, this.texture_height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.retrieved_buffer);
    this.gl.bindTexture(this.gl.TEXTURE_2D, binded_texture);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, binded_framebuffer);
    this.gl.viewport(viewport[0], viewport[1], viewport[2], viewport[3]);
  }

  GetTexture() {
    return this.texture_three_js;
  }

  GetCPUTexture() {
    return this.retrieved_buffer;
  }

  AreAllPixelsAlive() {
    return this.num_alive_pixels === this.num_pixels;
  }

  GetNumDeadPixels() {
    return this.num_pixels - this.num_alive_pixels;
  }

  GetDeadPixelRatio() {
    return this.GetNumDeadPixels() / this.num_pixels;
  }

  AreMostPixelsDead() {
    return this.num_alive_pixels < this.num_pixels * 0.1;
  }
}
