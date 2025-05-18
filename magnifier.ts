import * as THREE from "three";

export enum pixelState {
  alive,
  dead,
  zombie
}

function VertexShaderPixel() {
  return `
    in vec2 uid;
    in vec3 color;
    uniform float time;
    float rand(vec2 co){
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }
    varying vec2 vUv;
    varying vec2 vUid;
    varying vec2 position_2d;
    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      vUv = uv;
      vUid = uid;
      vColor = color;
      position_2d = gl_Position.xy;
    }
  `;
}

function FragmentShaderDeadPixel() {
  return `
    uniform float time;
    uniform vec2 magnifier_center;
    uniform float screen_ratio;
    varying vec2 vUv;
    varying vec2 vUid;
    varying vec3 vColor;
    varying vec2 position_2d;
    float rand(vec2 co){
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }
    float sdRoundedX( in vec2 p, in float w, in float r )
    {
        p = abs(p);
        return length(p-min(p.x+p.y,w)*0.5) - r;
    }

    float sdParabola( in vec2 pos, in float wi, in float he )
    {
        pos.x = abs(pos.x);

        float ik = wi*wi/he;
        float p = ik*(he-pos.y-0.5*ik)/3.0;
        float q = pos.x*ik*ik*0.25;
        float h = q*q - p*p*p;
        
        float x;
        if( h>0.0 ) // 1 root
        {
            float r = sqrt(h);
            x = pow(q+r,1.0/3.0) + pow(abs(q-r),1.0/3.0)*sign(p);
        }
        else        // 3 roots
        {
            float r = sqrt(p);
            x = 2.0*r*cos(acos(q/(p*r))/3.0); // see https://www.shadertoy.com/view/WltSD7 for an implementation of cos(acos(x)/3) without trigonometrics
        }
        
        x = min(x,wi);
        
        return length(pos-vec2(x,he-x*x/ik)) * 
              sign(ik*(pos.y-he)+pos.x*pos.x);
    }

    vec3 Eye(in vec3 color, vec2 uv, vec2 position, float size) {
      vec3 out_color = color;
      if (sdRoundedX(uv-position, size, 0.022) < 0.0) {
        out_color = vec3(0.0, 0.0, 0.0);
      }
      return out_color;
    }
    vec3 Mouth(in vec3 color, vec2 uv, vec2 position) {
      vec3 out_color = color;
      if (sdParabola(uv-position, 0.08, 0.023) < 0.0) {
        out_color = vec3(0.0, 0.0, 0.0);
      }
      return out_color;
    }
    void main()
    {
      vec2 norm_position_2d = position_2d*vec2(screen_ratio, 1.0);
      vec2 norm_magnifier_center = magnifier_center*vec2(screen_ratio, 1.0);
      float distance_from_center = length(norm_position_2d-norm_magnifier_center);
      if (distance_from_center>0.50) {
        discard;
      }
      vec3 color = vColor;
      if (vUv.x<0.05 || vUv.x>0.95 || vUv.y<0.05 || vUv.y>0.95) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      } else {
        vec2 lookat = vec2(0.5);
        color = Eye(color, vUv, vec2(0.38, 0.6), 0.12);
        color = Eye(color, vUv, vec2(0.62, 0.6), 0.34 * max(0.6, rand(vUid)));
        color = Mouth(color, vUv, vec2(0.5, 0.25));
        gl_FragColor = vec4(color, 1.0);
      }
    }
  `;
}

