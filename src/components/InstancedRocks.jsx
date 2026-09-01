import { useMemo, useRef, useLayoutEffect } from "react";
import * as THREE from "three";

// Renders the valley's canyon rocks as a single instanced draw call.
// The original per-rock <mesh> approach cost 44 draw calls; this costs 1,
// which matters a lot once shadows/postprocessing are also active.
export default function InstancedRocks({ pairs = 22 }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = pairs * 2;

  const data = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const index = Math.floor(i / 2);
      const x = side * (5.5 + (index % 4) * 0.9);
      const y = -2 + (index % 3) * 1.4;
      const z = -2 - index * 1.35;
      const scale = 1.5 + (index % 3) * 0.5;
      arr.push({
        position: [x, y, z],
        rotation: [0.1 * (index % 2), 0.2 * index, side * 0.1],
        scale,
        dark: index % 3 === 0,
      });
    }
    return arr;
  }, [count]);

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    data.forEach((d, i) => {
      dummy.position.set(...d.position);
      dummy.rotation.set(...d.rotation);
      dummy.scale.setScalar(d.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, new THREE.Color(d.dark ? "#30474c" : "#223438"));
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [data, dummy]);

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <dodecahedronGeometry args={[1, 2]} />
      <meshStandardMaterial
        roughness={0.9}
        metalness={0.1}
        emissive="#0a2228"
        emissiveIntensity={0.9}
      />
    </instancedMesh>
  );
}
