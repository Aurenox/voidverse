import React, { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Sparkles, Stars, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

import "./shaders/portalMaterial.js";
import "./shaders/atmosphereMaterial.js";
import "./shaders/riverMaterial.js";

import PostFX from "./components/PostFX.jsx";
import InstancedRocks from "./components/InstancedRocks.jsx";
import useAudioReactive from "./hooks/useAudioReactive.js";
import useCinematicCamera from "./hooks/useCinematicCamera.js";
import useDragRotate from "./hooks/useDragRotate.js";

/* ============================================================
   ERROR BOUNDARY  (shows the real error on-screen instead of a
   silently static/blank canvas — critical for diagnosing WebGL
   or shader issues without opening devtools)
   ============================================================ */

class SceneErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("VOIDVERSE scene crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="scene-error">
          <h2>SCENE FAILED TO RENDER</h2>
          <pre>{String(this.state.error?.message || this.state.error)}</pre>
          <p>Copy this message to get it fixed — check your GPU supports WebGL2 and that all packages installed cleanly.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ============================================================
   CONTENT DATA
   ============================================================ */

const CHAPTERS = [
  { id: "01", name: "PORTAL", subtitle: "THE THRESHOLD", description: "A dimensional machine has appeared beyond mapped space." },
  { id: "02", name: "MEMORIES", subtitle: "THE ARCHIVE", description: "Fragments of an extinct civilization continue to orbit a forgotten world." },
  { id: "03", name: "WORLDS", subtitle: "THE DEEP FIELD", description: "Six unknown worlds move through a gravitational architecture surrounding an artificial star." },
  { id: "04", name: "VALLEY", subtitle: "THE RIFT", description: "A colossal fracture descends beneath an abandoned megastructure." },
  { id: "05", name: "PEAK", subtitle: "THE ORIGIN", description: "At the summit, the signal finally reveals where it came from." },
];

const MEMORY_DATA = [
  { name: "THE OBSERVER", type: "ANCIENT INTELLIGENCE", status: "STABLE", description: "A preserved intelligence fragment containing observations from before the first dimensional fracture." },
  { name: "VEIL ENGINE", type: "DIMENSIONAL DEVICE", status: "ACTIVE", description: "A miniature reconstruction of the machine responsible for opening the original threshold." },
  { name: "ECHO SHARD", type: "CRYSTALLINE MEMORY", status: "REPEATING", description: "A crystalline structure replaying a signal that appears to originate outside conventional space." },
  { name: "NULL CROWN", type: "ARCHITECTURAL RELIC", status: "UNSTABLE", description: "An unidentified artifact with an unstable internal energy pattern." },
  { name: "TWIN CORE", type: "ENERGY OBJECT", status: "RISING", description: "Two synchronized energy sources appear to communicate across separate dimensions." },
  { name: "THE KEY", type: "ACCESS ARTIFACT", status: "LOCKED", description: "A compact artifact whose structure matches the geometry surrounding the main portal." },
];

const WORLD_DATA = [
  { name: "SILENT GIANT", type: "ANCIENT WORLD", color: "#61eaff", radius: 1.35, orbit: 5.3, speed: 0.12, phase: 0, tilt: 0.04 },
  { name: "GLASSWIND", type: "CRYSTAL WORLD", color: "#a47fff", radius: 0.92, orbit: 7.4, speed: 0.085, phase: 1.5, tilt: -0.18 },
  { name: "EMBER VEIL", type: "UNSTABLE WORLD", color: "#ff866d", radius: 1.08, orbit: 9.5, speed: 0.063, phase: 3.2, tilt: 0.12 },
  { name: "DROWNED ORBIT", type: "OCEAN WORLD", color: "#628fff", radius: 1.5, orbit: 11.8, speed: 0.044, phase: 4.5, tilt: -0.09 },
  { name: "NULL", type: "DARK WORLD", color: "#b7c7ce", radius: 0.78, orbit: 14.2, speed: 0.034, phase: 5.8, tilt: 0.23 },
  { name: "LUMEN", type: "ENERGY WORLD", color: "#eaffff", radius: 0.68, orbit: 16.5, speed: 0.024, phase: 2.3, tilt: -0.16 },
];

const MEMORY_POSITIONS = [
  [-5.7, 2.6, -5.5], [5.4, 2.1, -7], [-5.8, -2.1, -8],
  [5.8, -2.5, -8.5], [-2.8, 5, -7], [3.2, -4.5, -8],
];
const MEMORY_SIZES = [0.74, 0.7, 0.43, 0.66, 0.54, 0.58];
const MEMORY_COLORS = ["#5deaff", "#a17fff", "#70eadb", "#ff8d78", "#74d9ff", "#b294ff"];

/* ============================================================
   SHARED PRIMITIVES
   ============================================================ */

function Metal({ color = "#1c3035", emissive = "#09282e", intensity = 0.7 }) {
  return <meshStandardMaterial color={color} metalness={0.9} roughness={0.27} emissive={emissive} emissiveIntensity={intensity} />;
}

function DustField({ count = 1800, spread = 40, size = 0.035, opacity = 0.4, audioLevel }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const data = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 4 + Math.random() * spread;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      data[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      data[i * 3 + 1] = Math.cos(phi) * radius * 0.7;
      data[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
    }
    return data;
  }, [count, spread]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const level = audioLevel?.current ?? 0;
    ref.current.rotation.y += delta * (0.001 + level * 0.004);
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={size} color="#9ceff8" transparent opacity={opacity} depthWrite={false} />
    </points>
  );
}

/* ============================================================
   CHAPTER 01 — PORTAL  (custom shader core + fresnel atmosphere)
   ============================================================ */

function PortalCore({ audioLevel }) {
  const core = useRef();
  const outer = useRef();
  const material = useRef();
  const atmosphere = useRef();

  useFrame((_, delta) => {
    const level = audioLevel?.current ?? 0;
    if (core.current) {
      core.current.rotation.x += delta * 0.045;
      core.current.rotation.y -= delta * (0.075 + level * 0.06);
    }
    if (outer.current) outer.current.rotation.z += delta * 0.06;
    if (material.current) {
      material.current.uTime += delta;
      material.current.uIntensity = 1 + level * 2;
    }
    if (atmosphere.current) {
      atmosphere.current.uTime += delta;
      atmosphere.current.uIntensity = 1.1 + level * 1.4;
    }
  });

  return (
    <group position={[0, 0, -9]}>
      <mesh ref={core}>
        <icosahedronGeometry args={[2.1, 5]} />
        {/* eslint-disable-next-line react/no-unknown-property */}
        <portalMaterial ref={material} />
      </mesh>

      {/* fresnel atmosphere halo, back-side rendered additive glow */}
      <mesh scale={1.24}>
        <sphereGeometry args={[2.1, 48, 32]} />
        {/* eslint-disable-next-line react/no-unknown-property */}
        <atmosphereMaterial ref={atmosphere} uColor={new THREE.Color("#5deaff")} uPower={2.6} transparent depthWrite={false} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh ref={outer} scale={1.08}>
        <icosahedronGeometry args={[2.2, 3]} />
        <meshBasicMaterial color="#5deaff" wireframe transparent opacity={0.62} />
      </mesh>

      <mesh>
        <sphereGeometry args={[0.58, 32, 32]} />
        <meshBasicMaterial color="#efffff" />
      </mesh>

      {[2.9, 3.9, 4.9].map((radius, index) => (
        <mesh key={radius} rotation={[index * 0.5, index * 0.35, index * 0.55]}>
          <torusGeometry args={[radius, 0.024, 8, 160]} />
          <meshBasicMaterial color={index === 1 ? "#a27fff" : "#5deaff"} transparent opacity={0.45} />
        </mesh>
      ))}

      <pointLight color="#59eaff" intensity={28} distance={20} />
    </group>
  );
}

function PortalBlade({ index }) {
  const ref = useRef();
  const angle = (index / 18) * Math.PI * 2;
  const radius = 5.2;

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * 0.018;
  });

  return (
    <group ref={ref} position={[Math.cos(angle) * radius, Math.sin(angle) * radius, -9]} rotation={[0, 0, angle + Math.PI / 2]}>
      <mesh>
        <boxGeometry args={[0.32, 2.8 + (index % 3) * 0.6, 0.65]} />
        <Metal />
      </mesh>
      <mesh position={[0, 0, 0.34]}>
        <boxGeometry args={[0.045, 2.15, 0.04]} />
        <meshBasicMaterial color={index % 3 === 0 ? "#a47fff" : "#5deaff"} />
      </mesh>
    </group>
  );
}

