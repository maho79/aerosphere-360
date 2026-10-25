import os

viewer_path = r'c:\Users\majot\Desktop\antigravity\aerosphere-360\frontend\src\components\ThreePanoViewer.tsx'
with open(viewer_path, 'r', encoding='utf-8') as f:
    c = f.read()

if 'import { panoConfig }' not in c:
    c = "import { panoConfig } from '../config/panoConfig';\n" + c

# Replace hardcoded base urls with config
c = c.replace(
    "const pano2kUrl = `https://r2-panoramas.trusik.link/panoramas_2k/${cleanKey}${cacheBuster}`;",
    "const pano2kUrl = `${panoConfig.storage.panoramas2kUrl}/${cleanKey}${cacheBuster}`;"
)
c = c.replace(
    "const r2ThumbPath = `https://r2-panoramas.trusik.link/thumbnails/${cleanFilename}${cacheBuster}`;",
    "const r2ThumbPath = `${panoConfig.storage.thumbnailsUrl}/${cleanFilename}${cacheBuster}`;"
)
c = c.replace(
    "const pano2kDirectPath = `https://r2-panoramas.trusik.link/panoramas_2k/${cleanFilename}${cacheBuster}`;",
    "const pano2kDirectPath = `${panoConfig.storage.panoramas2kUrl}/${cleanFilename}${cacheBuster}`;"
)
c = c.replace(
    "const pano8kDirectPath = `https://r2-panoramas.trusik.link/panoramas_8k/${cleanFilename}${cacheBuster}`;",
    "const pano8kDirectPath = `${panoConfig.storage.panoramasWebUrl}/${cleanFilename}${cacheBuster}`;"
)

with open(viewer_path, 'w', encoding='utf-8') as f:
    f.write(c)

print('Updated ThreePanoViewer.tsx')
