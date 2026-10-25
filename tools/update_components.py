import os

FRONTEND = r'c:\Users\majot\Desktop\antigravity\aerosphere-360\frontend'

def update_file(rel_path, fn):
    p = os.path.join(FRONTEND, rel_path.replace('/', os.sep))
    if not os.path.exists(p):
        print(f'File not found: {p}')
        return
    with open(p, 'r', encoding='utf-8') as f:
        content = f.read()
    new_content = fn(content)
    if new_content != content:
        with open(p, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated: {rel_path}')

# MapView.tsx
def fix_mapview(c):
    if 'import { panoConfig }' not in c:
        c = "import { panoConfig } from '../config/panoConfig';\nimport { AuthorCreditBadge } from './AuthorCreditBadge';\n" + c
    c = c.replace("'360° Panoramas | trusik.link'", "panoConfig.branding.appName")
    c = c.replace("`https://r2-panoramas.trusik.link/panoramas_2k/${cleanPanoPath(pano.filename)}`", "`${panoConfig.storage.panoramas2kUrl}/${cleanPanoPath(pano.filename)}`")
    c = c.replace("`https://r2-panoramas.trusik.link/thumbnails/${cleanPanoPath(pano.filename)}`", "`${panoConfig.storage.thumbnailsUrl}/${cleanPanoPath(pano.filename)}`")
    c = c.replace("`https://r2-panoramas.trusik.link/thumbnails/${clean}`", "`${panoConfig.storage.thumbnailsUrl}/${clean}`")
    c = c.replace("`https://r2-panoramas.trusik.link/thumbnails/${cleanPanoPath(p.filename)}`", "`${panoConfig.storage.thumbnailsUrl}/${cleanPanoPath(p.filename)}`")
    # Add AuthorCreditBadge to MapView JSX
    needle = '<div className="w-full h-full relative overflow-hidden bg-[#090a0f]">'
    if needle in c and '<AuthorCreditBadge' not in c:
        replacement = needle + "\n      {/* AeroSphere 360 Attribution */}\n      <AuthorCreditBadge variant=\"pill\" className=\"absolute bottom-5 left-4 z-[400] hidden sm:flex\" />\n"
        c = c.replace(needle, replacement, 1)
    return c

update_file('src/components/MapView.tsx', fix_mapview)

# SidebarFilter.tsx
def fix_sidebar(c):
    if 'import { panoConfig }' not in c:
        c = "import { panoConfig } from '../config/panoConfig';\n" + c
    c = c.replace("`https://r2-panoramas.trusik.link/thumbnails/${clean}`", "`${panoConfig.storage.thumbnailsUrl}/${clean}`")
    return c

update_file('src/components/SidebarFilter.tsx', fix_sidebar)

# AdminSmartGpsModal.tsx
def fix_smartgps(c):
    if 'import { panoConfig }' not in c:
        c = "import { panoConfig } from '../config/panoConfig';\n" + c
    c = c.replace("`https://r2-panoramas.trusik.link/thumbnails/${clean}`", "`${panoConfig.storage.thumbnailsUrl}/${clean}`")
    return c

update_file('src/components/AdminSmartGpsModal.tsx', fix_smartgps)

# AdminClusterCalibrationModal.tsx
def fix_cluster_calib(c):
    if 'import { panoConfig }' not in c:
        c = "import { panoConfig } from '../config/panoConfig';\n" + c
    c = c.replace("`https://r2-panoramas.trusik.link/thumbnails/${cleanPanoPath(targetPano.filename)}`", "`${panoConfig.storage.thumbnailsUrl}/${cleanPanoPath(targetPano.filename)}`")
    c = c.replace("`https://r2-panoramas.trusik.link/thumbnails/${cleanPanoPath(refPano.filename)}`", "`${panoConfig.storage.thumbnailsUrl}/${cleanPanoPath(refPano.filename)}`")
    return c

update_file('src/components/AdminClusterCalibrationModal.tsx', fix_cluster_calib)

# App.tsx - wire AuthorCreditBadge in header and drawer
def fix_app(c):
    if 'import { panoConfig }' not in c:
        c = "import { panoConfig } from './config/panoConfig';\nimport { AuthorCreditBadge } from './components/AuthorCreditBadge';\n" + c
    c = c.replace("'360° Panoramas | trusik.link'", "panoConfig.branding.appName")
    c = c.replace("360° Panoramas | trusik.link", "AeroSphere 360")
    # Add AuthorCreditBadge in mobile drawer before admin/service buttons
    drawer_target = '{/* Mobile Feedback Link */}'
    if drawer_target in c and '<AuthorCreditBadge variant="footer"' not in c:
        c = c.replace(drawer_target, '<AuthorCreditBadge variant="footer" className="mt-2" />\n            ' + drawer_target)
    # Add AuthorCreditBadge in header next to help
    help_btn = '{/* Prominent UI Help Guide Button (?) */}'
    if help_btn in c and '<AuthorCreditBadge variant="pill" className="hidden xl:flex"' not in c:
        c = c.replace(help_btn, '<AuthorCreditBadge variant="pill" className="hidden xl:flex mr-1" />\n        ' + help_btn)
    return c

update_file('src/App.tsx', fix_app)

print('Updated components with dynamic config & credit badges.')