function PortalTower({ x, z, height }) {
  return (
    <group position={[x, height / 2 - 4, z]}>
      <mesh>
        <boxGeometry args={[0.9, height, 0.9]} />
        <Metal />
      </mesh>
      {Array.from({ length: Math.floor(height / 2) }).map((_, i) => (
        <mesh key={i} position={[0, -height / 2 + 1 + i * 2, 0.46]}>
          <boxGeometry args={[0.36, 0.035, 0.04]} />
          <meshBasicMaterial color="#5deaff" transparent opacity={0.55} />
        </mesh>
      ))}
    </group>
  );
}

function PortalScene({ audioLevel }) {
  return (
    <group>
      <PortalCore audioLevel={audioLevel} />
      {Array.from({ length: 18 }).map((_, index) => <PortalBlade key={index} index={index} />)}
      <PortalTower x={-8} z={-12} height={18} />
      <PortalTower x={8} z={-14} height={21} />
      <PortalTower x={-11} z={-20} height={13} />
      <PortalTower x={11} z={-21} height={16} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4.3, -12]}>
        <planeGeometry args={[50, 45]} />
        <meshStandardMaterial color="#02080a" roughness={1} />
      </mesh>
      <Sparkles count={800} scale={[32, 21, 38]} size={1.1} speed={0.16} color="#72ecff" />
      <DustField count={2200} spread={40} audioLevel={audioLevel} />
      <Stars count={2000} radius={65} depth={55} factor={1.3} fade speed={0.04} />
    </group>
  );
}

