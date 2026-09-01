import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";
import * as THREE from "three";
import { NOISE_GLSL } from "./noise.js";

// Fresnel-driven atmosphere shell, rendered on the back side of a
// slightly larger sphere so the glow reads as a soft halo around
// planets/portals rather than a flat rim outline.
const AtmosphereMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color("#5deaff"),
    uPower: 2.4,
    uIntensity: 1.0,
  },
  /* vertex */ `
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* fragment */ `
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uPower;
    uniform float uIntensity;

    ${NOISE_GLSL}

    void main() {
      vec3 viewDir = normalize(cameraPosition - vPosition);
      float fresnel = pow(1.0 - clamp(dot(viewDir, vNormal), 0.0, 1.0), uPower);
      float shimmer = 0.85 + 0.15 * vnoise(vPosition * 0.6 + uTime * 0.15);
      gl_FragColor = vec4(uColor, fresnel * uIntensity * shimmer);
    }
  `
);

extend({ AtmosphereMaterial });
export default AtmosphereMaterial;
