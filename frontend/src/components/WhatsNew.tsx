import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Panorama } from '../types';
import { Calendar, MapPin, Sparkles, Rocket, CheckCircle2, ChevronRight, Layers, Film, Keyboard, Camera, RotateCw } from 'lucide-react';
import { formatPanoramaDate, formatFileSize } from '../utils/geo';
import { useAdmin } from '../context/AdminContext';

interface WhatsNewProps {
  panoramas: Panorama[];
}

const RELEASES = [
  {
    version: 'v2.8',
    date: '23. Október 2026',
    title: {
      en: 'Peak Finder, 3D Virtual Walkthrough, Time-Travel Timeline, Mobile Gyroscope & AI Scene Intel',
      sk: 'Peak Finder, 3D Virtuálna Chôdza, Cestovanie v Čase, Mobilný Gyroskop & AI Scene Intel',
    },
    highlights: {
      en: [
        'Peak Finder on the Horizon (Key B): Geodesic spherical projection of regional peaks, castles, towers, and lookouts with precise elevation and distance in km. Click any peak billboard to smoothly pan directly toward it.',
        '3D Virtual Walkthrough & Warp Fly-In (Key X): Ground navigation chevron hotspots rendered directly inside the 360° sphere pointing to neighboring panoramas (up to 3.5 km) with cinematic 220ms fly-in warp transitions.',
        'Time-Travel Historical Timeline (Key Y): Chronological comparison bar for captures within 85 m across different seasons and years, with seamless viewpoint orientation, pitch, and FOV continuity.',
        'Mobile Gyroscope & Sensor Look-Around (Key G): Seamless DeviceOrientation integration transforming smartphones and tablets into virtual windows with smooth motion filtering.',
        'AI Scene Intel & Local Heritage Context (Key I): Atmospheric mood classification chips in the sidebar (Sunset, Winter Snow, Forest, Water, Heritage) paired with localized cultural stories and highlight badges in Info details.',
        'Google Earth KML Export: 1-click bulk export of all public panoramas into Google Earth KML with direct deep-links to panorama.trusik.link.',
        'Full Universal Keyboard Suite: Logical shortcut mapping for all remaining UI elements (F Fullscreen, I Info, E Explorer, L Map, R Reset, G Gyro, B Peaks, X Walkthrough, Y Time-Travel, U Share), complete with glowing Pro HUD documentation.',
        'Admin 2-Panorama Visual Calibration (Shift+C): Interactive cluster alignment suite enabling manual azimuth and heading calibration between any two cluster captures using real-time 50% overlay blending, continuous fine-tuning step buttons (±0.1°, ±1°, ±5°), A/B blinking comparator, and automatic intelligent reference anchor selection.',
        'Timeline Mode 60 FPS Dissolve Fix: Completely overhauled LOD resolution upgrades during crossfade transitions to eliminate main-thread texture upload stalls and prevent blend resets when streaming 8K/15K textures.',
        'Map Timeline Cluster Filter: Dedicated quick-filter on the global map and left sidebar showcasing only panoramas that belong to multi-temporal time-travel clusters with direct URL parameter sharing (?timeline=1).',
        'Multi-Date Timeline Clustering & Flight Altitude Matching: Time-travel clusters strictly require captures from at least 2 distinct calendar days within 100m. Multiple same-day captures are intelligently collapsed into a single representative shot matching camera/flight altitude.',
        'Persistent Timeline Mode & Auto-Opening Filmstrip: Clicking any panorama on map with timeline filter active immediately opens filmstrip in Timeline mode. Navigation preserves timeline mode without unwanted fallback to nearby items.',
        'Movie Export Cluster Azimuth Synchronization: Clustered timeline panoramas in admin bulk movie export are consistently rendered with unified North azimuth alignment, enabling seamless layered blending and rotative transitions in video editors like DaVinci Resolve.',
        'Download Help & User Guide as PDF: Instant 1-click generation of the complete user manual and keyboard reference guide in vector-sharp printable PDF format.',
        'Timeline Cluster Auto-Play (2s Play Button): Dedicated small Play button on the timeline strip and header to auto-cycle through all panoramas in the cluster at 2-second intervals (toggleable via Shift+Y).',
        'Auto-Pan Button Redesign to "Rotate": Replaced generic Play icon on camera auto-panning with a modern RotateCw icon and dedicated "Rotate" semantics to eliminate confusion with timeline media playback.',
      ],
      sk: [
        'Peak Finder na horizonte (Kláves B): Geodetický prepočet horizontu premietajúci 3D orientačné body pre horské vrcholy, hrady a rozhľadne s presnou nadmorskou výškou a vzdialenosťou v km. Kliknutím na značku sa kamera hladko otočí priamo na vrchol.',
        '3D Virtuálna Chôdza & Warp Prelet (Kláves X): Pozemné navigačné chevróny priamo v 360° sfére smerujúce na susedné panorámy (do 3.5 km) s plynulým filmovým preletom pri kliknutí.',
        'Cestovanie v čase – Time-Travel (Kláves Y): Časová os záberov na rovnakom mieste (v okruhu do 85 m) naprieč rokmi so striktným zachovaním uhla pohľadu a zoomu pri prepínaní.',
        'Mobilný gyroskop & WebXR senzory (Kláves G): Hands-free rozhliadanie sa otáčaním smartfónu v priestore s plynulým filtrovaním pohybových senzorov.',
        'AI Scene Intel & Lokálne príbehy (Kláves I): Filtrovanie podľa atmosféry a nálady v bočnom paneli (Západ slnka, Zima, Les, Voda, Pamiatky) a podrobný kultúrno-geografický príbeh lokality v paneli Info.',
        'Google Earth KML Export: 1-klikový export všetkých verejných panorám do formátu KML s priamymi odkazmi na panorama.trusik.link.',
        'Kompletná herná matica klávesov: Logické skratky pre všetky funkcie (F celá obrazovka, I info, E prieskumník, L mapa, R reset kamery, G gyro, B vrcholy, X chôdza, Y časová os, U zdieľať) zdokumentované v interaktívnom HUD prehľade.',
        'Admin vizuálna kalibrácia zhlukov panorám (Shift+C): Interaktívny kalibračný nástroj pre manuálne zarovnanie azimutu dvoch panorám v reálnom čase s 50% priehľadným prekryvom, krokovým ladením (±0.1°, ±1°, ±5°), A/B blikaním a automatickým výberom najlepšej referenčnej panorámy v clustri.',
        'Plynulé 60 FPS prelínačky v časovej osi: Kompletná oprava prelínačiek pri stlačení PageDown/PageUp bez trhania a bez prerušovania prechodu pri načítavaní 8K/15K textúr.',
        'Filter zhlukov časovej osi na mape: Rýchly filter na mape sveta a v bočnom paneli zobrazujúci výhradne panorámy patriace do časových zhlukov (Time-Travel) s podporou URL parametra (?timeline=1).',
        'Klastre časovej osi z rôznych dátumov & Párovanie letovej výšky: Časová os striktne vyžaduje zábery z minimálne 2 rôznych kalendárnych dní v okruhu do 100 m. Viaceré zábery z rovnakého dňa sú zlúčené do jedného reprezentanta s najpodobnejšou letovou/GPS výškou kamery.',
        'Perzistentný režim časovej osi & Automatický filmový pás: Otvorenie panorámy s aktívnym filtrom časových osí okamžite načíta filmový pás v režime časovej osi. Prepínanie medzi zábermi trvalo zachováva časovú os bez prepadnutia na blízke snímky.',
        'Zjednotený azimut pri hromadnom exporte filmov: Panorámy patriace do zrovnaných časových klastrov sa v Movie exporte generujú s identickým azimutom pre plynulé vrstvenie a rotácie v DaVinci Resolve.',
        'Stiahnutie sprievodcu a nápovedy ako PDF: Okamžité stiahnutie kompletnej používateľskej príručky a zoznamu skratiek v tlačovom vektorovom formáte PDF.',
        'Automatické prehrávanie časovej osi (Play 2s): Nové malé tlačidlo Play na lište časovej osi a v záhlaví umožňuje spustiť plynulé cyklovanie všetkých záberov v clustri po 2-sekundových intervaloch (prepínateľné aj klávesom Shift+Y).',
        'Redizajn tlačidla automatickej rotácie na "Rotate": Pôvodné tlačidlo otáčania kamery (kláves P) dostalo nový dizajn s ikonou rotácie (RotateCw), čo presne zodpovedá jeho funkcii a oddeľuje rotáciu scény od prehrávania médií a časovej osi.',
      ],
    },
  },
  {
    version: 'v2.7',
    date: '15. Október 2026',
    title: {
      en: 'Cloudflare D1 Consolidation, Security Hardening, Hybrid Asset Delivery, Admin Tagging & Smart GPS',
      sk: 'Konsolidácia Cloudflare D1, Bezpečnostný Hardening, Hybridná Distribúcia, Admin Tagovanie & Smart GPS',
    },
    highlights: {
      en: [
        'Cloudflare D1 Database Consolidation: Consolidated all panoramas, views, favorites, comments, and admin edits into Cloudflare D1 serverless SQLite, removing runtime reliance on static JSON and KV overrides.',
        'Comprehensive Cloudflare Security Hardening: Strict HTTP security headers (_headers) with HSTS, CSP (supporting Three.js WebGL and Google GIS), RFC 9116 security.txt, optimized _routes.json, and edge _middleware.js blocking vulnerability scanners and empty User-Agents.',
        'Hybrid Asset Delivery Model: Cloudflare Pages CDN edge cache for 2K previews and thumbnails combined with seamless encrypted Cloudflare Tunnel (ag.trusik.link) streaming for newly published or private full-res masters.',
        '11K & 15K Insta360 GPU Limit Fix: Automatic client-side offscreen canvas downsampling for GPUs with WebGL gl.MAX_TEXTURE_SIZE limits (8192px), ensuring ultra-wide panoramas load crisply without falling back to 2K.',
        'Admin Folder Bulk Selection: Group and filter private panoramas by folders with 1-click "Select Folder / All" and multi-selection checkboxes across both Sidebar and Tiles Grid.',
        'Admin Custom Tagging (Key T): Instant modal for adding, modifying, and removing custom hashtags persisted directly in D1, accessible via hotkey T for single items or selected batches.',
        'Admin Smart GPS Assignment Workflow: 1-click same-date GPS auto-copy from existing catalog panoramas, rough location auto-zoom via OpenStreetMap Nominatim, and bulk map placement with 1-by-1 draggable fine-tuning markers.',
        'Detail View ActiveFiltersBar Fix: Relocated and constrained active filter pills in Panorama Detail view to eliminate overlap with top-right toolbar buttons.',
      ],
      sk: [
        'Konsolidácia databázy do Cloudflare D1: Všetky panorámy, zobrazenia, obľúbené položky, komentáre a administrátorské úpravy bežia priamo na bezserverovom SQLite (Cloudflare D1) bez závislosti na statickom JSON a KV prepisoch.',
        'Komplexný bezpečnostný hardening Cloudflare: Striktné HTTP hlavičky (_headers) s HSTS, CSP (podpora pre Three.js WebGL a Google GIS), štandard RFC 9116 security.txt, optimalizovaný _routes.json a edge _middleware.js blokujúci skenery zraniteľností a prázdne User-Agenty.',
        'Hybridný model distribúcie assetov: Rýchle 2K náhľady a miniatúry servované z Cloudflare Pages CDN v kombinácii so šifrovaným Cloudflare Tunnelom (ag.trusik.link) pre bezpečné a okamžité streamovanie plných 8K/11K/15K originálov.',
        'Oprava GPU limitu pre 11K & 15K Insta360 panorámy: Automatické adaptívne škálovanie cez offscreen canvas pre grafické karty s limitom gl.MAX_TEXTURE_SIZE (8192px), vďaka čomu sa 11K panorámy načítajú v maximálnej dostupnej kvalite.',
        'Hromadný výber zložiek v správe: Zoskupovanie a filtrovanie privátnych panorám podľa zložiek s 1-klikom "Vybrať zložku / Všetko" a zaškrtávacími políčkami v bočnom paneli aj v mriežke dlaždíc.',
        'Vlastné tagovanie administrátora (Kláves T): Rýchle modálne okno pre správu hashtagov ukladaných priamo do D1, dostupné cez klávesovú skratku T pre jednotlivú panorámu aj hromadne označené skupiny.',
        'Smart GPS workflow pre zameranie panorám: 1-klikové automatické kopírovanie GPS z panorám z rovnakého dňa, automatické priblíženie oblasti cez OpenStreetMap Nominatim a hromadné umiestnenie na mapu s ťahaním špendlíkov 1 po 1.',
        'Oprava zobrazenia lišty filtrov v detaile: Responzívne odsadenie a obmedzenie šírky ActiveFiltersBar v detaile panorámy zabraňujúce prekrývaniu s hornými tlačidlami nástrojov.',
      ],
    },
  },
  {
    version: 'v2.6',
    date: '10. Október 2026',
    title: {
      en: 'Cinematic Movie Tour, GPU Preloading, Gaming HUD & Seamless Camera Navigation',
      sk: 'Kino Režim Filmu, GPU Preloading, Herný HUD & Plynulá Navigácia',
    },
    highlights: {
      en: [
        'Spatial Audio Engine [EXPERIMENTAL] (Key O): immersive 3D soundscape with gentle musical ambient pad chords loop, soothing bird flybys, breeze, and high-altitude airliner, with built-in Web Audio synthesis fallback.',
        'Solar Azimuth Compass & Satellite Radar [EXPERIMENTAL] (Key K): in standard view, renders full 360° AR azimuth markers floating in the clouds (+20° above horizon), center crosshair reticle with degrees & GPS elevation, and a real-time rotating circular satellite radar minimap (r ≈ 1 km).',
        'Cinematic Movie Mode (M): hands-free 360° tour with smooth continuous rotation across all 30 filmstrip panoramas in a clean fullscreen view.',
        'Intelligent GPU Texture Preloader: textures load ahead of time into GPU VRAM before rotation ends, ensuring zero-latency, stutter-free Hermite crossfades.',
        'Seamless Camera State Persistence: camera tilt angle, auto-pan direction/speed, and projection mode are strictly preserved when advancing across panoramas.',
        'Directional 3-Phase Auto-Pan Cycle (P): one click pans right, second stops, third pans left, with dedicated P shortcut key.',
        'Calibrated 1:1 Native Pixel Zoom (0): 1 panorama pixel maps to exactly 1 screen pixel, with Retina & mobile devicePixelRatio compensation.',
        'Instant Projection Switcher (1, 2, 3): hotkeys 1 for standard rectilinear, 2 for curved stereographic, and 3 for little planet projection.',
        'Gaming HUD Keyboard Guide (H): interactive visual mechanical keyboard overlay with WASD navigation, shortcuts help, and neon glowing keycaps.',
        'Pure 4K View Snapshot (C): one-click WebGL capture in 3840×2160 without UI overlays, featuring GPS watermark and YYYY-MM-DD date.',
        'Clean Zen Mode (/): completely toggle all UI controls off and on for an undisturbed immersive viewing experience.',
        'Responsive Filmstrip & Smart UI Layout: zoom +/- controls dynamically shift upward when the filmstrip expands, preventing any overlap.',
        'High-Resolution 2K Filmstrip Hover Previews: 2-3x larger thumbnail popups rendered from sharp 2K sources.',
        'Complete Systems Analyst Technical Specification: full architectural blueprint, mathematical projection models, and chronological changelog available in Admin.',
      ],
      sk: [
        'Spatial Audio 3D Zvukový Engine [EXPERIMENTAL] (Kláves O): jemná 3D zvuková kulisa s upokojujúcim hudobným ambientným padom, jemným preletom vtákov, vetrom a lietadlom bez rušivých tónov a s procedurálnou syntézou.',
        'Solárny Azimutálny Kompas & Satelitný Radar [EXPERIMENTAL] (Kláves K): v štandardnom režime premieta AR azimutové značky priamo v oblakoch (+20° nad horizontom), stredový zameriavač so stupňami & nadmorskou výškou a rotujúcu satelitnú mapku (r ≈ 1 km).',
        'Režim Filmu (kláves M): automatická celoobrazovková 360° prehliadka cez všetkých 30 panorám na filmovom páse bez dotyku myši s čistým rozhraním.',
        'Inteligentný GPU Preloading: textúry nasledujúcej panorámy sa vopred načítajú do pamäte grafickej karty pre okamžitý shader prechod bez trhania.',
        'Plynulé zachovanie stavu kamery: uhol náklonu, smer otáčania a zvolený režim projekcie sa striktne zachovávajú pri prechode na ďalšiu panorámu.',
        'Trojkrokový cyklus auto-otáčania (kláves P): 1. klik točenie doprava, 2. klik zastavenie, 3. klik točenie doľava s klávesovou skratkou P.',
        'Skalibrovaný 1:1 natívny pixel zoom (kláves 0): 1 pixel panorámy = presne 1 pixel displeja s kompenzáciou pre Retina obrazovky a mobily.',
        'Bleskové prepínanie projekcií (klávesy 1, 2, 3): 1 = štandardný pohľad, 2 = zaoblený (stereografický), 3 = malá planétka (little planet).',
        'Herný HUD pomocník (kláves H): interaktívna vizuálna herná klávesnica s ovládaním rozhľadu cez WASD / šípky a neónovými nápovedami.',
        'Export čistej 4K fotky (kláves C): okamžité stiahnutie snímky aktuálneho pohľadu v rozlíšení 3840×2160 bez ovládacích prvkov s GPS podpisom.',
        'Čistý Zen režim (kláves /): okamžité skrytie všetkých tlačidiel a panelov pre ničím nerušený zážitok zo sledovania panorámy.',
        'Inteligentné rozloženie prvkov: ovládacie prvky zoomu +/- a percentuálny ukazovateľ sa automaticky posúvajú nahor pri zväčšenom filmovom páse.',
        'Vysokokvalitné 2K náhľady na filmovom páse: 2-3× väčšie plávajúce miniatúry vykresľované z ostrých 2K podkladov.',
        'Kompletná analytická technická dokumentácia: ucelená systémová špecifikácia, matematické vzorce projekcií a changelog priamo v administrácii.',
      ],
    },
  },
  {
    version: 'v2.5',
    date: 'Október 2026',
    title: {
      en: 'Mobile Immersive View & Interactive Tiles Grid',
      sk: 'Mobilný pohlcujúci režim & Interaktívne dlaždice',
    },
    highlights: {
      en: [
        'Mobile Immersive 360° Mode: one-tap full screen hiding all navigation with simple exit button.',
        'Interactive Tiles Grid: toggle between Leaflet map and responsive thumbnail tiles with persistent filters.',
        'Admin Visibility Toggles: independent Public and Private on/off controls for quick inspection.',
        'Instant Filter Reset: interactive filter chips with one-click individual dismissal.',
      ],
      sk: [
        'Mobilný pohlcujúci režim: čisté 360° zobrazenie na celej obrazovke bez rušivých prvkov.',
        'Zobrazenie dlaždíc: prepínanie medzi mapou a mriežkou náhľadov so zachovaním filtrov.',
        'Správcovské filtre: nezávislé zapnutie a vypnutie verejných a súkromných panorám.',
        'Rýchly reset filtrov: interaktívne štítky s okamžitým zrušením jednotlivých filtrov.',
      ],
    },
  },
  {
    version: 'v2.4',
    date: 'September 2026',
    title: {
      en: 'Ultra-HD Streaming & Enhanced Navigation',
      sk: 'Ultra-HD Streamovanie & Vylepšená navigácia',
    },
    highlights: {
      en: [
        'Progressive 15K / 8K texture loading with horizontal resolution quality badges.',
        'Filmstrip mini-map with smooth panoramic transitions and orientation indicator.',
        'Smart SPA Cloudflare Pages routing preserving zoom, position, and active filters.',
      ],
      sk: [
        'Progresívne načítavanie 15K / 8K textúr s označením skutočného rozlíšenia.',
        'Filmový pás s mini-mapkou, plynulým prepínaním a indikátorom smeru pohľadu.',
        'Optimalizované Cloudflare Pages smerovanie so zachovaním pozície a filtrov.',
      ],
    },
  },
  {
    version: 'v2.3',
    date: 'August 2026',
    title: {
      en: 'Bilingual Interface & Privacy Controls',
      sk: 'Dvojjazyčné rozhranie & Správa súkromia',
    },
    highlights: {
      en: [
        'Full English & Slovak localization across map, viewer, stats, and admin consoles.',
        'Recycle bin for deleted panoramas (!DELETED!) with one-click restoration.',
        'Secure Google OAuth admin authentication and bulk metadata management.',
      ],
      sk: [
        'Plná lokalizácia do slovenčiny a angličtiny v celej aplikácii a mape.',
        'Kôš zmazaných panorám (!DELETED!) s možnosťou okamžitého obnovenia.',
        'Bezpečné Google OAuth prihlasovanie administrátora a hromadná správa.',
      ],
    },
  },
];

