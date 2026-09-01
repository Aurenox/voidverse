import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
  Noise,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

export default function PostFX({ audioLevel, chapter, transitioning }) {
  const bloomRef = useRef();
  const chromaRef = useRef();
  const vignetteRef = useRef();

  useFrame(() => {
    const level = audioLevel?.current ?? 0;

    try {
      if (bloomRef.current) {
        const base = chapter === 4 ? 1.6 : 1.1;
        bloomRef.current.intensity = base + level * 2.2 + (transitioning ? 0.6 : 0);
      }

      if (chromaRef.current?.offset) {
        const amount = 0.0006 + level * 0.0018 + (transitioning ? 0.004 : 0);
        // Assign x/y directly rather than calling .set() — the offset
        // object's exact shape varies across postprocessing versions,
        // but x/y assignment works whether it's a THREE.Vector2 or a
        // plain {x,y} object. This is what was crashing the frame loop
        // every tick and freezing the whole scene.
        chromaRef.current.offset.x = amount;
        chromaRef.current.offset.y = amount * 0.6;
      }
    } catch (err) {
      // Never let a postprocessing API mismatch kill the render loop —
      // log once per mount instead of spamming every frame.
      if (!PostFX._warned) {
        console.warn("VOIDVERSE: PostFX update skipped an effect this frame", err);
        PostFX._warned = true;
      }
    }
  });

  return (
    <EffectComposer multisampling={0} disableNormalPass>
      <Bloom
        ref={bloomRef}
        intensity={1.2}
        luminanceThreshold={0.1}
        luminanceSmoothing={0.4}
        mipmapBlur
      />
      <ChromaticAberration
        ref={chromaRef}
        blendFunction={BlendFunction.NORMAL}
        offset={[0.0008, 0.0005]}
      />
      <Noise opacity={0.03} blendFunction={BlendFunction.OVERLAY} premultiply />
      <Vignette
        ref={vignetteRef}
        eskil={false}
        offset={0.22}
        darkness={chapter === 3 ? 0.95 : 0.78}
      />
    </EffectComposer>
  );
}
