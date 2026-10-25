import os
import re

FRONTEND = r'c:\Users\majot\Desktop\antigravity\aerosphere-360\frontend'

def sanitize_file(path, replacements):
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    orig = content
    for old, new in replacements:
        content = content.replace(old, new)
    if content != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Sanitized: {path}')

# 1. vite.config.ts
sanitize_file(
    os.path.join(FRONTEND, 'vite.config.ts'),
    [
        ("'majo.trusik@gmail.com'", "process.env.VITE_ADMIN_EMAIL || 'admin@example.com'"),
        ("'Access denied. Restricted to majo.trusik@gmail.com'", "`Access denied. Restricted to ${process.env.VITE_ADMIN_EMAIL || 'admin@example.com'}`"),
        ("name: payload.name || 'Majo Trusik'", "name: payload.name || 'Administrator'"),
        ("name: 'Majo Trusik'", "name: 'Administrator'"),
    ]
)

# 2. AdminModal.tsx
admin_modal = os.path.join(FRONTEND, 'src', 'components', 'AdminModal.tsx')
with open(admin_modal, 'r', encoding='utf-8') as f:
    am_c = f.read()
if 'import { panoConfig }' not in am_c:
    am_c = "import { panoConfig } from '../config/panoConfig';\n" + am_c
am_c = am_c.replace('(majo.trusik@gmail.com)', '(${panoConfig.auth.allowedAdminEmail})')
with open(admin_modal, 'w', encoding='utf-8') as f:
    f.write(am_c)
print('Sanitized: AdminModal.tsx')

# 3. FeedbackModal.tsx
sanitize_file(
    os.path.join(FRONTEND, 'src', 'components', 'FeedbackModal.tsx'),
    [
        ("Správa dorazí priamo autorovi (majo.trusik@gmail.com)", "Správa dorazí priamo administrátorovi"),
        ("Message will be delivered to the author (majo.trusik@gmail.com)", "Message will be delivered to the administrator"),
    ]
)

# 4. ServiceMenu.tsx
sanitize_file(
    os.path.join(FRONTEND, 'src', 'components', 'ServiceMenu.tsx'),
    [
        ("trusik_db_dump_", "aerosphere_db_dump_"),
        ("https://panorama.trusik.link/api/panoramas/kml", "${window.location.origin}/api/panoramas/kml"),
        ("'https://panorama.trusik.link/api/panoramas/kml'", "`${window.location.origin}/api/panoramas/kml`"),
        ("TRUSIK_KV (b3d81e091b35458eb2eee58ea2cc3d07)", "AEROSPHERE_KV (Cloudflare KV Namespace)"),
    ]
)

# 5. videoExport.ts
video_path = os.path.join(FRONTEND, 'src', 'utils', 'videoExport.ts')
with open(video_path, 'r', encoding='utf-8') as f:
    v_c = f.read()
v_c = re.sub(
    r"const origin = window\.location\.origin\.includes\('trusik\.link'\)\s*\?\s*window\.location\.origin\s*:\s*'https://panorama\.trusik\.link';",
    "const origin = window.location.origin;",
    v_c
)
v_c = v_c.replace("'https://panorama.trusik.link/?pano='", "`${window.location.origin}/?pano=`")
with open(video_path, 'w', encoding='utf-8') as f:
    f.write(v_c)
print('Sanitized: videoExport.ts')

# 6. index.html
index_path = os.path.join(FRONTEND, 'index.html')
sanitize_file(
    index_path,
    [
        ("<title>360° Panoramas | trusik.link</title>", "<title>AeroSphere 360 - Interactive Aerial Panorama Engine</title>"),
        ('content="360° Panoramas | trusik.link"', 'content="AeroSphere 360"'),
        ('page_title: \'360° Panoramas | trusik.link\'', "page_title: 'AeroSphere 360'"),
    ]
)

# 7. geo.ts
geo_path = os.path.join(FRONTEND, 'src', 'utils', 'geo.ts')
sanitize_file(
    geo_path,
    [
        ("panorama_trusik_link", "aerosphere_360"),
    ]
)

# 8. analytics.ts
analytics_path = os.path.join(FRONTEND, 'src', 'utils', 'analytics.ts')
with open(analytics_path, 'r', encoding='utf-8') as f:
    ana_c = f.read()
if 'import { panoConfig }' not in ana_c:
    ana_c = "import { panoConfig } from '../config/panoConfig';\n" + ana_c
ana_c = ana_c.replace("'G-8D0W2TW0C5'", "panoConfig.analytics.googleAnalyticsId || ''")
ana_c = ana_c.replace("'360° Panoramas | trusik.link'", "`${panoConfig.branding.appName}`")
with open(analytics_path, 'w', encoding='utf-8') as f:
    f.write(ana_c)
print('Sanitized: analytics.ts')

print('All targeted sanitizations completed successfully.')