/* ============================================================
   CHAPTER 02 — MEMORIES  (drag-to-inspect fragments)
   ============================================================ */

function MemoryFragment({ index, selected, onSelect, onHover }) {
  const ref = useRef();
  const drag = useDragRotate({ active: selected });
  const size = MEMORY_SIZES[index];

  useFrame((state, delta) => {
    if (!ref.current) return;
    const manual = drag.settle();

    ref.current.rotation.x += delta * 0.25 + manual.x * 0.02;
    ref.current.rotation.y += delta * 0.34 + manual.y * 0.02;
    ref.current.position.y += Math.sin(state.clock.elapsedTime * 0.45 + index) * delta * 0.08;

    const target = selected ? size * 1.35 : size;
    ref.current.scale.lerp(new THREE.Vector3(target, target, target), 0.08);
  });

  return (
    <group
      ref={ref}
      position={MEMORY_POSITIONS[index]}
      onClick={(e) => { e.stopPropagation(); onSelect(index); }}
      onPointerOver={(e) => { e.stopPropagation(); onHover(true); }}
      onPointerOut={(e) => { e.stopPropagation(); onHover(false); }}
      onPointerDown={selected ? drag.onPointerDown : undefined}
      onPointerMove={selected ? drag.onPointerMove : undefined}
      onPointerUp={selected ? drag.onPointerUp : undefined}
    >
      <mesh>
        <octahedronGeometry args={[0.8, 1]} />
        <meshStandardMaterial color={MEMORY_COLORS[index]} metalness={0.85} roughness={0.2} emissive={MEMORY_COLORS[index]} emissiveIntensity={selected ? 0.35 : 0.08} />
      </mesh>
      <mesh scale={1.42}>
        <octahedronGeometry args={[0.8, 1]} />
        <meshBasicMaterial color={MEMORY_COLORS[index]} wireframe transparent opacity={selected ? 0.5 : 0.16} />
      </mesh>
      {selected && (
        <>
          <pointLight color={MEMORY_COLORS[index]} intensity={3} distance={5} />
          <Html center distanceFactor={8}>
            <div className="world-tag">
              <b>{MEMORY_DATA[index].name}</b>
              <span>MEMORY FRAGMENT — DRAG TO INSPECT</span>
            </div>
          </Html>
        </>
      )}
    </group>
  );
}

function MemoryPlanet({ selected, audioLevel }) {
  const ref = useRef();
  const atmosphere = useRef();

  useFrame((_, delta) => {
    if (!ref.current) return;
    const level = audioLevel?.current ?? 0;
    ref.current.rotation.y += delta * (0.022 + level * 0.02);
    ref.current.rotation.x += delta * 0.004;
    const target = selected !== null ? 1.04 : 1;
    ref.current.scale.lerp(new THREE.Vector3(target, target, target), 0.05);
    if (atmosphere.current) atmosphere.current.uTime += delta;
  });

  return (
    <group ref={ref} position={[0, 0, -9]}>
      <mesh>
        <sphereGeometry args={[5.5, 72, 48]} />
        <meshStandardMaterial color="#17282d" roughness={0.58} metalness={0.5} emissive="#123b42" emissiveIntensity={0.55} />
      </mesh>
      <mesh scale={1.06}>
        <sphereGeometry args={[5.5, 48, 32]} />
        {/* eslint-disable-next-line react/no-unknown-property */}
        <atmosphereMaterial ref={atmosphere} uColor={new THREE.Color("#5deaff")} uPower={3} uIntensity={0.7} transparent depthWrite={false} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh scale={1.012}>
        <sphereGeometry args={[5.5, 32, 20]} />
        <meshBasicMaterial color="#65eaff" wireframe transparent opacity={0.065} />
      </mesh>
      {Array.from({ length: 20 }).map((_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 4.85, Math.sin(i * 1.7) * 3, Math.sin(angle) * 4.85]} rotation={[Math.sin(angle), angle, 0]}>
            <boxGeometry args={[0.045, 1.1 + (i % 4) * 0.55, 0.035]} />
            <meshBasicMaterial color={i % 4 === 0 ? "#a17fff" : "#5deaff"} transparent opacity={0.42} />
          </mesh>
        );
      })}
      <pointLight position={[-7, 5, 4]} color="#4edff2" intensity={7} distance={18} />
      <pointLight position={[7, -4, 4]} color="#8065df" intensity={3} distance={15} />
    </group>
  );
}

