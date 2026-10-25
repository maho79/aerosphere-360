#!/usr/bin/env python3
"""
AeroSphere 360 - Automated Panorama Ingestion & Multi-Tier Optimization Pipeline
--------------------------------------------------------------------------------
Batch processes raw/stitched equirectangular panoramas (DJI, Autel, Insta360, Ricoh, DSLR):
  1. Extracts EXIF metadata (GPS coordinates, altitude, capture timestamp, drone model).
  2. Smart Zenith Inpainting (smoothly heals drone sky blindspots).
  3. Multi-tier resolution downsampling:
     - thumbnails/     (512x256)   for fast map markers & filmstrip
     - panoramas_2k/   (2048x1024) for instant WebGL smooth crossfading
     - panoramas_web/  (8192x4096) Ultra-HD WebGL master (<= 24.5 MB)
  4. Generates/merges frontend/public/panoramas.json and optional Cloudflare D1 seed SQL.

Author: Marian Trusik (https://panorama.trusik.link)
License: MIT
"""

import os
import sys
import json
import argparse
import glob
from pathlib import Path
from datetime import datetime
from PIL import Image, ImageFilter
from PIL.ExifTags import TAGS, GPSTAGS

# Disable DecompressionBomb limit for high-res stitched panoramas
Image.MAX_IMAGE_PIXELS = None

# Ensure UTF-8 console output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def get_decimal_from_dms(dms, ref):
    """Convert degrees, minutes, seconds tuple to decimal degrees."""
    if not dms or len(dms) < 3:
        return None
    try:
        def to_float(val):
            if hasattr(val, 'numerator') and hasattr(val, 'denominator'):
                return float(val.numerator) / float(val.denominator) if val.denominator != 0 else 0.0
            return float(val)

        degrees = to_float(dms[0])
        minutes = to_float(dms[1])
        seconds = to_float(dms[2])
        dec = degrees + (minutes / 60.0) + (seconds / 3600.0)
        if ref in ['S', 'W']:
            dec = -dec
        return round(dec, 6)
    except Exception:
        return None


