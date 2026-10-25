# Architecture Overview

AeroSphere 360 is engineered as a modern, decoupled system consisting of three core tiers:

```
[ Drone / Camera Capture ]
           │
           ▼
[ Python CLI Pipeline ] ──► Inpainting & Multi-Tier Optimization
           │
           ├──► thumbnails/     (512x256)
           ├──► panoramas_2k/   (2048x1024)
           └──► panoramas_web/  (8192x4096 / up to 15K <= 24.5MB)
           │
           ▼
[ Frontend WebGL Client ] ◄──► [ Edge Serverless Layer (Cloudflare Pages + D1) ]
```

---

## 1. WebGL Three.js Panoramic Rendering Engine

The 360 viewer is built on Three.js and custom GLSL shaders running directly on the GPU.

### Sphere Geometry & Inverted Normals
Panoramas are mapped onto an equirectangular inverted sphere geometry (`THREE.SphereGeometry`). The camera is placed at `(0, 0, 0)` at the exact center of the sphere.

### Multi-Tier Progressive Texture Streaming
To guarantee instant transitions with zero screen flicker or browser lag:
1. **Tier 1 (Instant Thumbnail):** A tiny `512x256` preview is instantly bound to the sphere.
2. **Tier 2 (2K Fast Texture):** A lightweight `2048x1024` progressive JPEG (~200 KB) is loaded in parallel. The engine executes a smooth crossfade shader transition from the previous panorama to the new one.
3. **Tier 3 (Ultra-HD Master):** The 8K–15K master texture is asynchronously fetched in chunks. Once GPU upload is verified, it seamlessly replaces the 2K texture without interrupting user interaction or inertia rotation.

### GPU Memory Management & Resource Disposal
High-resolution 15K textures consume significant VRAM. AeroSphere 360 includes an active texture cache manager:
- Textures are automatically disposed (`texture.dispose()`, `material.dispose()`) when switching scenes.
- Preloading is restricted to adjacent timeline neighbors to prevent mobile browser memory exhaustion.

---

## 2. Dynamic Shader Projections

AeroSphere 360 includes three distinct projection modes powered by custom fragment shaders:

### A. Rectilinear (Natural Perspective)
- Standard perspective projection simulating a human eye or ultra-wide camera lens.
- Smooth Field of View (FOV) zooming from 120° (wide aerial overview) down to 10° (telephoto inspection).

### B. Little Planet (Stereographic Projection)
- Conformal stereographic mapping that wraps the ground into a spherical mini-world surrounded by the sky.
- Continuous yaw auto-rotation and interactive pitch/zoom.

### C. Curved / Cylindrical Horizon
- Wide-angle cylindrical projection preserving vertical lines while expanding horizontal peripheral vision.

---

## 3. Geospatial & Solar Synchronization

### Leaflet GPS Clustering
- Interactive Leaflet map featuring GPS markers with dynamic directional FOV radar cones.
- The radar cone dynamically rotates in real-time matching the Three.js camera yaw heading.

### Time-Travel Timeline Clustering
- Panoramas taken within 120 meters of each other across different dates are automatically clustered into a temporal sequence.
- Users can scrub backwards and forwards in time to observe environmental, seasonal, and urban development changes over years.

### Solar Compass HUD
- Computes real-time astronomical solar position (azimuth and elevation) using solar ephemeris algorithms based on the photo's GPS coordinates and capture timestamp.
- Renders a floating solar compass reticle directly inside the 360° space matching the actual physical sun in the sky.