function MemoryRing({ radius, rotation, color }) {
  const ref = useRef();
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * 0.004; });
  return (
    <mesh ref={ref} position={[0, 0, -9]} rotation={rotation}>
      <torusGeometry args={[radius, 0.018, 8, 180]} />
      <meshBasicMaterial color={color} transparent opacity={0.14} />
    </mesh>
  );
}

function MemoriesScene({ selected, setSelected, setHover, audioLevel }) {
  return (
    <group>
      <MemoryPlanet selected={selected} audioLevel={audioLevel} />
      <MemoryRing radius={6.5} rotation={[Math.PI / 2, 0.1, 0]} color="#5deaff" />
      <MemoryRing radius={7.8} rotation={[Math.PI / 2 + 0.32, 0.3, 0.2]} color="#a17fff" />
      <MemoryRing radius={9.1} rotation={[Math.PI / 2 - 0.25, -0.2, 0.1]} color="#5deaff" />
      {MEMORY_POSITIONS.map((_, index) => (
        <MemoryFragment key={index} index={index} selected={selected === index} onSelect={setSelected} onHover={setHover} />
      ))}
      <Sparkles count={850} scale={[28, 22, 35]} position={[0, 0, -12]} size={0.9} speed={0.1} color="#a8f4fc" />
      <Stars count={1800} radius={60} depth={50} factor={1.15} fade speed={0.03} />
    </group>
  );
}

/* ============================================================
   CHAPTER 03 — WORLDS  (orbital mechanics + drag-to-inspect)
   ============================================================ */

function WorldCore({ audioLevel }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * (0.03 + (audioLevel?.current ?? 0) * 0.03);
  });
  return (
    <group ref={ref} position={[0, 0, -13]}>
      <mesh>
        <sphereGeometry args={[1.65, 64, 48]} />
        <meshStandardMaterial color="#dfffff" emissive="#58eaff" emissiveIntensity={2.3} metalness={0.55} roughness={0.12} />
      </mesh>
      <mesh scale={1.32}>
        <icosahedronGeometry args={[1.65, 3]} />
        <meshBasicMaterial color="#5deaff" wireframe transparent opacity={0.25} />
      </mesh>
      {[2.7, 3.5, 4.3].map((radius, index) => (
        <mesh key={radius} rotation={[index * 0.45, index * 0.55, index * 0.3]}>
          <torusGeometry args={[radius, 0.022, 8, 140]} />
          <meshBasicMaterial color={index === 1 ? "#a17fff" : "#5deaff"} transparent opacity={0.28} />
        </mesh>
      ))}
      <pointLight color="#59eaff" intensity={25} distance={25} />
    </group>
  );
}

function WorldOrbit({ radius, tilt, index }) {
  return (
    <mesh position={[0, 0, -13]} rotation={[Math.PI / 2 + tilt, index * 0.08, index * 0.03]}>
      <torusGeometry args={[radius, index === 0 ? 0.035 : 0.018, 8, 200]} />
      <meshBasicMaterial color={index % 2 ? "#9f80ff" : "#5deaff"} transparent opacity={index === 0 ? 0.28 : 0.12} />
    </mesh>
  );
}

