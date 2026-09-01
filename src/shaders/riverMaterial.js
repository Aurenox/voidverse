import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";
import * as THREE from "three";
import { NOISE_GLSL } from "./noise.js";

// Scrolling-UV energy flow with a bright core and turbulent noise edges.
// uFlow controls scroll speed; driven faster during the audio-reactive peaks.
const RiverMaterial = shaderMaterial(
  {
    uTime: 0,
    uFlow: 1,
    uColorCore: new THREE.Color("#eafeff"),
    uColorEdge: new THREE.Color("#42deef"),
  },
  /* vertex */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* fragment */ `
    varying vec2 vUv;
    uniform float uTime;
    uniform float uFlow;
    uniform vec3 uColorCore;
    uniform vec3 uColorEdge;

    ${NOISE_GLSL}

    void main() {
      float scroll = vUv.x * 6.0 - uTime * uFlow * 1.6;
      float turbulence = fbm(vec3(scroll, vUv.y * 4.0, uTime * 0.2));
      float core = 1.0 - smoothstep(0.0, 0.5, abs(vUv.y - 0.5) + turbulence * 0.08);
      vec3 color = mix(uColorEdge, uColorCore, core);
      float alpha = clamp(core * 1.3 + turbulence * 0.15, 0.0, 1.0);
      gl_FragColor = vec4(color, alpha);
    }
  `
);

extend({ RiverMaterial });
export default RiverMaterial;
