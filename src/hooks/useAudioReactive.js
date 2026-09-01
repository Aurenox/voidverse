import { useEffect, useRef } from "react";

/**
 * Hooks a <audio> element up to a Web Audio AnalyserNode and continuously
 * smooths its average frequency amplitude into a 0..1 ref. Consumers read
 * `.current` inside useFrame — no React state, so this never causes
 * component re-renders (critical for a 60fps 3D scene).
 *
 * If the <audio> element's src fails to load (e.g. no file has been
 * dropped into /public yet), this falls back to a small synthesized
 * ambient drone built from Web Audio oscillators, so every audio-reactive
 * visual (bloom pulse, portal breathing, dust drift) still has something
 * real to react to out of the box. Swap in your own track any time —
 * the moment the <audio> element plays real media, the synth is dropped.
 */
export default function useAudioReactive(audioRef, enabled) {
  const levelRef = useRef(0);
  const analyserRef = useRef(null);
  const dataRef = useRef(null);
  const ctxRef = useRef(null);
  const synthRef = useRef(null);

  useEffect(() => {
    if (!enabled || !audioRef.current || analyserRef.current) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    let disposed = false;
    const ctx = new AudioCtx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.82;
    analyser.connect(ctx.destination);

    const startSynth = () => {
      if (disposed || synthRef.current) return;
      // Layered detuned oscillators + slow LFO on gain = a soft sci-fi pad,
      // so the scene still breathes with "sound" even with no media file.
      const master = ctx.createGain();
      master.gain.value = 0.05;
      master.connect(analyser);

      const osc1 = ctx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.value = 55;
      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.value = 55 * 1.5;
      const osc3 = ctx.createOscillator();
      osc3.type = "triangle";
      osc3.frequency.value = 55 * 2.006;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.03;
      lfo.connect(lfoGain);
      lfoGain.connect(master.gain);

      [osc1, osc2, osc3].forEach((osc) => {
        osc.connect(master);
        osc.start();
      });
      lfo.start();

      synthRef.current = { master, oscillators: [osc1, osc2, osc3, lfo] };
    };

    try {
      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      source.connect(ctx.destination);

      // If real media never actually produces sound (missing file, blocked
      // autoplay, etc.) within a beat, quietly layer in the synth pad.
      const fallbackTimer = setTimeout(() => {
        const el = audioRef.current;
        if (!disposed && (!el || el.paused || el.error)) startSynth();
      }, 900);

      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(analyser.frequencyBinCount);
      ctxRef.current = ctx;

      return () => {
        disposed = true;
        clearTimeout(fallbackTimer);
        synthRef.current?.oscillators.forEach((o) => {
          try { o.stop(); } catch { /* already stopped */ }
        });
        synthRef.current = null;
        ctx.close?.();
        analyserRef.current = null;
      };
    } catch (err) {
      console.warn("VOIDVERSE: media source unavailable, using synth pad", err);
      startSynth();
      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(analyser.frequencyBinCount);
      ctxRef.current = ctx;

      return () => {
        disposed = true;
        synthRef.current?.oscillators.forEach((o) => {
          try { o.stop(); } catch { /* already stopped */ }
        });
        synthRef.current = null;
        ctx.close?.();
        analyserRef.current = null;
      };
    }
  }, [enabled, audioRef]);

  useEffect(() => {
    let frame;

    const tick = () => {
      const analyser = analyserRef.current;
      const data = dataRef.current;

      if (analyser && data) {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length / 255;
        levelRef.current += (avg - levelRef.current) * 0.12;
      } else {
        // Idle shimmer so shaders aren't perfectly static when muted.
        levelRef.current += (0 - levelRef.current) * 0.05;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return levelRef;
}