function WorldPlanet({ world, index, selected, onSelect, onHover }) {
  const ref = useRef();
  const planet = useRef();
  const drag = useDragRotate({ active: selected });

  useFrame((state, delta) => {
    if (!ref.current) return;
    const time = state.clock.elapsedTime * world.speed + world.phase;
    const x = Math.cos(time) * world.orbit;
    const z = Math.sin(time) * world.orbit;
    const y = Math.sin(time * 0.65) * world.orbit * world.tilt;
    ref.current.position.set(x, y, z - 13);

    if (planet.current) {
      const manual = drag.settle();
      planet.current.rotation.y += delta * 0.08 + manual.y * 0.02;
      planet.current.rotation.x += delta * 0.005 + manual.x * 0.02;
    }

    const scale = selected ? 1.45 : 1;
    ref.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.07);
  });

  return (
    <group
      ref={ref}
      onClick={(e) => { e.stopPropagation(); onSelect(index); }}
      onPointerOver={(e) => { e.stopPropagation(); onHover(true); }}
      onPointerOut={(e) => { e.stopPropagation(); onHover(false); }}
      onPointerDown={selected ? drag.onPointerDown : undefined}
      onPointerMove={selected ? drag.onPointerMove : undefined}
      onPointerUp={selected ? drag.onPointerUp : undefined}
    >
      <group ref={planet}>
        <mesh>
          <sphereGeometry args={[world.radius, 52, 36]} />
          <meshStandardMaterial color={world.color} roughness={0.5} metalness={0.28} emissive={world.color} emissiveIntensity={selected ? 0.3 : 0.04} />
        </mesh>
        <mesh scale={1.16}>
          <sphereGeometry args={[world.radius, 36, 24]} />
          {/* eslint-disable-next-line react/no-unknown-property */}
          <atmosphereMaterial uColor={new THREE.Color(world.color)} uPower={2.2} uIntensity={selected ? 0.9 : 0.35} transparent depthWrite={false} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh scale={1.015}>
          <sphereGeometry args={[world.radius, 26, 18]} />
          <meshBasicMaterial color={world.color} wireframe transparent opacity={selected ? 0.14 : 0.025} />
        </mesh>

        {index === 1 && (
          <>
            <mesh rotation={[0.6, 0.2, 0.1]}>
              <torusGeometry args={[world.radius * 1.55, 0.028, 8, 110]} />
              <meshBasicMaterial color="#b194ff" transparent opacity={0.62} />
            </mesh>
            <mesh rotation={[0.6, 0.2, 0.1]}>
              <torusGeometry args={[world.radius * 1.9, 0.015, 8, 110]} />
              <meshBasicMaterial color="#d0c1ff" transparent opacity={0.28} />
            </mesh>
          </>
        )}

        {index === 3 && (
          <mesh rotation={[0.4, 0.15, 0.7]}>
            <torusGeometry args={[world.radius * 1.6, 0.045, 8, 110]} />
            <meshBasicMaterial color="#6ca5ff" transparent opacity={0.5} />
          </mesh>
        )}

        {selected && <pointLight color={world.color} intensity={5} distance={7} />}
      </group>

      {selected && (
        <Html center distanceFactor={9}>
          <div className="world-tag">
            <b>{world.name}</b>
            <span>{world.type} — DRAG TO INSPECT</span>
          </div>
        </Html>
      )}
    </group>
  );
}

function WorldsScene({ selected, setSelected, setHover, audioLevel }) {
  return (
    <group>
      <WorldCore audioLevel={audioLevel} />
      {WORLD_DATA.map((world, index) => <WorldOrbit key={index} radius={world.orbit} tilt={world.tilt} index={index} />)}
      {WORLD_DATA.map((world, index) => (
        <WorldPlanet key={world.name} world={world} index={index} selected={selected === index} onSelect={setSelected} onHover={setHover} />
      ))}
      <Sparkles count={1000} scale={[38, 25, 42]} position={[0, 0, -13]} size={1} speed={0.13} color="#c3f9ff" />
      <DustField count={2500} spread={45} audioLevel={audioLevel} />
      <Stars count={2400} radius={70} depth={60} factor={1.35} fade speed={0.035} />
    </group>
  );
}

/* ============================================================
   CHAPTER 04 — VALLEY  (instanced rocks + shader energy river)
   ============================================================ */

function ValleyBridge({ z, index }) {
  return (
    <group position={[0, 1.2 + index * 0.25, z]}>
      <mesh>
        <boxGeometry args={[13, 0.25, 0.6]} />
        <Metal color="#42595e" emissive="#12343a" intensity={0.8} />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[11.8, 0.035, 0.08]} />
        <meshBasicMaterial color={index % 2 ? "#a17fff" : "#5deaff"} />
      </mesh>
    </group>
  );
}

function EnergyRiver({ audioLevel }) {
  const materialRef = useRef();
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [[0, -6.7, 5], [1.3, -6.6, 0], [-1.5, -6.5, -6], [1.4, -6.4, -13], [-1.2, -6.3, -21], [0, -6.2, -30]].map(
          (p) => new THREE.Vector3(...p)
        )
      ),
    []
  );
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 220, 0.85, 12, false), [curve]);

  useFrame((_, delta) => {
    if (!materialRef.current) return;
    materialRef.current.uTime += delta;
    materialRef.current.uFlow = 1 + (audioLevel?.current ?? 0) * 2.5;
  });

  return (
    <mesh geometry={geometry}>
      {/* eslint-disable-next-line react/no-unknown-property */}
      <riverMaterial ref={materialRef} transparent side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

function ValleyScene({ audioLevel }) {
  return (
    <group>
      <mesh position={[-9, 1, -15]}>
        <boxGeometry args={[5, 20, 42]} />
        <meshStandardMaterial color="#24383c" roughness={0.95} metalness={0.08} emissive="#0a2025" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[9, 1, -15]}>
        <boxGeometry args={[5, 20, 42]} />
        <meshStandardMaterial color="#263a3e" roughness={0.95} metalness={0.08} emissive="#0a2025" emissiveIntensity={0.9} />
      </mesh>

      <InstancedRocks pairs={22} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -7.1, -13]}>
        <planeGeometry args={[38, 50]} />
        <meshStandardMaterial color="#101c20" roughness={0.92} metalness={0.15} />
      </mesh>

      <EnergyRiver audioLevel={audioLevel} />

      {[-6, -12, -18, -24].map((z, index) => <ValleyBridge key={z} z={z} index={index} />)}

      <Sparkles count={1200} scale={[18, 18, 40]} position={[0, -1, -15]} size={1.1} speed={0.25} color="#65eaff" />
      <hemisphereLight color="#8cefff" groundColor="#05090b" intensity={0.72} />
      <pointLight position={[0, -4, -10]} color="#43e6f7" intensity={28} distance={30} />
      <pointLight position={[-7, 5, -10]} color="#6c8cff" intensity={8} distance={20} />
      <pointLight position={[7, 5, -18]} color="#a17fff" intensity={7} distance={20} />
      <Stars count={1800} radius={65} depth={55} factor={1.3} fade speed={0.035} />
    </group>
  );
}

