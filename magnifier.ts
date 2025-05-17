import * as THREE from "three";

function PixelFace() {
  return `
    uniform float time;
    varying vec2 vUv;
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
      vec3 color = vec3(0.8, 0.4, 1.0);
      vec2 lookat = vec2(0.5);
      color = Eye(color, vUv, vec2(0.25, 0.6), lookat);
      color = Eye(color, vUv, vec2(0.75, 0.6), lookat);
      gl_FragColor = vec4(color, 1.0);
    }
  `;
}

export class Magnifier {
  private scene: THREE.Scene;
  private magnifier_material: THREE.ShaderMaterial;
  private pixels: THREE.Mesh[][];
  private pixel_size: number;
  private pixel_count: number;
  public constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.pixels = [];
    this.pixel_size = 16;
    this.pixel_count = 3;
    this.magnifier_material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 1.0 },
        resolution: { value: new THREE.Vector2() }
      },
      vertexShader: `varying vec2 vUv; void main() {gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); vUv = uv;}`,
      fragmentShader: PixelFace()
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
  Create() {
    
  }
  Update(time: number) {
    this.magnifier_material.uniforms.time.value = 0.5+time*0.0001;
  }
  SetPosition(center_x: number, center_y:number) {
    for (let x=0; x<this.pixel_count; x++) {
      for (let y=0; y<this.pixel_count; y++) {
        this.pixels[x][y].position.x = center_x+x*this.pixel_size-this.pixel_size*Math.floor(this.pixel_count*0.5);
        this.pixels[x][y].position.y = center_y+y*this.pixel_size-this.pixel_size*Math.floor(this.pixel_count*0.5);
      }
    }
  }
}