export const WhatsNew: React.FC<WhatsNewProps> = ({ panoramas }) => {
  const { t, i18n } = useTranslation();
  const isSk = i18n.language.toLowerCase().startsWith('sk');

  // Filter active and sort by date descending
  const { isAdmin } = useAdmin();
  const recent = panoramas
    .filter((p) => !p.is_deleted && p.folder !== '!DELETED!' && (isAdmin || p.is_private === false))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 15);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-10 max-w-4xl mx-auto custom-scrollbar space-y-10">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-950/50">
          <Sparkles className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide">{t('whats_new')}</h1>
          <p className="text-xs md:text-sm text-zinc-400">{t('whats_new_text')}</p>
        </div>
      </div>

      {/* Pro Tips Section for Public Users */}
      <div className="p-6 md:p-8 rounded-3xl glass-panel-elevated border border-amber-500/40 relative overflow-hidden bg-gradient-to-r from-amber-500/15 via-cyan-500/10 to-purple-500/15 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-400 text-zinc-950 flex items-center justify-center font-extrabold shadow-lg shadow-amber-500/30 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-amber-400 block">
              {isSk ? 'ODPORÚČANIE PRE NÁVŠTEVNÍKOV' : 'VISITOR RECOMMENDATION'}
            </span>
            <h2 className="text-lg md:text-xl font-extrabold text-white">
              {isSk ? '⭐ PRO TIPY: NAJNOVŠIE FUNKCIE PRE VÁS' : '⭐ PRO TIPS: LATEST FEATURES FOR YOU'}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
          {/* Card 1: Movie Mode */}
          <div className="p-3.5 rounded-2xl bg-black/60 border border-amber-500/30 hover:border-amber-400/60 transition-colors space-y-1.5">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <Film className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{isSk ? 'Režim Filmu (Kláves M)' : 'Movie Mode (Key M)'}</span>
            </div>
            <p className="text-zinc-300 text-[11px] leading-relaxed">
              {isSk
                ? 'Sadnite si a stlačte M: celoobrazovková 360° prehliadka automaticky pretočí každú panorámu o 360° a plynulo bez dotyku prejde na ďalšiu.'
                : 'Press M for a hands-free cinema tour: full 360° rotation on each panorama with seamless auto-advance across the playlist.'}
            </p>
          </div>

          {/* Card 2: 4K Pure Capture */}
          <div className="p-3.5 rounded-2xl bg-black/60 border border-emerald-500/30 hover:border-emerald-400/60 transition-colors space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-300 font-bold">
              <Camera className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{isSk ? 'Čistá 4K Fotka (Kláves C)' : '4K Pure Capture (Key C)'}</span>
            </div>
            <p className="text-zinc-300 text-[11px] leading-relaxed">
              {isSk
                ? 'Stlačte C alebo ikonu fotoaparátu pre stiahnutie čistého 4K záberu aktuálneho pohľadu bez ovládacích prvkov s GPS podpisom.'
                : 'Press C or camera icon to instantly capture a pristine 4K image of your exact viewpoint without UI overlays.'}
            </p>
          </div>

          {/* Card 3: Gaming HUD */}
          <div className="p-3.5 rounded-2xl bg-black/60 border border-cyan-500/30 hover:border-cyan-400/60 transition-colors space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-300 font-bold">
              <Keyboard className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{isSk ? 'Herné Skratky (Kláves H)' : 'Gaming Shortcuts (Key H)'}</span>
            </div>
            <p className="text-zinc-300 text-[11px] leading-relaxed">
              {isSk
                ? 'Stlačte H pre hernú mapu: WASD pohyb, 1-2-3 prepínanie projekcií (štandard/zaoblené/planétka) a / pre čistý Zen režim.'
                : 'Press H for gaming keyboard HUD: WASD navigation, 1-2-3 projection switcher, and / for clean Zen view.'}
            </p>
          </div>

          {/* Card 4: 1:1 Pixel Zoom & Auto-Pan Cycle */}
          <div className="p-3.5 rounded-2xl bg-black/60 border border-purple-500/30 hover:border-purple-400/60 transition-colors space-y-1.5">
            <div className="flex items-center gap-2 text-purple-300 font-bold">
              <RotateCw className="w-4 h-4 text-purple-400 shrink-0" />
              <span>{isSk ? '1:1 Zoom & Pán (0 a P)' : '1:1 Zoom & Pan (0 & P)'}</span>
            </div>
            <p className="text-zinc-300 text-[11px] leading-relaxed">
              {isSk
                ? 'Kláves 0 prepne na 100% natívny pixel zoom s Retina kompenzáciou. Kláves P cykluje: otáčanie vpravo → stop → vľavo.'
                : 'Key 0 triggers calibrated 1:1 native pixel zoom with Retina compensation. Key P cycles: pan right → stop → pan left.'}
            </p>
          </div>
        </div>
      </div>

      {/* Section 1: App Releases & Changelog */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-white">
          <Rocket className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold tracking-wide">{t('releases')}</h2>
        </div>

        <div className="space-y-4">
          {RELEASES.map((rel, idx) => (
            <div
              key={rel.version}
              className={`p-5 rounded-3xl glass-panel border transition-all ${
                idx === 0
                  ? 'border-cyan-500/40 bg-cyan-950/10 shadow-xl shadow-cyan-950/30'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono tracking-wider ${
                      idx === 0
                        ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/20'
                        : 'bg-white/10 text-zinc-200 border border-white/10'
                    }`}
                  >
                    {rel.version}
                  </span>
                  <h3 className="text-sm md:text-base font-bold text-white">
                    {isSk ? rel.title.sk : rel.title.en}
                  </h3>
                </div>
                <span className="text-xs text-zinc-400 font-mono">{rel.date}</span>
              </div>

              <ul className="space-y-1.5 mt-3">
                {(isSk ? rel.highlights.sk : rel.highlights.en).map((item, hIdx) => (
                  <li key={hIdx} className="flex items-start gap-2 text-xs md:text-sm text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Section 2: Recent Panoramas */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold tracking-wide">
              {isSk ? 'Najnovšie pridané panorámy' : 'Recently Added Panoramas'}
            </h2>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            {recent.length} {isSk ? 'panorám' : 'panoramas'}
          </span>
        </div>

        <div className="space-y-2.5">
          {recent.map((p) => (
            <Link
              key={p.id}
              to={`/?pano=${p.id}`}
              className="glass-panel p-3.5 md:p-4 rounded-2xl border border-white/10 hover:border-cyan-500/40 hover:bg-white/5 transition-all flex items-center justify-between gap-4 group cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-white/10 overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                  <img
                    src={`/thumbnails/${p.filename}`}
                    alt={p.city || 'Panorama preview'}
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== `${window.location.origin}/panoramas/${p.filename}`) {
                        target.src = `/panoramas/${p.filename}`;
                      }
                    }}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{p.city !== 'Unknown' ? p.city : p.original_filename}</span>
                    {p.country && p.country !== 'Unknown' && (
                      <span className="text-xs text-zinc-400 font-normal shrink-0">
                        • {p.country}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatPanoramaDate(p.date)}
                    </span>
                    <span className="text-cyan-400 font-mono">
                      {formatFileSize(p.size)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-zinc-400 group-hover:text-cyan-400 shrink-0 transition-colors">
                <span className="hidden sm:inline text-xs font-semibold">
                  {isSk ? 'Zobraziť' : 'Open'}
                </span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};