/* ============================================================
   CHAPTER 05 — PEAK
   ============================================================ */

function PeakCore({ audioLevel }) {
  const ref = useRef();
  const material = useRef();

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.018;
    if (material.current) {
      material.current.uTime += delta;
      material.current.uIntensity = 1.3 + (audioLevel?.current ?? 0) * 2;
    }
  });

  return (
    <group ref={ref} position={[0, 12, -12]}>
      <mesh>
        <icosahedronGeometry args={[1.35, 5]} />
        {/* eslint-disable-next-line react/no-unknown-property */}
        <portalMaterial ref={material} uColorA={new THREE.Color("#efffff")} uColorB={new THREE.Color("#a480ff")} />
      </mesh>
      {[2.5, 3.5, 4.6].map((radius, index) => (
        <mesh key={radius} rotation={[index * 0.45, index * 0.35, index * 0.3]}>
          <torusGeometry args={[radius, 0.035, 8, 120]} />
          <meshBasicMaterial color={index === 1 ? "#a480ff" : "#5deaff"} transparent opacity={0.55} />
        </mesh>
      ))}
      <pointLight color="#62eaff" intensity={30} distance={30} />
    </group>
  );
}

function PeakScene({ audioLevel }) {
  return (
    <group>
      <mesh position={[0, 1, -12]}>
        <coneGeometry args={[12, 23, 9]} />
        <meshStandardMaterial color="#111e22" roughness={0.97} metalness={0.12} emissive="#0a1e24" emissiveIntensity={0.65} />
      </mesh>
      <mesh position={[0, 4, -12]} scale={0.72}>
        <coneGeometry args={[12, 23, 8]} />
        <meshStandardMaterial color="#1b2c31" roughness={0.88} metalness={0.18} />
      </mesh>
      {Array.from({ length: 18 }).map((_, index) => {
        const angle = (index / 18) * Math.PI * 2;
        return (
          <mesh key={index} position={[Math.cos(angle) * 4.6, 2 + Math.sin(index) * 3, -12 + Math.sin(angle) * 4.6]} rotation={[Math.sin(angle), -angle, 0.1]}>
            <boxGeometry args={[0.045, 5 + (index % 4) * 1.2, 0.03]} />
            <meshBasicMaterial color={index % 3 === 0 ? "#a27fff" : "#5deaff"} transparent opacity={0.55} />
          </mesh>
        );
      })}
      <PeakCore audioLevel={audioLevel} />
      <Sparkles count={1000} scale={[35, 35, 40]} size={1.15} speed={0.17} color="#d4fbff" />
      <Stars count={2300} radius={75} depth={60} factor={1.35} fade speed={0.035} />
    </group>
  );
}

/* ============================================================
   SCENE MANAGER  (owns lighting, cinematic camera, controls)
   ============================================================ */

function SceneManager({ chapter, selectedMemory, setSelectedMemory, selectedWorld, setSelectedWorld, setHover, audioLevel }) {
  const controlsRef = useRef();
  useCinematicCamera(chapter, controlsRef);

  return (
    <>
      <ambientLight intensity={0.22} />
      <directionalLight position={[8, 15, 10]} intensity={1.3} />
      <directionalLight position={[-12, 8, -10]} intensity={0.7} color="#68eaff" />

      {chapter === 0 && <PortalScene audioLevel={audioLevel} />}
      {chapter === 1 && <MemoriesScene selected={selectedMemory} setSelected={setSelectedMemory} setHover={setHover} audioLevel={audioLevel} />}
      {chapter === 2 && <WorldsScene selected={selectedWorld} setSelected={setSelectedWorld} setHover={setHover} audioLevel={audioLevel} />}
      {chapter === 3 && <ValleyScene audioLevel={audioLevel} />}
      {chapter === 4 && <PeakScene audioLevel={audioLevel} />}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        enableRotate
        enableZoom
        enableDamping
        dampingFactor={0.055}
        rotateSpeed={0.72}
        zoomSpeed={0.7}
        minDistance={6}
        maxDistance={30}
        minPolarAngle={0.18}
        maxPolarAngle={Math.PI - 0.18}
        screenSpacePanning={false}
      />
    </>
  );
}

