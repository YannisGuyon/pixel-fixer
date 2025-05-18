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
      
          vec3 DeadEye(in vec3 color, vec2 uv, vec2 position, float size) {
            vec3 out_color = color;
            if (sdRoundedX(uv-position, size, 0.022) < 0.0) {
              out_color = vec3(1.0, 1.0, 1.0);
            }
            return out_color;
          }
          vec3 DeadMouth(in vec3 color, vec2 uv, vec2 position) {
            vec3 out_color = color;
            if (sdParabola(uv-position, 0.08, 0.023) < 0.0) {
              out_color = vec3(1.0, 1.0, 1.0);
            }
            return out_color;
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
      
          vec3 ZombieEye(in vec3 color, vec2 uv, vec2 position, vec2 a, vec2 b, vec2 lookat, vec2 randSeed) {
            vec3 out_color = color;
            float eyeScale = rand(randSeed)*0.04 - 0.02;
            float eyeSize = 0.18 + eyeScale;
            if (sdVesicaSegment(uv-position, a, b, 0.1) < 0.0) {
              out_color = color*2.0;
            }
            if (sdVesicaSegment(uv-position, a, b, 0.08) < 0.0) {
              out_color = vec3(0.0, 0.0, 0.0);
            }
            
            return out_color;
          }
          vec3 ZombieMouth(in vec3 color, vec2 uv, vec2 position) {
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



        void main() {
            vec2 myUv = vec2(vUv.x*640./480.,vUv.y);
            vec2 diff = myUv-magnifier_center;
            if (length(diff) < 0.3) {
                vec2 newUv = magnifier_center + diff *0.02;
                vec2 newNewUv = vec2(newUv.x/640.*480., newUv.y);

                ivec4 simulation_result = ivec4(texture2D(simulation, newNewUv)*255.0);

                // gl_FragColor = vec4(mod(newNewUv.x*640.0,1.0), mod(newNewUv.y*480.0,1.0), 0, 1);
                // gl_FragColor = texture2D(simulation, newNewUv);
                // gl_FragColor = texture2D(canvas, newNewUv);

                vec2 new_vUv = vec2(mod(newNewUv.x*640.0,1.0), mod(newNewUv.y*480.0,1.0));
                vec2 newNew_vUv = vec2(new_vUv.x/640.0, new_vUv.y/480.0);
                vec2 cbienbon = vec2(floor(newNewUv.x*640.0)/640.0, floor(newNewUv.y*480.0)/480.0);
                // gl_FragColor = vec4(floor(newNewUv.x*640.0)/640.0, floor(newNewUv.y*480.0)/480.0, 0, 1);
        
      if (new_vUv.x<0.05 || new_vUv.x>0.95 || new_vUv.y<0.05 || new_vUv.y>0.95) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      } else {
                vec2 lookat = vec2(0.5);
        vec3 color = texture2D(canvas, newNewUv).xyz;
        if (simulation_result.r == 255) {
            color = vec3(max(0.2,color.x), max(0.2,color.y), max(0.2,color.z));
            color = Eye(color, new_vUv, vec2(0.32, 0.6), lookat, cbienbon);
            color = Eye(color, new_vUv, vec2(0.68, 0.6), lookat, cbienbon);
        }else
        if (simulation_result.b == 255) {
            color = vec3(0.3, 0.7, 0.2);
            color = ZombieEye(color, new_vUv, vec2(0.41, 0.57), vec2(-0.3, 0.25), vec2(0.02, -0.01), lookat, cbienbon);
            color = ZombieEye(color, new_vUv, vec2(0.8, 0.8), vec2(-0.3, -0.25), vec2(0.02, 0.01), lookat, cbienbon);
            color = ZombieMouth(color, new_vUv, vec2(0.1, 0.0));
        }else
        if (simulation_result.r < 255) {
            color = vec3(0.1, 0.1, 0.1);
            color = DeadEye(color, new_vUv, vec2(0.38, 0.6), 0.12);
            color = DeadEye(color, new_vUv, vec2(0.62, 0.6), 0.34 * max(0.6, rand(cbienbon)));
            color = DeadMouth(color, new_vUv, vec2(0.5, 0.25));
        }
        gl_FragColor = vec4(color, 1.0);}
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
