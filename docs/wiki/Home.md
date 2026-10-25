# Welcome to the AeroSphere 360 Wiki

**AeroSphere 360** is a modern, high-performance WebGL 360° spherical panorama engine and automated ingestion pipeline designed for aerial drone photographers, GIS engineers, and web developers.

---

## 📑 Wiki Contents

1. **[[Architecture Overview|Architecture]]**
   - High-level system design
   - Three.js WebGL Rendering Engine & Memory Management
   - Multi-Tier Texture Streaming (Thumbnail &rarr; 2K Preview &rarr; 15K Ultra-HD)
   - Shader Pipeline (Little Planet, Curved Conformal, Rectilinear)
   - Astronomical Solar Ephemeris & Compass HUD

2. **[[Drone Processing Pipeline|Processing-Pipeline]]**
   - Automated EXIF extraction (GPS, Altitude, Capture Timestamp, Camera Model)
   - Smart Zenith Inpainting (healing drone camera sky blindspots)
   - Progressive JPEG compression clamped under 24.5 MB
   - Automated generation of `panoramas.json` and Cloudflare D1 SQL seeds

3. **[[Configuration & Customization Guide|Configuration-Reference]]**
   - Feature flags (`panoConfig.ts`)
   - Custom branding and tasteful author attribution
   - Storage endpoints (local relative paths vs Cloudflare R2 / AWS S3)
   - Keyboard navigation remapping

4. **[[Cloudflare Full-Stack Deployment|Cloudflare-Deployment]]**
   - Cloudflare Pages Functions serverless API
   - Cloudflare D1 (Serverless SQLite database) setup & migrations
   - Cloudflare R2 Object Storage integration
   - Real-time visitor analytics, view counters, and short links

---

## 🌟 Live Production Showcase
To experience this engine in production running thousands of 15K aerial panoramas:
👉 **[panorama.trusik.link](https://panorama.trusik.link)**
