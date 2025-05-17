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
  private positionBuffer: WebGLBuffer;
  private program: WebGLProgram;
  private framebuffer_1: WebGLFramebuffer;
  private framebuffer_2: WebGLFramebuffer;
  private texture_1: WebGLTexture;
  private texture_2: WebGLTexture;
  private texture_width: number;
  private texture_height: number;
  private texture_three_1: THREE.Texture;
  private texture_three_2: THREE.Texture;
  private current_frame: number;
  public constructor(renderer: THREE.WebGLRenderer, width: number, height: number) {
    this.gl = renderer.getContext();
    this.current_frame = 0;
    this.texture_1 = this.gl.createTexture();
    this.texture_2 = this.gl.createTexture();
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
        data[i*4+0] = 0;
        data[i*4+1] = 255;
        data[i*4+2] = 0;
        data[i*4+3] = 255;
      }
      data[(50*this.texture_width+320)*4] = 255;
      data[(50*this.texture_width+320)*4+1] = 0;
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture_1);
      this.gl.texImage2D(this.gl.TEXTURE_2D, level, internalFormat,
        this.texture_width, this.texture_height, border, format, type, data);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture_2);
      this.gl.texImage2D(this.gl.TEXTURE_2D, level, internalFormat,
        this.texture_width, this.texture_height, border, format, type, data);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    }
    this.framebuffer_1 = this.gl.createFramebuffer();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer_1);
    const attachmentPoint = this.gl.COLOR_ATTACHMENT0;
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, attachmentPoint, this.gl.TEXTURE_2D, this.texture_1, 0);
    this.framebuffer_2 = this.gl.createFramebuffer();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer_2);
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, attachmentPoint, this.gl.TEXTURE_2D, this.texture_2, 0);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    
    const vsSource = `
      attribute vec4 in_pos;
      varying vec2 vUv;
      void main() {
        gl_Position = in_pos;
        vUv = in_pos.xy*0.5+vec2(0.5);
      }
    `;

    const fsSource = `
      precision highp float;
      varying vec2 vUv;
		  uniform sampler2D current_state;
		  uniform vec2 current_state_size;
      void main() {
        vec2 pixel_size = vec2(1.0/current_state_size.x, 1.0/current_state_size.y);
        vec4 data00 = texture2D(current_state, vUv+vec2(-pixel_size.x, -pixel_size.y));
        vec4 data10 = texture2D(current_state, vUv+vec2(pixel_size.x, -pixel_size.y));
        vec4 data01 = texture2D(current_state, vUv+vec2(-pixel_size.x, pixel_size.y));
        vec4 data11 = texture2D(current_state, vUv+vec2(pixel_size.x, pixel_size.y));
        vec4 data = texture2D(current_state, vUv);
        if (data00.r > 0.0 || data10.r > 0.0 || data01.r > 0.0 || data11.r > 0.0) {
          data.r = 1.0;
          data.g = 0.0;
        }
        gl_FragColor = data;
      }
    `;
    const vertexShader = loadShader(this.gl, this.gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(this.gl, this.gl.FRAGMENT_SHADER, fsSource);
    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, vertexShader!);
    this.gl.attachShader(this.program, fragmentShader!);
    this.gl.linkProgram(this.program);

    this.positionBuffer = this.gl.createBuffer();
    const positions = [1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0];
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

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
    this.texture_three_1 = new THREE.Texture();
    forceTextureInitialization(this.texture_three_1);
    let texProps = renderer.properties.get(this.texture_three_1);
    texProps.__webglTexture = this.texture_1;
    this.texture_three_2 = new THREE.Texture();
    forceTextureInitialization(this.texture_three_2);
    texProps = renderer.properties.get(this.texture_three_2);
    texProps.__webglTexture = this.texture_2;
  }
  Simulate() {
    const viewport = this.gl.getParameter(this.gl.VIEWPORT);
    const binded_framebuffer = this.gl.getParameter(this.gl.FRAMEBUFFER_BINDING);
    const binded_texture = this.gl.getParameter(this.gl.TEXTURE_BINDING_2D);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.current_frame===0?this.framebuffer_2:this.framebuffer_1);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.current_frame===0?this.texture_1:this.texture_2);
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.viewport(0, 0, this.texture_width, this.texture_height);
    this.gl.useProgram(this.program);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.enableVertexAttribArray(this.gl.getAttribLocation(this.program, "in_pos"));
    this.gl.vertexAttribPointer(this.gl.getAttribLocation(this.program, "in_pos"), 2, this.gl.FLOAT, false, 0, 0);
    this.gl.uniform2f(this.gl.getUniformLocation(this.program, "current_state_size"), this.texture_width, this.texture_height);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
    this.gl.bindTexture(this.gl.TEXTURE_2D, binded_texture);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, binded_framebuffer);
    this.current_frame = this.current_frame===0?1:0;
    this.gl.viewport(viewport[0], viewport[1], viewport[2], viewport[3]);
	}
  GetTexture() {
    return this.current_frame===0 ? this.texture_three_1 : this.texture_three_2;
  }
}