function FragmentShaderAlivePixel() {
  return `
    uniform float time;
    uniform vec2 uid;
    uniform vec2 magnifier_center;
    uniform float screen_ratio;
    varying vec2 vUv;
    varying vec2 vUid;
    varying vec3 vColor;
    varying vec2 position_2d;
    float rand(vec2 co){
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }
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
      float eyeScale = rand(vUid)*0.04 - 0.02;
      float eyeSize = 0.18 + eyeScale;
      if (sdEllipse(uv-position, vec2(eyeSize, eyeSize - 0.03)) < 0.0) {
        out_color = vec3(0.0, 0.0, 0.0);
      }
      if (sdEllipse(uv-position, vec2(eyeSize - 0.02, eyeSize - 0.05)) < 0.0) {
        out_color = color*1.3;
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
      float distance_from_center = length(norm_position_2d-norm_magnifier_center);
      if (distance_from_center>0.50) {
        discard;
      }
      vec3 color = vColor;
      if (vUv.x<0.05 || vUv.x>0.95 || vUv.y<0.05 || vUv.y>0.95) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      } else {
        vec2 lookat = vec2(0.5);
        color = Eye(color, vUv, vec2(0.32, 0.6), lookat);
        color = Eye(color, vUv, vec2(0.68, 0.6), lookat);
        gl_FragColor = vec4(color, 1.0);
      }
    }
  `;
}

function FragmentShaderZombiePixel() {
  return `
    uniform float time;
    uniform vec2 uid;
    uniform vec2 magnifier_center;
    uniform float screen_ratio;
    varying vec2 vUv;
    varying vec2 vUid;
    varying vec3 vColor;
    varying vec2 position_2d;
    float rand(vec2 co){
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }
    float sdCircle( vec2 p, float r ) {
      return length(p) - r;
    }
    float sdOrientedBox( in vec2 p, in vec2 a, in vec2 b, float th )
    {
        float l = length(b-a);
        vec2  d = (b-a)/l;
        vec2  q = p-(a+b)*0.5;
              q = mat2(d.x,-d.y,d.y,d.x)*q;
              q = abs(q)-vec2(l*0.5,th);
        return length(max(q,0.0)) + min(max(q.x,q.y),0.0);    
    }
    float sdTriangleIsosceles( in vec2 p, in vec2 q )
    {
        p.x = abs(p.x);
        vec2 a = p - q*clamp( dot(p,q)/dot(q,q), 0.0, 1.0 );
        vec2 b = p - q*vec2( clamp( p.x/q.x, 0.0, 1.0 ), 1.0 );
        float s = -sign( q.y );
        vec2 d = min( vec2( dot(a,a), s*(p.x*q.y-p.y*q.x) ),
                      vec2( dot(b,b), s*(p.y-q.y)  ));
        return -sqrt(d.x)*sign(d.y);
    }
    float sdVesicaSegment( in vec2 p, in vec2 a, in vec2 b, float w )
    {
        // shape constants
        float r = 0.5*length(b-a);
        float d = 0.5*(r*r-w*w)/w;
        
        // center, orient and mirror
        vec2 v = (b-a)/r;
        vec2 c = (b+a)*0.5;
        vec2 q = 0.5*abs(mat2(v.y,v.x,-v.x,v.y)*(p-c));
        
        // feature selection (vertex or body)
        vec3 h = (r*q.x < d*(q.y-r)) ? vec3(0.0,r,0.0) : vec3(-d,0.0,d+w);
    
        // distance
        return length(q-h.xy) - h.z;
    }

    vec3 Eye(in vec3 color, vec2 uv, vec2 position, vec2 a, vec2 b, vec2 lookat) {
      vec3 out_color = color;
      float eyeScale = rand(vUid)*0.04 - 0.02;
      float eyeSize = 0.18 + eyeScale;
      if (sdVesicaSegment(uv-position, a, b, 0.1) < 0.0) {
        out_color = color*2.0;
      }
      if (sdVesicaSegment(uv-position, a, b, 0.08) < 0.0) {
        out_color = color*1.5;
      }
      
      return out_color;
    }
    vec3 Mouth(in vec3 color, vec2 uv, vec2 position) {
      vec3 out_color = color;
      if (sdOrientedBox(uv-position, vec2(0.1, 0.4), vec2(0.6, 0.4), 0.01) < 0.0) {
        out_color = vec3(0.0, 0.0, 0.0);
      }
      if (sdTriangleIsosceles( uv-position+vec2(-0.16, -0.2), vec2(0.06,0.20)) < 0.0) {
        out_color = color*0.2;
      }
      if (sdTriangleIsosceles( uv-position+vec2(-0.36, -0.2), vec2(0.06,0.20)) < 0.0) {
        out_color = color*0.2;
      }
      
      return out_color;
    }
    void main()
    {
      vec2 norm_position_2d = position_2d*vec2(screen_ratio, 1.0);
      vec2 norm_magnifier_center = magnifier_center*vec2(screen_ratio, 1.0);
      float distance_from_center = length(norm_position_2d-norm_magnifier_center);
      if (distance_from_center>0.50) {
        discard;
      }
      vec3 color = vColor;
      if (vUv.x<0.05 || vUv.x>0.95 || vUv.y<0.05 || vUv.y>0.95) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      } else {
        vec2 lookat = vec2(0.5);
        color = Eye(color, vUv, vec2(0.41, 0.57), vec2(-0.3, 0.25), vec2(0.02, -0.01), lookat);
        color = Eye(color, vUv, vec2(0.8, 0.8), vec2(-0.3, -0.25), vec2(0.02, 0.01), lookat);
        color = Mouth(color, vUv, vec2(0.1, 0.0));
        gl_FragColor = vec4(color, 1.0);
      }
    }
  `;
}

