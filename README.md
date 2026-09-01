# VOIDVERSE — Advanced Edition

Your original five-chapter scroll experience, rebuilt with a cinematic-grade
effects layer on top. Same chapters (Portal / Memories / Worlds / Valley /
Peak), same content — the engine underneath is significantly more advanced.

## Run it

```bash
npm install
npm run dev
```

Open the printed local URL. `npm run build` produces a static `dist/`
you can host anywhere (Vercel, Netlify, GitHub Pages, S3...).

## What's new

**Custom GLSL shaders** (`src/shaders/`) — the portal core, planet
atmospheres, and the valley's energy river are no longer flat materials.
They're hand-written vertex/fragment shaders: the portal's surface
physically ripples with fbm noise, planets get a real fresnel atmosphere
halo instead of a wireframe shell, and the river has a scrolling turbulent
core with additive glow.

**Post-processing pipeline** (`src/components/PostFX.jsx`) — a full
`EffectComposer` stack: mipmap bloom, chromatic aberration, film grain,
and vignette, all with mipmap blur so it stays sharp at any resolution.
Bloom and aberration intensify automatically during chapter transitions
and pulse with the audio level.

**Cinematic camera rig** (`src/hooks/useCinematicCamera.js`) — instead of
the camera just teleporting into position when you cross a chapter
boundary, GSAP flies it there on an eased dolly path and hands control
back to OrbitControls once the shot settles. There's also a subtle
cursor-parallax layer active once a shot is settled, so the frame breathes
even when you're not dragging.

**Audio-reactive engine** (`src/hooks/useAudioReactive.js`) — toggle
"SIGNAL AUDIO" in the top bar and a Web Audio analyser drives bloom
intensity, portal breathing, dust drift speed, and orbit speed in real
time. Drop your own ambient track at `public/ambient-hum.mp3` and it'll
play automatically; until you do, a small synthesized ambient pad
(detuned oscillators + slow LFO) fills in so the reactive visuals still
have something real to respond to.

**Drag-to-inspect physics** (`src/hooks/useDragRotate.js`) — select any
memory fragment or world and you can now grab-and-spin it with your
cursor; released, it keeps spinning and decays with inertia rather than
snapping back.

**GPU instancing** (`src/components/InstancedRocks.jsx`) — the valley's
44 canyon rocks now render in a single draw call via `InstancedMesh`
instead of 44 separate meshes, which matters once bloom + grain are also
running every frame.

**Letterbox transitions** — crossing a chapter boundary now briefly
letterboxes the frame and flashes bloom/aberration, reinforcing the "cut
to next scene" feeling instead of an instant swap.

## Adding your own soundtrack

Drop an MP3/OGG file into `public/` and point the `<audio src="...">` in
`src/App.jsx` (near the bottom of the `App` component) at it. No other
code changes needed — the analyser attaches to whatever is playing.

## Structure

```
src/
  App.jsx                    scenes, HUD, loader, app shell
  index.css                  all HUD chrome styling
  shaders/                   portal / atmosphere / river GLSL materials
  hooks/
    useCinematicCamera.js    GSAP camera dolly + parallax
    useAudioReactive.js      Web Audio analyser + synth fallback
    useDragRotate.js         inertia-based drag rotation
  components/
    PostFX.jsx               bloom / aberration / grain / vignette
    InstancedRocks.jsx       instanced canyon geometry
```
