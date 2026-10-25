# AeroSphere 360

> **Next-Gen WebGL 360° Aerial Panorama Engine & Drone Processing Pipeline**

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-black.svg)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-purple.svg)](https://vitejs.dev/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages%20%26%20D1-orange.svg)](https://pages.cloudflare.com/)

**AeroSphere 360** is an open-source, production-grade platform for viewing, exploring, and batch-processing ultra-high-resolution 360° aerial and spherical panoramas. Originally engineered by [Marian Trusik](https://panorama.trusik.link) to power [panorama.trusik.link](https://panorama.trusik.link), this project is now fully open-source for photographers, drone pilots, GIS engineers, and web developers worldwide.

---

## 🌟 Live Demo & Showcase

Experience the engine in production with thousands of 15K aerial panoramas:
👉 **[panorama.trusik.link](https://panorama.trusik.link)**

---

## ✨ Features

### 🔭 WebGL 360° Panorama Viewer (Three.js)
- **Ultra-HD Texture Streaming:** Seamless three-tier resolution progressive loading (Thumbnail &rarr; 2K Fast Preview &rarr; 8K/15K Ultra-HD) with GPU memory management.
- **Multiple Projections:**
  - **Rectilinear:** Natural perspective with customizable Field of View (FOV).
  - **Little Planet (Stereographic):** Dynamic tiny-planet projection with mouse-wheel zoom and auto-rotation.
  - **Curved / Cylindrical:** Panoramic horizon view.
- **Micro-Smooth Zoom & Navigation:** Precise 1% zoom steps, inertia dampening, keyboard navigation, and touch gestures.
- **Zenith Inpainting:** Automatic inpainting and blending of drone camera sky blindspots.

### 🗺️ Geospatial Exploration & Interactive Minimap
- **Leaflet World Map:** GPS clustered markers, custom radar FOV cones, and dark/satellite tile layers.
- **Synchronized Minimap:** Real-time orientation radar tracking viewer yaw and pitch on the map.
- **Interactive Filmstrip:** Filter by location, date, year, resolution, weather, or custom tags.
- **Time-Travel Timeline Clusters:** Seamlessly switch between captures of the exact same location taken across different years and seasons.

### ☀️ Solar Compass HUD
- Real-time astronomical solar ephemeris calculation based on latitude, longitude, and capture timestamp.
- Renders sun azimuth and elevation overlaid directly inside the 360° sphere.

### 🎬 Media Export & Studio
- **4K Ultra-HD Video Export:** Generate orbital cinematic flyover videos directly in the browser with anti-aliasing / anti-moiré filtering.
- **Branded Screenshots:** 4K landscape (16:9) or portrait (9:16) image capture with customizable author watermark and GPS coordinates.
- **Google Earth KML Export:** Dynamic network link feed and bulk KML exports for 3D exploration in Google Earth.

### ⚙️ Automated Python Ingestion Pipeline
- User-friendly CLI tool (`cli/process_panoramas.py`) and 1-click Windows launcher (`Run_Pipeline.bat`).
- Extracts EXIF metadata, GPS, altitude, and timestamp from raw drone photos.
- Batch generates optimized thumbnails, 2K previews, and Ultra-HD web masters (clamped under 24.5 MB).
- Generates/merges `panoramas.json` and optional Cloudflare D1 seed SQL.

---

## 🚀 Quick Start (Zero-Config Static Mode)

AeroSphere 360 comes pre-packaged with **5 real sample aerial panoramas** (Bratislava, Sloup Czechia, High Tatras, Rhodes, and Morava River Basin) so you can run it immediately with zero setup!

### 1. Clone the repository
```bash
git clone https://github.com/your-username/aerosphere-360.git
cd aerosphere-360/frontend
```

### 2. Install dependencies & start dev server
```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. You have a fully interactive 360° panorama platform running locally!

---

## 🛠️ Processing Your Own Drone Panoramas

To add your own DJI, Autel, Insta360, or DSLR panoramas:

### Option A: 1-Click Interactive Launcher (Windows)
Double-click `cli/Run_Pipeline.bat`. It will install dependencies and guide you through an interactive wizard.

### Option B: Command Line (Linux / macOS / Windows)
```bash
cd cli
pip install -r requirements.txt

# Process photos from raw folder directly into the frontend public directory
python process_panoramas.py --input /path/to/my_drone_photos --output ../frontend/public
```

The script will:
1. Scan for `.jpg`, `.jpeg`, `.png`, `.tif` files.
2. Read GPS coordinates, altitude, and timestamps from EXIF.
3. Automatically heal empty sky blindspots (zenith inpainting).
4. Generate `thumbnails/`, `panoramas_2k/`, and `panoramas_web/`.
5. Update `frontend/public/panoramas.json` and generate `d1_seed.sql`.

---

## ⚙️ Configuration & Customization

All platform settings are centralized in [`frontend/src/config/panoConfig.ts`](./frontend/src/config/panoConfig.ts):

```typescript
export const panoConfig: PanoConfig = {
  branding: {
    appName: 'AeroSphere 360',
    tagline: 'Interactive 360° Aerial Panorama Engine',
    author: {
      name: 'Marian Trusik',
      url: 'https://panorama.trusik.link',
      showCreditBadge: true, // Display tasteful attribution pill
    },
  },
  features: {
    enableTimeTravelClusters: true,
    enableSolarCompassHUD: true,
    enableVideoExport: true,
    enableGoogleEarthKML: true,
  },
  storage: {
    // Keep local relative paths OR point to your own Cloudflare R2 / AWS S3 CDN
    thumbnailsUrl: import.meta.env.VITE_STORAGE_THUMBNAILS_URL || '/thumbnails',
    panoramas2kUrl: import.meta.env.VITE_STORAGE_2K_URL || '/panoramas_2k',
    panoramasWebUrl: import.meta.env.VITE_STORAGE_WEB_URL || '/panoramas_web',
  },
};
```

---

## 🌐 Internationalization (i18n)

AeroSphere 360 includes full English and Slovak localizations, with a modular architecture for adding any language:

- **English (`en`):** Default international language.
- **Slovak (`sk`):** Complete production case study translation.
- **Template (`locale_template.json`):** Located at [`frontend/src/i18n/locale_template.json`](./frontend/src/i18n/locale_template.json). Simply copy this file to create your own language (e.g. `de.json`, `es.json`, `ja.json`) and register it in `frontend/src/i18n.ts`.

---

## ☁️ Deployment

### 1. Static Web Hosting (GitHub Pages / Vercel / Netlify)
Build the frontend:
```bash
cd frontend
npm run build
```
Deploy the generated `frontend/dist` directory to any static hosting service.

### 2. Cloudflare Pages + D1 Database + R2 Storage
For large collections with visitor analytics, view counters, and dynamic sharing:
1. Initialize Cloudflare D1:
   ```bash
   wrangler d1 create aerosphere-db
   wrangler d1 execute aerosphere-db --file=schema.sql
   wrangler d1 execute aerosphere-db --file=d1_seed_sample.sql
   ```
2. Upload high-res panoramas to Cloudflare R2 bucket.
3. Deploy frontend with Cloudflare Pages Functions (`functions/api/`).

---

## 📜 License & Attribution

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

### Attribution
If you use AeroSphere 360 in your own projects, website, or research, please retain the subtle author attribution badge linking to [panorama.trusik.link](https://panorama.trusik.link), or mention:

> **Powered by AeroSphere 360** — Engineered by [Marian Trusik](https://panorama.trusik.link).