export class Magnifier {
  private scene: THREE.Scene;
  private magnifier_zombie_material: THREE.ShaderMaterial;
  private magnifier_alive_material: THREE.ShaderMaterial;
  private magnifier_dead_material: THREE.ShaderMaterial;
  private pixels: THREE.Mesh[][];
  private pixel_size: number;
  public pixel_count: number;
  private is_grabbed: boolean;
  public is_enabled: boolean;
  private initial_position_x: number;
  private initial_position_y: number;
  public constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.pixels = [];
    this.pixel_count = 7;
    this.pixel_size = 90;
    this.initial_position_x = 500;
    this.initial_position_y = 0;
    this.is_grabbed = false;
    this.is_enabled = false;
    this.magnifier_zombie_material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 1.0 },
        screen_ratio: { value: 1.0 },
        magnifier_center: { value: new THREE.Vector2() }
      },
      vertexShader: VertexShaderPixel(),
      fragmentShader: FragmentShaderZombiePixel(),
      transparent: true
    });
    this.magnifier_alive_material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 1.0 },
        screen_ratio: { value: 1.0 },
        magnifier_center: { value: new THREE.Vector2() }
      },
      vertexShader: VertexShaderPixel(),
      fragmentShader: FragmentShaderAlivePixel(),
      transparent: true
    });
    this.magnifier_dead_material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 1.0 },
        screen_ratio: { value: 1.0 },
        magnifier_center: { value: new THREE.Vector2() }
      },
      vertexShader: VertexShaderPixel(),
      fragmentShader: FragmentShaderDeadPixel(),
      transparent: true
    });
    for (let x=0; x<this.pixel_count; x++) {
      this.pixels[x] = [];
      for (let y=0; y<this.pixel_count; y++) {
        this.pixels[x][y] = new THREE.Mesh(
          new THREE.PlaneGeometry(this.pixel_size, this.pixel_size, 1, 1),
          this.magnifier_alive_material
        );
        this.pixels[x][y].geometry.setAttribute('uid', new THREE.Uint8BufferAttribute([x,y,x,y, x,y,x,y], 2));
        this.pixels[x][y].geometry.setAttribute('color', new THREE.Uint8BufferAttribute([0,0,0,0,0,0,0,0,0,0,0,0],3));
        this.pixels[x][y].position.x = 10000+x*this.pixel_size-this.pixel_size*Math.floor(this.pixel_count*0.5);
        this.pixels[x][y].position.y = 10000+y*this.pixel_size-this.pixel_size*Math.floor(this.pixel_count*0.5);
        this.pixels[x][y].position.z = -8;
        this.pixels[x][y].visible = false;
        this.scene.add(this.pixels[x][y]);
      }
    }
  }
  mapPixelStateToShaderMaterial(deadOrAlive: number, isZombie: number):THREE.ShaderMaterial{
    let state:pixelState;
    if(isZombie === 255)
      state = pixelState.zombie;
    else if(deadOrAlive === 255)
      state = pixelState.alive;
    else state = pixelState.dead;

    switch(state){
      case pixelState.alive:
        return this.magnifier_alive_material;
      case pixelState.dead:
        return this.magnifier_dead_material;
      case pixelState.zombie:
        return this.magnifier_zombie_material;
    }
  }
  Update(time: number) {
    this.magnifier_zombie_material.uniforms.time.value = 0.5+time*0.0001;
    this.magnifier_zombie_material.uniforms.screen_ratio.value = window.innerWidth/window.innerHeight;
    this.magnifier_dead_material.uniforms.time.value = 0.5+time*0.0001;
    this.magnifier_dead_material.uniforms.screen_ratio.value = window.innerWidth/window.innerHeight;
    this.magnifier_alive_material.uniforms.time.value = 0.5+time*0.0001;
    this.magnifier_alive_material.uniforms.screen_ratio.value = window.innerWidth/window.innerHeight;

     for (let x=0; x<this.pixel_count; x++) {
      for (let y=0; y<this.pixel_count; y++) {
        this.pixels[x][y].scale.x = Math.sin(Date.now()*0.01+(x*y)+x)*0.2+0.8;
        this.pixels[x][y].scale.y = Math.sin(Date.now()*0.01+(x*y)+x)*0.2+0.8;
      }
    }
  }
  SetPixels(pixelsContent: Uint8Array){
    for (let x=0; x<this.pixel_count; x++) {
      for (let y=0; y<this.pixel_count; y++) {
        this.pixels[x][y].material = this.mapPixelStateToShaderMaterial(pixelsContent[(x*this.pixel_count+y)*8+4], pixelsContent[(x*this.pixel_count+y)*8+6]);
        this.pixels[x][y].geometry.setAttribute('uid', new THREE.Uint8BufferAttribute([x,y,x,y, x,y,x,y], 2));
        let r = pixelsContent[(x*this.pixel_count+y)*8];
        let g = pixelsContent[(x*this.pixel_count+y)*8 + 1];
        let b = pixelsContent[(x*this.pixel_count+y)*8 + 2];
        this.pixels[x][y].geometry.setAttribute('color', new THREE.Uint8BufferAttribute([r,g,b,r,g,b,r,g,b,r,g,b], 3));
        this.pixels[x][y].position.x = 10000+x*this.pixel_size-this.pixel_size*Math.floor(this.pixel_count*0.5);
        this.pixels[x][y].position.y = 10000+y*this.pixel_size-this.pixel_size*Math.floor(this.pixel_count*0.5);
        this.pixels[x][y].position.z = -8;
        this.pixels[x][y].visible = true;//pixelsContent[(x*this.pixel_count+y)*8 + 7] === 255;
        this.scene.add(this.pixels[x][y]);
      }
    }
  }
  SetPosition(center_x: number, center_y:number) {
    let new_center_x = this.initial_position_x;
    let new_center_y = this.initial_position_y;
    if (!this.is_enabled) {
      new_center_x = 10000;
      new_center_y = 10000;
    } else if (this.is_grabbed) {
      new_center_x = center_x;
      new_center_y = center_y;
    } 
    this.magnifier_dead_material.uniforms.magnifier_center.value = new THREE.Vector2(new_center_x/(window.innerWidth*0.5), new_center_y/(window.innerHeight*0.5));
    this.magnifier_zombie_material.uniforms.magnifier_center.value = new THREE.Vector2(new_center_x/(window.innerWidth*0.5), new_center_y/(window.innerHeight*0.5));
    this.magnifier_alive_material.uniforms.magnifier_center.value = new THREE.Vector2(new_center_x/(window.innerWidth*0.5), new_center_y/(window.innerHeight*0.5));
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
    this.SetPosition(this.initial_position_x, this.initial_position_y);
  }
  SetVisible(visible:boolean){
    for (let x=0; x<this.pixel_count; x++) {
      for (let y=0; y<this.pixel_count; y++) {
        this.pixels[x][y].visible = visible;
      }
    }
  }
}