/* ============================================================
   LOADER
   ============================================================ */

function Loader({ onComplete }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((value) => {
        if (value >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 200);
          return 100;
        }
        return value + 2;
      });
    }, 20);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="loader">
      <div className="loader-grid" />
      <div className="loader-center">
        <div className="loader-mark">V</div>
        <div className="loader-kicker">VOIDVERSE / DEEP FIELD ARCHIVE</div>
        <h1>VOID<span>VERSE</span></h1>
        <p>INITIALIZING WORLD ENGINE</p>
        <div className="loader-line"><i style={{ width: `${progress}%` }} /></div>
        <div className="loader-meta">
          <span>DIMENSIONAL SYSTEM</span>
          <b>{String(progress).padStart(3, "0")}%</b>
        </div>
      </div>
      <div className="loader-bottom">
        <span>SIGNAL DETECTED</span>
        <span>{progress >= 100 ? "SYSTEM READY" : "BOOTING"}</span>
      </div>
    </div>
  );
}

/* ============================================================
   DATA PANEL
   ============================================================ */

function DataPanel({ type, index, close }) {
  const data = type === "memory" ? MEMORY_DATA[index] : WORLD_DATA[index];
  const description =
    type === "memory"
      ? data.description
      : "An anomalous world detected inside the deep field. Its orbital behaviour suggests an artificial gravitational architecture.";

  return (
    <div className="data-panel">
      <button className="data-close" onClick={close}>×</button>
      <span className="data-index">{type.toUpperCase()} / {String(index + 1).padStart(2, "0")}</span>
      <h3>{data.name}</h3>
      <p>{description}</p>
      <div className="data-grid">
        <div><small>CLASS</small><strong>{data.type}</strong></div>
        <div><small>ORIGIN</small><strong>UNKNOWN</strong></div>
        <div><small>STATUS</small><strong>{type === "memory" ? data.status : "DETECTED"}</strong></div>
      </div>
    </div>
  );
}

/* ============================================================
   AUDIO REACTIVE LEVEL METER  (reads a ref directly — no re-renders)
   ============================================================ */

