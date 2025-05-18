import * as THREE from "three";

export class MagnifierFisheyeTablet {
  mesh;
  public constructor(scene: THREE.Scene, texture_tablet: THREE.Texture,
    texture_sim:THREE.Texture) {
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(640, 480, 1, 1),
      new THREE.ShaderMaterial({
        uniforms: {
          magnifier_center: { value: new THREE.Vector2() },
          canvas: { value: texture_tablet },
          simulation: { value: texture_sim },
        },
        vertexShader: `
        varying vec2 vUv;
        void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            vUv = uv;
        }`,
        fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D canvas;
        uniform sampler2D simulation;
        uniform vec2 magnifier_center;


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
      
          vec3 Eye(in vec3 color, vec2 uv, vec2 position, vec2 lookat, vec2 randSeed) {
            vec3 out_color = color;
            float eyeScale = rand(randSeed)*0.04 - 0.02;
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

        void main() {
            vec2 myUv = vec2(vUv.x*640./480.,vUv.y);
            vec2 diff = myUv-magnifier_center;
            if (length(diff) < 0.3) {
                vec2 newUv = magnifier_center + diff *0.02;
                vec2 newNewUv = vec2(newUv.x/640.*480., newUv.y);

                ivec4 simulation_result = ivec4(texture2D(simulation, newNewUv)*255.0);
                int is_alive = simulation_result.r == 255 ? 1 : 0;
                int is_dead = simulation_result.r < 255 ? 1 : 0;
                int is_zombie = simulation_result.b == 255 ? 1 : 0;

                // gl_FragColor = vec4(mod(newNewUv.x*640.0,1.0), mod(newNewUv.y*480.0,1.0), 0, 1);
                // gl_FragColor = texture2D(simulation, newNewUv);
                // gl_FragColor = texture2D(canvas, newNewUv);

                vec2 new_vUv = vec2(mod(newNewUv.x*640.0,1.0), mod(newNewUv.y*480.0,1.0));
                vec2 newNew_vUv = vec2(new_vUv.x/640.0, new_vUv.y/480.0);
                vec2 cbienbon = vec2(floor(newNewUv.x*640.0)/640.0, floor(newNewUv.y*480.0)/480.0);
                // gl_FragColor = vec4(floor(newNewUv.x*640.0)/640.0, floor(newNewUv.y*480.0)/480.0, 0, 1);
        vec2 lookat = vec2(0.5);
        vec3 color = texture2D(canvas, newNewUv).xyz;
        color = Eye(color, new_vUv, vec2(0.32, 0.6), lookat, cbienbon);
        color = Eye(color, new_vUv, vec2(0.68, 0.6), lookat, cbienbon);
        gl_FragColor = vec4(color, 1.0);
            }
            else {
                discard;
            }
        }`,
      })
    );
    this.mesh.position.x = 0;
    this.mesh.position.y = 0;
    this.mesh.position.z = -8.4;
    scene.add(this.mesh);
  }

  public SetVisible(visible: boolean) {
    this.mesh.visible = visible;
  }

  SetPosition(center_x: number, center_y: number) {
    this.mesh.material.uniforms.magnifier_center.value.x =
      (center_x * 640) / 480;
    this.mesh.material.uniforms.magnifier_center.value.y = center_y;
  }
}
