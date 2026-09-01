# VOIDVERSE — Deep Field Archive

> **An interactive cinematic journey beyond the known.**

VOIDVERSE is an immersive 3D web experience built with **React, Three.js, and React Three Fiber**.

The experience takes visitors through five connected chapters:

```text
01 PORTAL
      ↓
02 MEMORIES
      ↓
03 WORLDS
      ↓
04 VALLEY
      ↓
05 PEAK
```

The visual journey evolves from **discovery → memory → exploration → descent → ascension**, with recurring dimensional energy, fragments, crystals, particles, rings, and atmospheric effects.

## ✦ Experience

### 01 — PORTAL

A gigantic procedural dimensional gateway constructed from layered geometry:

- Structural rings
- Mechanical components
- Rotating elements
- Energy rings
- Fractured geometry
- Emissive surfaces
- Dimensional membrane
- Central void
- Floating debris
- Atmospheric particles

### 02 — MEMORIES

A mysterious archive containing dimensional artifacts:

- Crystals
- Energy cores
- Relics
- Fractured spheres
- Glass-like fragments
- Geometric mechanisms
- Dimensional artifacts

Artifacts respond to hover and selection with highlighting, emissive changes, camera focus, surrounding particles, and information panels.

### 03 — WORLDS

A miniature cosmic system containing unique procedural worlds using layered cores, surfaces, atmospheres, clouds, emissive regions, rings, moons, and orbital debris.

### 04 — VALLEY

A gigantic alien dimensional canyon containing:

- Massive procedural rock formations
- Glowing crystals
- Floating islands
- Dimensional energy streams
- Particle waterfalls
- Atmospheric fog
- Floating debris
- Distant alien silhouettes

**VOIDVERSE does not use a city environment.**

### 05 — PEAK

The climax: a gigantic alien mountain containing **THE FINAL PORTAL**.

As the climax activates, mountain energy increases, particles rise, debris orbits, energy streams converge, and the final portal activates.

## ✦ Core Features

### Cinematic Navigation

Supported controls:

- Mouse wheel
- Arrow Up / Arrow Down
- Page Up / Page Down
- Touch swipe
- On-screen navigation

Navigation uses a transition lock so one gesture cannot skip multiple chapters.

### Persistent WebGL Architecture

VOIDVERSE uses **one persistent React Three Fiber Canvas** for the entire experience.

```text
App
│
├── HTML Interface
│
└── ONE persistent Canvas
    │
    ├── Camera
    ├── Global atmosphere
    ├── Particles
    ├── Transition system
    │
    └── Active chapter
        ├── Portal
        ├── Memories
        ├── Worlds
        ├── Valley
        └── Peak
```

The Canvas remains mounted while navigating between chapters.

### 3D Interaction

Interactive objects support hover highlighting, emissive response, scale response, camera focus, selection, contextual information panels, and mobile tap interaction.

### Procedural Graphics

VOIDVERSE is created without external 3D models.

No required `.glb`, `.gltf`, `.fbx`, or `.obj` assets are used. Environments are constructed procedurally with Three.js and React Three Fiber.

### Materials & Atmosphere

The visual system combines metallic, glass-like, crystalline, stone, ceramic, emissive, and transparent materials with fog, particles, layered geometry, and atmospheric effects.

### Lighting

Lighting is intentionally controlled using key, fill, and rim lighting together with emissive materials and ambient/environment contribution.

## ✦ Performance

VOIDVERSE is designed for a normal laptop browser.

Performance techniques include:

- Device-aware pixel ratio
- Reduced particle counts on mobile
- Reusable geometry and materials
- Buffer-based particle systems
- Instancing where appropriate
- Limited lighting and shadows
- Ref-based animation
- Minimal React state updates during animation

### Responsive Experience

Desktop provides richer environments and cinematic framing. Mobile uses wider camera framing, simplified effects, reduced particle density, reduced rendering complexity, and touch navigation.

### Reduced Motion

VOIDVERSE respects:

```css
@media (prefers-reduced-motion: reduce)
```

Camera movement, particle movement, environmental animation, and transition intensity are reduced while preserving the visual experience.

## ✦ Interface

The interface uses:

- Glassmorphism
- Thin borders
- Subtle gradients
- Backdrop blur
- Restrained glow
- Cinematic typography

Brand:

```text
VOIDVERSE
BEYOND THE KNOWN
```

Navigation:

```text
01 PORTAL
02 MEMORIES
03 WORLDS
04 VALLEY
05 PEAK
```

## 🛠 Technology Stack

### Frontend

- React
- React Three Fiber
- Three.js
- @react-three/drei
- CSS
- Vite

### 3D

- Procedural Three.js geometry
- BufferGeometry
- THREE.Points
- Instanced geometry
- Emissive materials
- Transparent materials
- Procedural environmental construction

### Browser APIs

- Pointer events
- Wheel events
- Keyboard events
- Touch events
- `requestAnimationFrame`

## 📂 Project Structure

VOIDVERSE intentionally keeps the application architecture compact.

```text
voidverse/
│
├── src/
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
│
├── public/
│
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

### `src/App.jsx`

Contains the complete application implementation:

- React application
- React Three Fiber Canvas
- All five 3D scenes
- Procedural geometry
- Materials
- Lighting
- Particles
- Camera system
- Transitions
- Navigation
- Interaction
- HUD
- Loading screen
- Responsive quality logic
- Scene data
- Animation logic

### `src/index.css`

Contains the complete visual and UI system:

- Global styles
- Layout
- Typography
- Glass UI
- Navigation
- Buttons
- Information panels
- Loading screen
- Animations
- Transitions
- Responsive rules
- Mobile styling
- Reduced-motion rules

### `src/main.jsx`

The Vite/React entry point responsible for mounting the application. The React root is created here, while `App.jsx` exports the application component.

## ⚙️ Installation

### Clone the repository

```bash
git clone https://github.com/Aurenox/voidverse.git
cd voidverse
```

### Install dependencies

```bash
npm install
```

### Run development server

```bash
npm run dev
```

## 🌌 Narrative Structure

```text
PORTAL
Dimensional fragments
        ↓
MEMORIES
Fragments become artifacts
        ↓
WORLDS
Artifact energy becomes planetary energy
        ↓
VALLEY
Planetary surface becomes alien terrain
        ↓
PEAK
The original dimensional portal returns
```

The journey forms a visual loop:

```text
DISCOVERY
   ↓
MEMORY
   ↓
EXPLORATION
   ↓
DESCENT
   ↓
ASCENSION
   ↓
PORTAL
```

## 🔮 Future Enhancements

Potential future directions include:

- Original soundtrack integration
- More sophisticated audio-reactive visuals
- Additional dimensional artifacts
- Additional worlds
- Expanded environmental storytelling
- Shareable chapter URLs
- Saveable discoveries
- VR/WebXR support
- Advanced procedural terrain
- More cinematic camera sequences

## 👤 Author

**Saurav B**

## 📜 License

This project is developed for **personal and academic purposes**.

All rights reserved unless otherwise specified.

## ✦ Final Statement

VOIDVERSE is an experiment in using the browser as a cinematic medium.

> **What if a website didn't feel like a website?**

Instead of navigating pages, the visitor travels through a continuous dimensional environment — entering the unknown, recovering memories, discovering worlds, descending into an alien landscape, and finally ascending toward the origin of the journey.

**Welcome to VOIDVERSE.**

```text
BEYOND THE KNOWN
```
