import * as THREE from "three";

function VertexShaderPixel() {
  return `
    uniform float time;
    float rand(vec2 co){
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }
    varying vec2 vUv;
    varying vec2 position_2d;
    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      vUv = uv;
      position_2d = gl_Position.xy;
    }
  `;
}

function FragmentShaderPixel() {
  return `
    uniform float time;
    uniform vec2 magnifier_center;
    uniform float screen_ratio;
    varying vec2 vUv;
    varying vec2 position_2d;
    float sdCircle( vec2 p, float r ) {
      return length(p) - r;
    }
    float sdEllipse( in vec2 p, in vec2 ab )
    {
      p = abs(p); if( p.x > p.y ) {p=p.yx;ab=ab.yx;}
      float l = ab.y*ab.y - ab.x*ab.x;
      float m = ab.x*p.x/l;      float m2 = m*m; 
      float n = ab.y*p.y/l;      float n2 = n*n; 
      float c = (m2+n2-1.0)/3.0; float c3 = c*c*c;
      float q = c3 + m2*n2*2.0;
      float d = c3 + m2*n2;
      float g = m + m*n2;
      float co;
      if( d<0.0 )
      {
        float h = acos(q/c3)/3.0;
        float s = cos(h);
        float t = sin(h)*sqrt(3.0);
        float rx = sqrt( -c*(s + t + 2.0) + m2 );
        float ry = sqrt( -c*(s - t + 2.0) + m2 );
        co = (ry+sign(l)*rx+abs(g)/(rx*ry)- m)/2.0;
      }
      else
      {
        float h = 2.0*m*n*sqrt( d );
        float s = sign(q+h)*pow(abs(q+h), 1.0/3.0);
        float u = sign(q-h)*pow(abs(q-h), 1.0/3.0);
        float rx = -s - u - c*4.0 + 2.0*m2;
        float ry = (s - u)*sqrt(3.0);
        float rm = sqrt( rx*rx + ry*ry );
        co = (ry/sqrt(rm-rx)+2.0*g/rm-m)/2.0;
      }
      vec2 r = ab * vec2(co, sqrt(1.0-co*co));
      return length(r-p) * sign(p.y-r.y);
    }

    vec3 Eye(in vec3 color, vec2 uv, vec2 position, vec2 lookat) {
      vec3 out_color = color;
      if (sdEllipse(uv-position, vec2(0.2, 0.1)) < 0.0) {
        out_color = vec3(0.0, 0.0, 0.0);
      }
      if (sdEllipse(uv-position, vec2(0.18, 0.08)) < 0.0) {
        out_color = color*0.8;
      }
      vec2 direction = normalize(lookat-position);
      if (sdCircle(uv-(position+direction*0.07), 0.05) < 0.0) {
        out_color = vec3(0.0, 0.0, 0.0);
      }
      return out_color;
    }
    void main()
    {
      vec2 norm_position_2d = position_2d*vec2(screen_ratio, 1.0);
      vec2 norm_magnifier_center = magnifier_center*vec2(screen_ratio, 1.0);
      if (length(norm_position_2d-norm_magnifier_center)>0.2) {
        discard;
      }
      vec3 color = vec3(0.8, 0.4, 1.0);
      if (vUv.x<0.05 || vUv.x>0.95 || vUv.y<0.05 || vUv.y>0.95) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      } else {
        vec2 lookat = vec2(0.5);
        color = Eye(color, vUv, vec2(0.25, 0.6), lookat);
        color = Eye(color, vUv, vec2(0.75, 0.6), lookat);
        gl_FragColor = vec4(color, 1.0);
      }
    }
  `;
}

export class Magnifier {
  private scene: THREE.Scene;
  private magnifier_material: THREE.ShaderMaterial;
  private pixels: THREE.Mesh[][];
  private pixel_size: number;
  private pixel_count: number;
  private is_grabbed: boolean;
  public constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.pixels = [];
    this.pixel_size = 20;
    this.pixel_count = 9;
    this.is_grabbed = false;
    this.magnifier_material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 1.0 },
        screen_ratio: { value: 1.0 },
        magnifier_center: { value: new THREE.Vector2() }
      },
      vertexShader: VertexShaderPixel(),
      fragmentShader: FragmentShaderPixel(),
      transparent: true
    });
    for (let x=0; x<this.pixel_count; x++) {
      this.pixels[x] = [];
      for (let y=0; y<this.pixel_count; y++) {
        this.pixels[x][y] = new THREE.Mesh(
          new THREE.PlaneGeometry(this.pixel_size, this.pixel_size, 1, 1),
          this.magnifier_material
        );
        this.pixels[x][y].position.x = x*this.pixel_size-this.pixel_size*Math.floor(this.pixel_count*0.5);
        this.pixels[x][y].position.y = y*this.pixel_size-this.pixel_size*Math.floor(this.pixel_count*0.5);
        this.pixels[x][y].position.z = -8;
        this.scene.add(this.pixels[x][y]);
      }
    }
  }
  Update(time: number) {
    this.magnifier_material.uniforms.time.value = 0.5+time*0.0001;
    this.magnifier_material.uniforms.screen_ratio.value = window.innerWidth/window.innerHeight;
  }
  SetPosition(center_x: number, center_y:number) {
    let new_center_x = 500;
    let new_center_y = 0;
    if (this.is_grabbed) {
      new_center_x = center_x;
      new_center_y = center_y;
    } 
    this.magnifier_material.uniforms.magnifier_center.value = new THREE.Vector2(new_center_x/(window.innerWidth*0.5), new_center_y/(window.innerHeight*0.5));
    for (let x=0; x<this.pixel_count; x++) {
      for (let y=0; y<this.pixel_count; y++) {
        this.pixels[x][y].position.x = new_center_x+x*this.pixel_size-this.pixel_size*Math.floor(this.pixel_count*0.5);
        this.pixels[x][y].position.y = new_center_y+y*this.pixel_size-this.pixel_size*Math.floor(this.pixel_count*0.5);
      }
    }
  }
  Grab() {
    this.is_grabbed = true;
  }
  Release() {
    this.is_grabbed = false;
  }
}