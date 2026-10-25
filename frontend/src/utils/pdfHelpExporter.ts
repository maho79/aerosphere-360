/**
 * Utility for exporting and printing the comprehensive 360° Panoramas User Guide as a formatted PDF.
 * Uses an invisible iframe to render a clean, high-resolution printable document and triggers native browser PDF generation.
 */

export function downloadHelpPdf(isSk: boolean = true, isAdmin: boolean = false): void {
  const title = isSk
    ? '360° Panorámy — Používateľská príručka a dokumentácia'
    : '360° Panoramas — User Guide & Technical Documentation';
  const subtitle = isSk
    ? 'Kompletný sprievodca funkciami, navigáciou, časovou osou a klávesovými skratkami'
    : 'Comprehensive guide to navigation, time-travel timeline, tools, and keyboard controls';
  const genDate = new Date().toLocaleDateString(isSk ? 'sk-SK' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const contentHtml = `
<!DOCTYPE html>
<html lang="${isSk ? 'sk' : 'en'}">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page {
      size: A4;
      margin: 14mm 16mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #18181b;
      background: #ffffff;
      line-height: 1.5;
      font-size: 10.5pt;
      margin: 0;
      padding: 0;
    }
    .header-box {
      border-bottom: 2px solid #0891b2;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .header-box h1 {
      font-size: 18pt;
      font-weight: 800;
      color: #0e7490;
      margin: 0 0 4px 0;
      letter-spacing: -0.3px;
    }
    .header-box .sub {
      font-size: 10pt;
      color: #52525b;
      margin: 0;
    }
    .meta-tag {
      font-size: 8.5pt;
      color: #71717a;
      text-align: right;
    }
    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      background: #ecfeff;
      color: #0e7490;
      border: 1px solid #a5f3fc;
      margin-left: 6px;
    }
    h2 {
      font-size: 13pt;
      color: #0f172a;
      border-left: 4px solid #0891b2;
      padding-left: 8px;
      margin: 22px 0 10px 0;
      page-break-after: avoid;
    }
    h3 {
      font-size: 11pt;
      color: #1e293b;
      margin: 14px 0 6px 0;
      page-break-after: avoid;
    }
    p {
      margin: 0 0 8px 0;
    }
    ul, ol {
      margin: 0 0 12px 0;
      padding-left: 20px;
    }
    li {
      margin-bottom: 4px;
    }
    .highlight-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin: 12px 0;
    }
    .amber-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 6px;
      padding: 10px 14px;
      margin: 12px 0;
      color: #92400e;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 16px 0;
      font-size: 9pt;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      text-align: left;
      vertical-align: middle;
    }
    th {
      background: #f1f5f9;
      font-weight: 700;
      color: #334155;
    }
    .key-badge {
      display: inline-block;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 700;
      background: #0f172a;
      color: #f8fafc;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 8.5pt;
    }
    .footer-box {
      margin-top: 30px;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      font-size: 8pt;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>

  <div class="header-box">
    <div>
      <h1>${title}</h1>
      <p class="sub">${subtitle}</p>
    </div>
    <div class="meta-tag">
      <strong>AeroSphere 360</strong> | v2.8 (15K HDR)<br>
      ${genDate}
    </div>
  </div>

  <h2>1. ${isSk ? 'Interaktívna Mapa Sveta a Zhluky' : 'World Map Navigation & Clusters'}</h2>
  <p>
    ${isSk
      ? 'Mapa sveta (postavená na knižniciach Leaflet a Supercluster) vizualizuje tisíce sférických panorám s optimalizovaným vykresľovaním a zhlukovaním podľa hustoty.'
      : 'The world map renders thousands of spherical panoramas with dynamic spatial clustering and clearance analysis.'}
  </p>
  <ul>
    <li><strong>${isSk ? 'Dynamické zhluky (Clustering):' : 'Dynamic Clusters:'}</strong> ${isSk ? 'Blízke panorámy sa automaticky spájajú do okrúhlych odznakov. Kliknutím na zhluk sa mapa plynule priblíži.' : 'Nearby panoramas automatically group into cluster badges.'}</li>
    <li><strong>${isSk ? 'Spider rozbaľovanie bodov:' : 'Spider Dispersal Layout:'}</strong> ${isSk ? 'Ak sa na presne tom istom mieste nachádza viacero snímok, body sa hviezdicovo rozbalia okolo stredu s jemnými vodiacimi líniami pre pohodlný 1-klikový výber.' : 'Overlapping captures disperse into radial spider rays for easy tap selection.'}</li>
    <li><strong>${isSk ? 'Filter časových osí (Timeline Clusters):' : 'Timeline Clusters Filter:'}</strong> ${isSk ? 'Tlačidlom s ikonou histórie na hornej lište (alebo v bočnom filtri) zobrazíte výhradne lokality s viacerými zábermi v čase. Podporuje aj zdieľanie v URL parametri (?timeline=1).' : 'Quick toggle on top bar showcasing exclusively locations with multi-temporal captures across distinct dates.'}</li>
    <li><strong>${isSk ? 'Mini-mapa v prehliadači:' : 'Minimap in Viewer:'}</strong> ${isSk ? 'Vo vnútri panorámy zobrazuje polohový radar s kužeľom zorného poľa kamery v reálnom čase.' : 'Real-time rotating field-of-view cone indicator in the panoramic viewer.'}</li>
  </ul>

  <h2>2. ${isSk ? 'Filtre a Vyhľadávanie' : 'Filters & Spatial Search'}</h2>
  <ul>
    <li><strong>${isSk ? 'Časové osi (Timeline):' : 'Timeline Filter:'}</strong> ${isSk ? 'Filtruje lokality, ktoré boli opakovane nafotené naprieč rôznymi kalendárnymi dňami a rokmi.' : 'Filters locations captured across different calendar days.'}</li>
    <li><strong>${isSk ? 'Rozlíšenie (15K / 11K / 8K):' : 'Resolution Filter:'}</strong> ${isSk ? 'Okamžitý výber ultra-vysokého rozlíšenia (15K panorámy šírky 15000px+).' : 'Filter ultra-high resolution captures (15K wide).'}</li>
    <li><strong>${isSk ? 'Roky a mesiace:' : 'Temporal Filters:'}</strong> ${isSk ? 'Presné časové filtrovanie podľa sezón a mesiacov.' : 'Filter by capture year and month.'}</li>
    <li><strong>${isSk ? 'Obľúbené (Favorites):' : 'Favorites:'}</strong> ${isSk ? 'Zobrazenie panorám označených srdiečkom (lokálne ukladané v prehliadači).' : 'Showcase your bookmarked favorite panoramas.'}</li>
    <li><strong>${isSk ? 'Vyhľadávanie (Search):' : 'Fulltext Search:'}</strong> ${isSk ? 'Vyhľadávanie podľa mesta, štátu, názvu súboru alebo hashtagov.' : 'Instant search by city, country, filename, or hashtags.'}</li>
  </ul>

  <div class="page-break"></div>

  <h2>3. ${isSk ? '360° Panoramatický Prehliadač & Cestovanie v Čase' : '360° Panoramic Viewer & Time-Travel'}</h2>
  <p>
    ${isSk
      ? 'Prehliadač beží na zákazkovom Three.js WebGL engine s plnou podporou hardvérovo akcelerovaného mapovania textúr, sférickej / Little Planet projekcie a plynulých prechodov.'
      : 'Powered by a custom Three.js WebGL engine featuring hardware-accelerated shaders, Little Planet projection, and smooth 60 FPS transitions.'}
  </p>

  <div class="amber-box">
    <strong>${isSk ? '⭐ Pravidlá Časovej Osi (Time-Travel Timeline):' : '⭐ Time-Travel Timeline Rules:'}</strong><br>
    ${isSk
      ? '1. <strong>Rôzne kalendárne dni:</strong> Za časovú os sa považujú len lokality s aspoň 2 zábermi z rôznych dátumov (do 100 m).<br>' +
        '2. <strong>Zlúčenie rovnakého dňa:</strong> Viacero záberov z jedného dňa sa zlúči do jedného reprezentanta.<br>' +
        '3. <strong>Párovanie letovej výšky:</strong> Systém automaticky vyberie snímku s letovou/GPS výškou najbližšou k aktuálnemu pohľadu pre dokonalú kontinuitu horizontu.<br>' +
        '4. <strong>Perzistencia:</strong> Režim časovej osi sa pri navigácii nikdy samovoľne neprepína na blízke snímky.'
      : '1. <strong>Distinct dates:</strong> Clusters require captures from at least 2 distinct calendar days within 100m.<br>' +
        '2. <strong>Same-day deduplication:</strong> Multiple shots on the same day are collapsed into a single representative.<br>' +
        '3. <strong>Altitude matching:</strong> Chooses the capture whose flight altitude is closest to the active view.<br>' +
        '4. <strong>Persistence:</strong> Timeline mode stays active without kicking back to nearby captures.'}
  </div>

  <ul>
    <li><strong>${isSk ? 'Cestovanie v čase (Kláves Y / Shift+Y):' : 'Time-Travel (Key Y / Shift+Y):'}</strong> ${isSk ? 'Otvára chronologický filmový pás lokality s presným zachovaním azimutu, náklonu a zoomu. Tlačidlo Play na lište (alebo Shift+Y) automaticky cyklicky rotuje všetky zábery v 2-sekundových intervaloch.' : 'Opens location timeline preserving camera yaw, pitch, and zoom. Play button on timeline (or Shift+Y) auto-plays cluster captures at 2s intervals.'}</li>
    <li><strong>${isSk ? 'Peak Finder na horizonte (Kláves B):' : 'Peak Finder (Key B):'}</strong> ${isSk ? '3D billboardy okolitých vrchov, hradov a rozhľadní s nadmorskou výškou a vzdialenosťou. Kliknutím sa kamera otočí priamo na vrchol.' : 'Horizon markers for mountain peaks and castles with distance in km.'}</li>
    <li><strong>${isSk ? '3D Virtuálna chôdza (Kláves X):' : 'Virtual Walkthrough (Key X):'}</strong> ${isSk ? 'Smerové navigačné šípky na zemi pre rýchly presun medzi susednými panorámami s filmovým preletom.' : 'Ground chevron hotspots pointing to neighboring panoramas with fly-in transition.'}</li>
    <li><strong>${isSk ? 'Mobilný gyroskop (Kláves G):' : 'Mobile Gyroscope (Key G):'}</strong> ${isSk ? 'Rozhliadanie sa otáčaním mobilného zariadenia v priestore.' : 'Look around by physically rotating your mobile phone or tablet.'}</li>
    <li><strong>${isSk ? 'Solárny kompas a radar (Kláves K):' : 'Solar Compass & Radar (Key K):'}</strong> ${isSk ? 'AR azimut slnka na oblohe a rotujúci satelitný radarový kompas.' : 'Solar azimuth markers in the sky and rotating circular radar.'}</li>
    <li><strong>${isSk ? 'Priestorové 3D audio (Kláves O):' : 'Spatial 3D Audio (Key O):'}</strong> ${isSk ? 'Pohlcujúci ambientný zvukový dizajn reagujúci na smer kamery.' : 'Immersive directional soundscape reacting to camera orientation.'}</li>
  </ul>

  <h2>4. ${isSk ? 'Exporty a Sťahovanie' : 'Exports & Media Downloads'}</h2>
  <ul>
    <li><strong>${isSk ? 'Čistá 4K fotka (Kláves C):' : 'Pure 4K Snapshot (Key C):'}</strong> ${isSk ? 'Okamžité stiahnutie výrezu v rozlíšení 3840×2160 bez rušivých ovládacích ikon, doplnené o elegantný GPS a dátumový vodoznak.' : 'Instant 3840×2160 snapshot without UI icons.'}</li>
    <li><strong>${isSk ? '4K Little Planet glóbus (Klávesy 3 + C):' : '4K Little Planet Globe (Keys 3 + C):'}</strong> ${isSk ? 'Vygenerovanie kompletnej malej planétky do 4K tapety.' : 'Renders a stereographic little planet globe wallpaper.'}</li>
    <li><strong>${isSk ? 'Kino filmový režim (Kláves M):' : 'Cinematic Movie Tour (Key M):'}</strong> ${isSk ? 'Plynulá automatická rotácia a prechod naprieč filmovým pásom.' : 'Continuous hands-free rotation across the filmstrip.'}</li>
    <li><strong>${isSk ? 'Google Earth KML export:' : 'Google Earth KML Export:'}</strong> ${isSk ? 'Export všetkých verejných panorám do súboru KML pre aplikáciu Google Earth Pro.' : 'Bulk export of all public panoramas to Google Earth KML.'}</li>
  </ul>

  <div class="page-break"></div>

  <h2>5. ${isSk ? 'Kompletná Herná Matica Klávesových Skratiek' : 'Universal Keyboard Controls Matrix'}</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 25%;">${isSk ? 'Kláves' : 'Key'}</th>
        <th style="width: 35%;">${isSk ? 'Funkcia' : 'Function'}</th>
        <th style="width: 40%;">${isSk ? 'Popis' : 'Description'}</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="key-badge">W / A / S / D</span></td>
        <td>${isSk ? 'Pohyb kamery' : 'Camera Pan / Tilt'}</td>
        <td>${isSk ? 'Otáčanie pohľadu hore, vľavo, dole, vpravo' : 'Pan camera up, left, down, right'}</td>
      </tr>
      <tr>
        <td><span class="key-badge">Šípky ↑ ↓ ← →</span></td>
        <td>${isSk ? 'Pohyb kamery' : 'Camera Pan / Tilt'}</td>
        <td>${isSk ? 'Alternatívne šípkové ovládanie otáčania' : 'Alternative arrow rotation controls'}</td>
      </tr>
      <tr>
        <td><span class="key-badge">+ / -</span> alebo <span class="key-badge">Koliesko</span></td>
        <td>${isSk ? 'Zoom (FOV)' : 'Zoom (FOV)'}</td>
        <td>${isSk ? 'Plynulé približovanie a vzďaľovanie scény' : 'Smooth zoom in / zoom out'}</td>
      </tr>
      <tr>
        <td><span class="key-badge">0</span></td>
        <td>${isSk ? '1:1 Natívny Pixel' : '1:1 Pixel Zoom'}</td>
        <td>${isSk ? 'Zarovnanie 1 pixelu panorámy na 1 pixel displeja' : 'Maps 1 pano pixel to 1 screen pixel'}</td>
      </tr>
      <tr>
        <td><span class="key-badge">1 / 2 / 3</span></td>
        <td>${isSk ? 'Projekcia pohľadu' : 'Projection Modes'}</td>
        <td>${isSk ? '1: Štandardná, 2: Stereografická, 3: Little Planet' : '1: Rectilinear, 2: Stereographic, 3: Little Planet'}</td>
      </tr>
      <tr>
        <td><span class="key-badge">Y</span></td>
        <td>${isSk ? 'Časová os (Time-Travel)' : 'Time-Travel Timeline'}</td>
        <td>${isSk ? 'Otvorenie / zatvorenie časovej osi danej lokality' : 'Open / close chronological location timeline'}</td>
      </tr>
      <tr>
        <td><span class="key-badge">PageDown / . / ]</span></td>
        <td>${isSk ? 'Nasledujúca snímka' : 'Next Capture'}</td>
        <td>${isSk ? 'Nasledujúci záber na časovej osi alebo vo filmstripe' : 'Next capture in timeline or filmstrip'}</td>
      </tr>
      <tr>
        <td><span class="key-badge">PageUp / , / [</span></td>
        <td>${isSk ? 'Predchádzajúca snímka' : 'Previous Capture'}</td>
        <td>${isSk ? 'Predchádzajúci záber na časovej osi alebo vo filmstripe' : 'Previous capture in timeline or filmstrip'}</td>
      </tr>
      <tr>
        <td><span class="key-badge">B</span></td>
        <td>${isSk ? 'Peak Finder' : 'Peak Finder'}</td>
        <td>${isSk ? 'Zobrazenie horských vrcholov na horizonte' : 'Toggle mountain peaks and lookout billboards'}</td>
      </tr>
      <tr>
        <td><span class="key-badge">X</span></td>
        <td>${isSk ? '3D Virtuálna Chôdza' : '3D Walkthrough'}</td>
        <td>${isSk ? 'Pozemné šípky pre skoky medzi susednými panorámami' : 'Ground navigation chevrons'}</td>
      </tr>
      <tr>
        <td><span class="key-badge">G</span></td>
        <td>${isSk ? 'Mobilný Gyroskop' : 'Mobile Gyroscope'}</td>
        <td>${isSk ? 'Otáčanie pohľadu nakláňaním smartfónu' : 'DeviceOrientation sensor navigation'}</td>
      </tr>
      <tr>
        <td><span class="key-badge">C</span></td>
        <td>${isSk ? '4K Snímka' : '4K Snapshot'}</td>
        <td>${isSk ? 'Okamžité stiahnutie čistého 4K výrezu' : 'Instant 4K wallpaper capture'}</td>
      </tr>
      <tr>
        <td><span class="key-badge">P</span></td>
        <td>${isSk ? 'Automatická rotácia (Rotate)' : 'Auto-Rotate (Rotate)'}</td>
        <td>${isSk ? '3-fázový cyklus: rotácia vpravo → stop → vľavo (ikona rotácie)' : '3-phase cycle: rotate right → stop → left (Rotate icon)'}</td>
      </tr>
      <tr>
        <td><span class="key-badge">Shift + Y</span></td>
        <td>${isSk ? 'Prehrávanie Časovej Osi' : 'Timeline Auto-Play'}</td>
        <td>${isSk ? 'Automatické cyklovanie záberov v klastri (2s interval)' : 'Auto-cycles cluster captures at 2-second interval'}</td>
      </tr>
      <tr>
        <td><span class="key-badge">M</span></td>
        <td>${isSk ? 'Kino Režim' : 'Cinematic Movie Tour'}</td>
        <td>${isSk ? 'Prehliadka filmového pásu bez ovládacích prvkov' : 'Continuous tour across filmstrip'}</td>
      </tr>
      <tr>
        <td><span class="key-badge">F</span></td>
        <td>${isSk ? 'Celá obrazovka' : 'Fullscreen'}</td>
        <td>${isSk ? 'Prepnutie prehliadača na celú obrazovku' : 'Toggle fullscreen display'}</td>
      </tr>
      <tr>
        <td><span class="key-badge">/</span></td>
        <td>${isSk ? 'Čistý režim (Zen)' : 'Zen Mode'}</td>
        <td>${isSk ? 'Skrytie všetkých UI panelov a textov' : 'Hide / show all UI overlays'}</td>
      </tr>
      <tr>
        <td><span class="key-badge">R</span></td>
        <td>${isSk ? 'Reset kamery' : 'Reset Camera'}</td>
        <td>${isSk ? 'Návrat horizontu a zoomu do základného stavu' : 'Reset camera tilt and default FOV'}</td>
      </tr>
      <tr>
        <td><span class="key-badge">U</span></td>
        <td>${isSk ? 'Zdieľanie' : 'Share Dialog'}</td>
        <td>${isSk ? 'Kopírovanie presného odkazu na panorámu' : 'Copy exact view link and QR code'}</td>
      </tr>
      ${
        isAdmin
          ? `
      <tr>
        <td><span class="key-badge">Shift + C</span></td>
        <td>${isSk ? 'Admin Kalibrácia Azimutu' : 'Admin Visual Calibration'}</td>
        <td>${isSk ? '50% prekryv dvoch panorám pre presné zrovnanie azimutu' : '50% real-time overlay alignment modal'}</td>
      </tr>
      <tr>
        <td><span class="key-badge">T</span></td>
        <td>${isSk ? 'Admin Tagovanie' : 'Admin Tagging'}</td>
        <td>${isSk ? 'Rýchla úprava hashtagov v Cloudflare D1' : 'Quick hashtag management in Cloudflare D1'}</td>
      </tr>
      `
          : ''
      }
    </tbody>
  </table>

  ${
    isAdmin
      ? `
  <h2>6. ${isSk ? 'Administrátorská Správa & Vizuálna Kalibrácia' : 'Admin Management & Calibration'}</h2>
  <div class="highlight-box">
    <strong>${isSk ? 'Vizuálna Kalibrácia Zhlukov (Shift + C):' : 'Visual Cluster Calibration (Shift + C):'}</strong><br>
    ${isSk
      ? 'Umožňuje dokalibrovať severný azimut (north_offset) medzi dvoma snímkami z rovnakého klastra. V Three.js WebGL shadere sa vykresľuje 50% priesvitný prekryv, krokové posuvníky (±0.1°, ±1.0°, ±5.0°) a A/B blikanie (Medzerník). Uloženie cez Enter zapisuje kalibrovaný uhol a príznak visual_aligned priamo do Cloudflare D1 databázy.'
      : 'Calibrate north azimuth heading between two cluster captures using real-time 50% overlay blend, fine nudge buttons, and A/B blink comparator.'}
  </div>
  `
      : ''
  }

  <div class="footer-box">
    <span>${isSk ? '360° Panoramatická Platforma — panorama.AeroSphere 360' : '360° Panoramic Platform — panorama.AeroSphere 360'}</span>
    <span>${isSk ? 'Strana 1 / 1' : 'Page 1 / 1'}</span>
  </div>

</body>
</html>
  `;

  // Create an invisible iframe to execute the print dialog cleanly without popup blockers
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.title = 'help-pdf-printer';
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(contentHtml);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn('Iframe print error, falling back to window:', e);
          const printWin = window.open('', '_blank');
          if (printWin) {
            printWin.document.write(contentHtml);
            printWin.document.close();
            printWin.focus();
            printWin.print();
          }
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 3000);
        }
      }, 350);
    }
  } catch (err) {
    console.error('Failed to trigger PDF printing:', err);
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }
}
