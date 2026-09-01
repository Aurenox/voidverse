import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";
import * as THREE from "three";
import { NOISE_GLSL } from "./noise.js";

// A displaced, fresnel-lit energy shell. Vertices ripple with fbm noise,
// the surface bands scroll over time, and uIntensity is driven live by
// the audio-reactive hook so the portal visibly "breathes" with sound.
const PortalMaterial = shaderMaterial(
  {
    uTime: 0,
    uIntensity: 1,
    uColorA: new THREE.Color("#5deaff"),
    uColorB: new THREE.Color("#a17fff"),
  },
  /* vertex */ `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float uTime;

    ${NOISE_GLSL}

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec3 pos = position;
      float displacement = fbm(pos * 1.4 + uTime * 0.3);
      pos += normal * displacement * 0.16;
      vPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  /* fragment */ `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float uTime;
    uniform float uIntensity;
    uniform vec3 uColorA;
    uniform vec3 uColorB;

    void main() {
      vec3 viewDir = normalize(cameraPosition - vPosition);
      float fresnel = pow(1.0 - clamp(dot(viewDir, vNormal), 0.0, 1.0), 2.2);
      float bands = sin(vUv.y * 24.0 - uTime * 2.4) * 0.5 + 0.5;
      float veins = smoothstep(0.82, 1.0, bands);
      vec3 color = mix(uColorA, uColorB, bands);
      color += veins * uColorA * 1.2;
      color += fresnel * uColorB * 1.6 * uIntensity;
      gl_FragColor = vec4(color, 1.0);
    }
  `
);

extend({ PortalMaterial });
export default PortalMaterial;
