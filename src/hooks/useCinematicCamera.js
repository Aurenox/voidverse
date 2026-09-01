import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import gsap from "gsap";
import * as THREE from "three";

// One establishing shot per chapter. The camera flies to `position` and
// looks at `target` with a cinematic ease; OrbitControls (passed in as a
// ref) is disabled mid-flight so GSAP owns the camera exclusively, then
// handed back to the user once the shot settles.
const SHOTS = [
  { position: [0, 1.4, 18], target: [0, 0, -9] },
  { position: [0, 0.5, 15], target: [0, 0, -9] },
  { position: [2, 2.2, 20], target: [0, 0, -13] },
  { position: [0, -1, 13], target: [0, -2, -15] },
  { position: [0, 5, 17], target: [0, 10, -12] },
];

export default function useCinematicCamera(chapter, controlsRef) {
  const { camera } = useThree();
  const lookTarget = useRef(new THREE.Vector3(0, 0, -9));
  const pointer = useRef({ x: 0, y: 0 });
  const flying = useRef(false);

  useEffect(() => {
    const move = (event) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);

  useEffect(() => {
    const shot = SHOTS[chapter] ?? SHOTS[0];
    flying.current = true;

    if (controlsRef.current) controlsRef.current.enabled = false;

    const targetVec = new THREE.Vector3(...shot.target);

    const reenable = () => {
      flying.current = false;
      if (controlsRef.current) {
        controlsRef.current.target.copy(targetVec);
        controlsRef.current.enabled = true;
        controlsRef.current.update();
      }
    };

    // Hard safety net: even if GSAP's onComplete never fires for any
    // reason, controls are guaranteed back within ~duration + a beat.
    // Without this, a single dropped callback would permanently lock
    // rotate/zoom for the rest of the session.
    const safetyTimer = setTimeout(reenable, 2200);

    const posTween = gsap.to(camera.position, {
      x: shot.position[0],
      y: shot.position[1],
      z: shot.position[2],
      duration: 1.9,
      ease: "power3.inOut",
      onUpdate: () => {
        camera.lookAt(lookTarget.current);
      },
      onComplete: () => {
        clearTimeout(safetyTimer);
        reenable();
      },
    });

    const lookTween = gsap.to(lookTarget.current, {
      x: shot.target[0],
      y: shot.target[1],
      z: shot.target[2],
      duration: 1.9,
      ease: "power3.inOut",
    });

    return () => {
      clearTimeout(safetyTimer);
      posTween.kill();
      lookTween.kill();
    };
  }, [chapter, camera, controlsRef]);

  // Subtle cursor parallax layered on top of OrbitControls once a shot settles.
  useFrame(() => {
    if (flying.current || !controlsRef.current || !controlsRef.current.enabled) return;
    const offsetX = pointer.current.x * 0.35;
    const offsetY = -pointer.current.y * 0.2;
    camera.position.x += (offsetX - camera.position.x * 0.02) * 0.01;
    camera.position.y += (offsetY * 0.5 - camera.position.y * 0.02) * 0.01;
  });
}