function AudioMeter({ audioLevel, enabled }) {
  const barsRef = useRef([]);

  useEffect(() => {
    let frame;
    const tick = () => {
      const level = audioLevel?.current ?? 0;
      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        const phase = Math.sin(performance.now() * 0.004 + i) * 0.5 + 0.5;
        const h = enabled ? 20 + level * 60 * (0.4 + phase * 0.6) : 8;
        bar.style.height = `${h}%`;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [audioLevel, enabled]);

  return (
    <div className={`audio-meter ${enabled ? "active" : ""}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <i key={i} ref={(el) => (barsRef.current[i] = el)} />
      ))}
    </div>
  );
}

/* ============================================================
   HUD
   ============================================================ */

function HUD({ chapter, navigate, selectedMemory, selectedWorld, closePanel, audioOn, toggleAudio, audioLevel }) {
  const current = CHAPTERS[chapter];

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <strong>V</strong>
          <div>VOIDVERSE<small>BEYOND THE KNOWN</small></div>
        </div>

        <div className="topbar-right">
          <button className={`audio-toggle ${audioOn ? "on" : ""}`} onClick={toggleAudio} aria-pressed={audioOn}>
            <AudioMeter audioLevel={audioLevel} enabled={audioOn} />
            <span>{audioOn ? "SIGNAL AUDIO ON" : "SIGNAL AUDIO OFF"}</span>
          </button>

          <div className="engine-status"><i />WORLD ENGINE / ONLINE</div>
        </div>
      </header>

      <div className="chapter-counter">
        <b>{current.id}</b><i /><span>05</span>
      </div>

      <section className="hero">
        <div className="hero-kicker"><i />{current.subtitle}</div>
        <h1>{current.name}</h1>
        <p>{current.description}</p>

        <div className="interaction-hint">
          <span className="drag-icon">↔</span>
          <span>DRAG TO ROTATE</span>
          <span className="hint-divider">/</span>
          <span>WHEEL TO ZOOM</span>
          <span className="hint-divider">/</span>
          <span>CLICK OBJECTS TO INSPECT</span>
        </div>

        {selectedMemory !== null && <DataPanel type="memory" index={selectedMemory} close={closePanel} />}
        {selectedWorld !== null && <DataPanel type="world" index={selectedWorld} close={closePanel} />}
      </section>

      <nav className="chapter-nav">
        {CHAPTERS.map((item, index) => (
          <button key={item.id} className={chapter === index ? "active" : ""} onClick={() => navigate(index)}>
            <span>{item.id}</span><i /><b>{item.name}</b>
          </button>
        ))}
      </nav>

      <div className="scroll-hint"><span>DRAG / EXPLORE</span><i /></div>
      <div className="bottom-status">SIGNAL / ACTIVE</div>
    </>
  );
}

/* ============================================================
   APP
   ============================================================ */

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [selectedWorld, setSelectedWorld] = useState(null);
  const [hover, setHover] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [audioOn, setAudioOn] = useState(false);

  const locked = useRef(false);
  const audioRef = useRef(null);
  const audioLevel = useAudioReactive(audioRef, audioOn);

  useEffect(() => {
    const moveCursor = (event) => {
      document.documentElement.style.setProperty("--cursor-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--cursor-y", `${event.clientY}px`);
    };
    window.addEventListener("pointermove", moveCursor);
    return () => window.removeEventListener("pointermove", moveCursor);
  }, []);

  const navigate = (target) => {
    const next = Math.max(0, Math.min(CHAPTERS.length - 1, target));
    if (next === chapter || locked.current) return;

    locked.current = true;
    setTransitioning(true);
    setSelectedMemory(null);
    setSelectedWorld(null);

    setTimeout(() => setChapter(next), 220);
    setTimeout(() => setTransitioning(false), 720);
    setTimeout(() => (locked.current = false), 820);
  };

  useEffect(() => {
    if (!loaded) return;
    let wheelCooldown = false;

    const wheel = (event) => {
      if (Math.abs(event.deltaY) < 90) return;
      if (wheelCooldown) return;
      wheelCooldown = true;
      navigate(chapter + (event.deltaY > 0 ? 1 : -1));
      setTimeout(() => (wheelCooldown = false), 650);
    };

    const keydown = (event) => {
      if (event.key === "ArrowDown" || event.key === "PageDown") navigate(chapter + 1);
      if (event.key === "ArrowUp" || event.key === "PageUp") navigate(chapter - 1);
      if (event.key === "Escape") { setSelectedMemory(null); setSelectedWorld(null); }
      if (/^[1-5]$/.test(event.key)) navigate(Number(event.key) - 1);
    };

    let touchStart = 0;
    const touchStartHandler = (event) => { touchStart = event.touches[0].clientY; };
    const touchEndHandler = (event) => {
      const end = event.changedTouches[0].clientY;
      const distance = touchStart - end;
      if (Math.abs(distance) > 80) navigate(chapter + (distance > 0 ? 1 : -1));
    };

    window.addEventListener("wheel", wheel, { passive: true });
    window.addEventListener("keydown", keydown);
    window.addEventListener("touchstart", touchStartHandler, { passive: true });
    window.addEventListener("touchend", touchEndHandler, { passive: true });

    return () => {
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("touchstart", touchStartHandler);
      window.removeEventListener("touchend", touchEndHandler);
    };
  }, [loaded, chapter]);

  const closePanel = () => { setSelectedMemory(null); setSelectedWorld(null); };

  const toggleAudio = () => {
    setAudioOn((on) => {
      const next = !on;
      if (audioRef.current) {
        if (next) audioRef.current.play().catch(() => {});
        else audioRef.current.pause();
      }
      return next;
    });
  };

  return (
    <main className={`app chapter-${chapter} ${hover ? "object-hover" : ""} ${transitioning ? "is-transitioning" : ""}`}>
      {!loaded && <Loader onComplete={() => setLoaded(true)} />}

      {/* Looping ambient hum — replace src with your own audio asset. Muted by default; user opts in via the HUD toggle. */}
      <audio ref={audioRef} src="/ambient-hum.mp3" loop crossOrigin="anonymous" />

      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 1, 18], fov: 48, near: 0.1, far: 100 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#010306"]} />
        <fog attach="fog" args={["#010306", chapter === 3 ? 5 : 9, chapter === 3 ? 45 : 70]} />

        <SceneErrorBoundary>
          <Suspense fallback={null}>
            <SceneManager
              chapter={chapter}
              selectedMemory={selectedMemory}
              setSelectedMemory={setSelectedMemory}
              selectedWorld={selectedWorld}
              setSelectedWorld={setSelectedWorld}
              setHover={setHover}
              audioLevel={audioLevel}
            />
            <PostFX audioLevel={audioLevel} chapter={chapter} transitioning={transitioning} />
          </Suspense>
        </SceneErrorBoundary>
      </Canvas>

      {loaded && (
        <>
          <div className="vignette" />
          <div className="grain" />
          <div className="letterbox top" />
          <div className="letterbox bottom" />

          <HUD
            chapter={chapter}
            navigate={navigate}
            selectedMemory={selectedMemory}
            selectedWorld={selectedWorld}
            closePanel={closePanel}
            audioOn={audioOn}
            toggleAudio={toggleAudio}
            audioLevel={audioLevel}
          />

          <div className={`transition ${transitioning ? "active" : ""}`} />
        </>
      )}
    </main>
  );
}
