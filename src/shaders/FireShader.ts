import { Filter } from 'pixi.js';

const vertexShader = `
  attribute vec2 aVertexPosition;
  uniform mat3 projectionMatrix;
  varying vec2 vTextureCoord;

  uniform vec4 outputFrame;
  uniform vec4 inputSize;

  vec4 filterVertexPosition(void) {
    vec2 position = aVertexPosition * max(outputFrame.zw, vec2(0.)) + outputFrame.xy;
    return vec4((projectionMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);
  }

  vec2 filterTextureCoord(void) {
    return aVertexPosition * (outputFrame.zw * inputSize.zw);
  }

  void main(void) {
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
  }
`;

const fragmentShader = `
  precision mediump float;

  varying vec2 vTextureCoord;
  uniform float uTime;
  uniform vec2 uResolution;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amplitude * snoise(p);
      amplitude *= 0.5;
      p *= 2.0;
    }
    return value;
  }

  void main() {
    vec2 uv = vTextureCoord;
    vec2 p = vec2(uv.x - 0.5, (1.0 - uv.y) - 0.5);
    p.x *= uResolution.x / uResolution.y;

    float dist = length(vec2(p.x * 2.8, (p.y + 0.25) * 1.7));

    float time = uTime * 1.5;
    float flame = fbm(vec2(p.x * 4.0, p.y * 3.0 - time));

    float fireShape = 1.0 - smoothstep(0.0, 1.0, dist + flame * 0.4);
    fireShape *= smoothstep(-0.4, 0.1, -p.y);
    fireShape *= 1.0 - smoothstep(0.0, 0.5, p.y);

    float intensity = fireShape * (1.0 + flame * 0.3);
    vec3 color = mix(vec3(0.2, 0.0, 0.0), vec3(1.0, 0.3, 0.0), smoothstep(0.0, 0.4, intensity));
    color = mix(color, vec3(1.0, 0.9, 0.5), smoothstep(0.5, 1.0, intensity));

    float alpha = smoothstep(0.0, 0.1, fireShape);

    gl_FragColor = vec4(color * alpha, alpha);
  }
`;

export class FireShader extends Filter {
  private time = 0;

  constructor() {
    super(vertexShader, fragmentShader, {
      uTime: 0,
      uResolution: [800, 600],
    });
  }

  update(dt: number): void {
    this.time += dt;
    this.uniforms.uTime = this.time;
  }

  setResolution(width: number, height: number): void {
    this.uniforms.uResolution = [width, height];
  }

  reset(): void {
    this.time = 0;
    this.uniforms.uTime = 0;
  }
}