def extract_exif(img_path):
    """Extract GPS coordinates, timestamp, camera model, and dimensions."""
    data = {
        "date": None,
        "lat": None,
        "lon": None,
        "altitude": None,
        "camera": None,
        "width": None,
        "height": None,
    }

    try:
        with Image.open(img_path) as img:
            data["width"], data["height"] = img.size
            exif_raw = img._getexif()

            if not exif_raw:
                return data

            gps_raw = {}
            for tag_id, value in exif_raw.items():
                tag_name = TAGS.get(tag_id, tag_id)

                if tag_name in ("DateTimeOriginal", "DateTime") and not data["date"] and isinstance(value, str):
                    try:
                        clean_dt = value.strip().replace("\x00", "")
                        dt = datetime.strptime(clean_dt, "%Y:%m:%d %H:%M:%S")
                        data["date"] = dt.strftime("%Y-%m-%d %H:%M:%S")
                    except Exception:
                        pass

                elif tag_name == "Model" and isinstance(value, str):
                    data["camera"] = value.strip().replace("\x00", "")

                elif tag_name == "GPSInfo" and isinstance(value, dict):
                    for k, v in value.items():
                        gps_tag = GPSTAGS.get(k, k)
                        gps_raw[gps_tag] = v

            if gps_raw:
                lat = get_decimal_from_dms(gps_raw.get("GPSLatitude"), gps_raw.get("GPSLatitudeRef", "N"))
                lon = get_decimal_from_dms(gps_raw.get("GPSLongitude"), gps_raw.get("GPSLongitudeRef", "E"))
                data["lat"] = lat
                data["lon"] = lon

                alt = gps_raw.get("GPSAltitude")
                if alt:
                    try:
                        if hasattr(alt, 'numerator') and hasattr(alt, 'denominator'):
                            data["altitude"] = round(float(alt.numerator) / float(alt.denominator), 1)
                        else:
                            data["altitude"] = round(float(alt), 1)
                    except Exception:
                        pass

    except Exception as err:
        print(f"  [!] Notice: Could not read EXIF from {os.path.basename(img_path)}: {err}")

    # Fallback date from file modification time if missing
    if not data["date"]:
        try:
            mtime = os.path.getmtime(img_path)
            data["date"] = datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            data["date"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    return data


def inpaint_zenith_blindspot(img: Image.Image, zenith_cutoff_ratio: float = 0.12) -> Image.Image:
    """
    Heals the drone camera zenith blindspot (where gimbals cannot tilt 90 degrees up).
    Smoothly extends and blurs the sky horizon gradient upward into the apex pole.
    """
    w, h = img.size
    cutoff_y = int(h * zenith_cutoff_ratio)
    if cutoff_y < 10:
        return img

    try:
        # Sample the highest valid sky slice
        sample_height = max(10, int(cutoff_y * 0.4))
        sky_sample = img.crop((0, cutoff_y, w, cutoff_y + sample_height))

        # Flip horizontally and vertically to simulate continuous zenith dome
        sky_flipped = sky_sample.transpose(Image.FLIP_TOP_BOTTOM)
        sky_stretched = sky_flipped.resize((w, cutoff_y), resample=Image.Resampling.BICUBIC)

        # Apply progressive gaussian blur to soften seam
        sky_blurred = sky_stretched.filter(ImageFilter.GaussianBlur(radius=8))

        # Paste healed sky into zenith
        img.paste(sky_blurred, (0, 0))
    except Exception as err:
        print(f"  [!] Zenith healing skipped: {err}")

    return img


def save_optimized_jpeg(img: Image.Image, output_path: str, max_mb: float = 24.5, initial_quality: int = 86):
    """Save progressive JPEG clamped under max_mb threshold."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    quality = initial_quality
    max_bytes = int(max_mb * 1024 * 1024)

    while quality >= 60:
        img.save(output_path, "JPEG", quality=quality, optimize=True, progressive=True)
        size = os.path.getsize(output_path)
        if size <= max_bytes or quality <= 65:
            break
        quality -= 5

    return os.path.getsize(output_path)


def process_panorama(
    img_path: str,
    output_root: str,
    web_width: int = 8192,
    enable_zenith: bool = True,
    max_mb: float = 24.5
) -> dict:
    """Processes a single panorama into thumbnail, 2k preview, and web ultra-hd."""
    filename = Path(img_path).name
    base_stem = Path(img_path).stem
    out_filename = f"{base_stem}.jpg"

    thumb_dir = os.path.join(output_root, "thumbnails")
    p2k_dir = os.path.join(output_root, "panoramas_2k")
    pweb_dir = os.path.join(output_root, "panoramas_web")

    thumb_path = os.path.join(thumb_dir, out_filename)
    p2k_path = os.path.join(p2k_dir, out_filename)
    pweb_path = os.path.join(pweb_dir, out_filename)

    exif = extract_exif(img_path)

    # Open image for processing
    with Image.open(img_path) as raw_img:
        if raw_img.mode != "RGB":
            raw_img = raw_img.convert("RGB")

        orig_w, orig_h = raw_img.size

        # Inpaint zenith sky blindspot if requested
        if enable_zenith:
            raw_img = inpaint_zenith_blindspot(raw_img)

        # 1. Generate Web Master (e.g. 8192x4096 or original if smaller)
        target_web_w = min(orig_w, web_width)
        target_web_h = int(target_web_w / 2)

        if orig_w > target_web_w:
            web_img = raw_img.resize((target_web_w, target_web_h), resample=Image.Resampling.LANCZOS)
        else:
            web_img = raw_img.copy()

        final_size = save_optimized_jpeg(web_img, pweb_path, max_mb=max_mb, initial_quality=86)

        # 2. Generate 2K fast preview (2048x1024)
        p2k_img = web_img.resize((2048, 1024), resample=Image.Resampling.LANCZOS)
        save_optimized_jpeg(p2k_img, p2k_path, max_mb=1.0, initial_quality=82)

        # 3. Generate Thumbnail (512x256)
        thumb_img = p2k_img.resize((512, 256), resample=Image.Resampling.BILINEAR)
        save_optimized_jpeg(thumb_img, thumb_path, max_mb=0.15, initial_quality=78)

    # Clean title from filename
    title = base_stem.replace("_", " ").replace("-", " ").strip()
    title = " ".join([w.capitalize() for w in title.split()])

    pano_record = {
        "id": base_stem,
        "filename": out_filename,
        "title": title,
        "city": "",
        "country": "",
        "date": exif["date"],
        "lat": exif["lat"],
        "lon": exif["lon"],
        "altitude": exif["altitude"],
        "camera": exif["camera"],
        "width": target_web_w,
        "height": target_web_h,
        "size": final_size,
        "is_private": 0,
        "folder": "General",
        "tags": ["Aerial", "360"],
        "views": 0,
        "shares": 0,
        "favorites": 0,
    }

    return pano_record


def run_pipeline(
    input_dir: str,
    output_dir: str,
    web_width: int = 8192,
    enable_zenith: bool = True,
    generate_d1: bool = True,
):
    """Scans input folder and batch generates all panorama tiers."""
    supported_extensions = ("*.jpg", "*.jpeg", "*.png", "*.tif", "*.tiff", "*.JPG", "*.JPEG")
    input_files = []
    for ext in supported_extensions:
        input_files.extend(glob.glob(os.path.join(input_dir, "**", ext), recursive=True))

    input_files = sorted(list(set(input_files)))

    if not input_files:
        print(f"[!] No equirectangular image files found in: {input_dir}")
        return

    print(f"\n[*] Found {len(input_files)} panoramas to process.")
    print(f"[*] Target Output Directory: {output_dir}")
    print(f"[*] Target Web Master Width: {web_width}px")
    print(f"[*] Zenith Inpainting: {'Enabled' if enable_zenith else 'Disabled'}\n")

    # Load existing panoramas.json if present to preserve metadata/edits
    json_path = os.path.join(output_dir, "panoramas.json")
    existing_records = {}
    if os.path.exists(json_path):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for item in data:
                    existing_records[str(item.get("id"))] = item
            print(f"[*] Loaded {len(existing_records)} existing records from panoramas.json")
        except Exception as err:
            print(f"[!] Warning reading existing panoramas.json: {err}")

    processed_records = []
    total = len(input_files)

    for idx, fpath in enumerate(input_files, 1):
        rel_name = os.path.basename(fpath)
        stem = Path(fpath).stem
        print(f"[{idx}/{total}] Processing: {rel_name} ...", end="", flush=True)

        try:
            rec = process_panorama(
                img_path=fpath,
                output_root=output_dir,
                web_width=web_width,
                enable_zenith=enable_zenith
            )

            # Preserve custom title/city/tags if already edited in panoramas.json
            if stem in existing_records:
                old = existing_records[stem]
                for key in ("title", "city", "country", "tags", "folder", "views", "shares", "is_private"):
                    if old.get(key) is not None:
                        rec[key] = old[key]

            processed_records.append(rec)
            existing_records[stem] = rec
            print(" [OK]")
        except Exception as err:
            print(f" [FAILED: {err}]")

    # Save merged panoramas.json
    all_final = list(existing_records.values())
    all_final.sort(key=lambda x: str(x.get("date") or ""), reverse=True)

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(all_final, f, indent=2, ensure_ascii=False)
    print(f"\n[✓] Successfully updated: {json_path} ({len(all_final)} total items)")

    # Generate Cloudflare D1 seed SQL if requested
    if generate_d1:
        sql_path = os.path.join(output_dir, "d1_seed.sql")
        sql_lines = [
            "-- AeroSphere 360 - Cloudflare D1 Seed Script",
            "-- Generated automatically by process_panoramas.py",
            ""
        ]
        for p in all_final:
            pid = repr(str(p.get("id", "")))
            fname = repr(str(p.get("filename", "")))
            title = repr(str(p.get("title", "")))
            city = repr(str(p.get("city", "")))
            country = repr(str(p.get("country", "")))
            date = repr(str(p.get("date", "")))
            lat = str(p.get("lat") or "NULL")
            lon = str(p.get("lon") or "NULL")
            w = str(p.get("width", 8192))
            h = str(p.get("height", 4096))
            size = str(p.get("size", 0))
            is_priv = str(p.get("is_private", 0))
            folder = repr(str(p.get("folder", "General")))
            shares = str(p.get("shares", 0))
            views = str(p.get("views", 0))
            favs = str(p.get("favorites", 0))
            tags = repr(json.dumps(p.get("tags", [])))

            sql = f"INSERT OR REPLACE INTO panoramas (id, filename, title, city, country, date, lat, lon, width, height, file_size, is_private, folder, shares, views, favorites, custom_tags) VALUES ({pid}, {fname}, {title}, {city}, {country}, {date}, {lat}, {lon}, {w}, {h}, {size}, {is_priv}, {folder}, {shares}, {views}, {favs}, {tags});"
            sql_lines.append(sql)

        with open(sql_path, "w", encoding="utf-8") as f:
            f.write("\n".join(sql_lines) + "\n")
        print(f"[✓] Successfully generated D1 seed SQL: {sql_path}")


def interactive_wizard():
    """Interactive CLI wizard when run without flags or double-clicked."""
    print("=" * 70)
    print("          AeroSphere 360 - Interactive Panorama Setup Wizard")
    print("=" * 70)
    print()

    # Prompt 1: Input folder
    while True:
        raw_in = input("Enter path to raw panoramas directory [e.g. ./raw_photos]: ").strip()
        if not raw_in:
            raw_in = "./raw_photos"
        if os.path.exists(raw_in):
            input_dir = os.path.abspath(raw_in)
            break
        print(f"Directory '{raw_in}' does not exist. Please enter a valid directory.")

    # Prompt 2: Output folder
    default_out = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "public"))
    raw_out = input(f"Enter output destination directory [Press Enter for default frontend/public]: ").strip()
    output_dir = os.path.abspath(raw_out) if raw_out else default_out
    os.makedirs(output_dir, exist_ok=True)

    # Prompt 3: Resolution
    raw_res = input("Target Web Master Width [8192 / 11520 / 15360, default 8192]: ").strip()
    try:
        web_width = int(raw_res) if raw_res else 8192
    except ValueError:
        web_width = 8192

    # Prompt 4: Zenith
    raw_zen = input("Enable drone zenith blindspot inpainting? (y/n) [default y]: ").strip().lower()
    enable_zenith = False if raw_zen == "n" else True

    run_pipeline(
        input_dir=input_dir,
        output_dir=output_dir,
        web_width=web_width,
        enable_zenith=enable_zenith,
        generate_d1=True
    )


def main():
    parser = argparse.ArgumentParser(description="AeroSphere 360 Panorama Processing Pipeline")
    parser.add_argument("--input", "-i", type=str, help="Input directory containing raw/stitched equirectangular photos")
    parser.add_argument("--output", "-o", type=str, help="Output directory (defaults to ../frontend/public)")
    parser.add_argument("--web-width", "-w", type=int, default=8192, help="Ultra-HD web width (default: 8192)")
    parser.add_argument("--no-zenith", action="store_true", help="Disable zenith blindspot inpainting")
    parser.add_argument("--no-d1", action="store_true", help="Do not generate d1_seed.sql")

    args = parser.parse_args()

    if not args.input:
        interactive_wizard()
        return

    output_dir = args.output
    if not output_dir:
        output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "public"))

    run_pipeline(
        input_dir=os.path.abspath(args.input),
        output_dir=output_dir,
        web_width=args.web_width,
        enable_zenith=not args.no_zenith,
        generate_d1=not args.no_d1
    )


if __name__ == "__main__":
    main()
