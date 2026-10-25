# Drone Processing Pipeline

AeroSphere 360 includes a Python 3 CLI tool (`cli/process_panoramas.py`) and Windows launcher (`cli/Run_Pipeline.bat`) designed to automate the ingestion of raw drone panoramas.

---

## 1. Automated EXIF Metadata Extraction

The ingestion tool parses EXIF tags directly from JPEG, TIFF, or PNG metadata:
- **GPS Coordinates:** Converts DMS (Degrees, Minutes, Seconds) into signed decimal coordinates (WGS 84).
- **Altitude:** Reads barometric or GPS altitude above sea level.
- **Timestamp:** Formats `DateTimeOriginal` into ISO 8601 strings (`YYYY-MM-DD HH:MM:SS`).
- **Camera/Drone Model:** Automatically identifies DJI, Autel, Ricoh, or custom camera hardware.

---

## 2. Smart Zenith Inpainting (Sky Healing)

Most consumer and commercial drones (e.g. DJI Mini, Air, Mavic series) have gimbal pitch limits preventing the camera from tilting 90° straight up into the zenith. This leaves a missing circular "black hole" or gray pole at the top of stitched panoramas.

AeroSphere 360 solves this with **Smart Zenith Inpainting**:
1. Analyzes the top 12–15% cutoff boundary.
2. Extracts the upper sky color gradient.
3. Vertically and horizontally mirrors the gradient toward the pole apex.
4. Applies a progressive directional Gaussian blur to eliminate visible seams.
5. Inpaints the sky seamlessly so the sky dome looks completely natural when visitors tilt their view straight up.

---

## 3. Multi-Tier Resolution Downsampling

To balance visual quality with mobile bandwidth limits:
- **Thumbnails (`thumbnails/`):** Clamped to `512x256`, ~15–25 KB. Used for map markers, search lists, and bottom filmstrip drawers.
- **2K Previews (`panoramas_2k/`):** Progressive JPEG `2048x1024`, ~150–250 KB. Used for immediate rendering upon scene load.
- **Web Masters (`panoramas_web/`):** Progressive JPEG `8192x4096` (or up to 15K). Clamped under **24.5 MB** using iterative adaptive quality reduction to ensure compatibility with edge CDN file size limits.

---

## 4. Metadata Indexing & Database Export

Upon completion, the pipeline:
1. Loads existing `panoramas.json` (if present) to preserve manual user annotations, custom titles, or location overrides.
2. Merges newly processed items.
3. Generates Cloudflare D1 seed SQL (`d1_seed.sql`) containing ready-to-execute `INSERT OR REPLACE` statements.
