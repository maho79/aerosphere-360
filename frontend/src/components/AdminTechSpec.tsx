import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileCode2,
  Download,
  ExternalLink,
  Copy,
  Printer,
  Search,
  BookOpen,
  Cpu,
  Layers,
  Sparkles,
  Check,
  ChevronRight,
  Database,
  ShieldCheck,
  Eye,
  Sliders,
  Keyboard,
  Compass,
} from 'lucide-react';

interface AdminTechSpecProps {
  standalone?: boolean;
}

export const AdminTechSpec: React.FC<AdminTechSpecProps> = ({ standalone = false }) => {
  const { i18n } = useTranslation();
  const isSk = i18n.language.startsWith('sk');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('sec-1');

  const handleCopyHtml = async () => {
    try {
      const res = await fetch('/tech-spec.html');
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.open('/tech-spec.html', '_blank');
    }
  };

  const handleDownloadHtml = async () => {
    try {
      const res = await fetch('/tech-spec.html');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `360_panoramas_technical_specification_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open('/tech-spec.html', '_blank');
    }
  };

  const sections = useMemo(() => [
    {
      id: 'sec-1',
      title: isSk ? '1. Architektúra & Systémová Topológia' : '1. High-Level Architecture & System Topology',
      category: 'Foundations',
      icon: Cpu,
      content: (
        <div className="space-y-4 text-xs md:text-sm text-zinc-300 leading-relaxed">
          <p>
            Platforma je navrhnutá ako <strong>Edge-Native Serverless Single Page Application (SPA)</strong> fungujúca na hybridnom CQRS modeli. Všetky výpočty a vykresľovanie 3D WebGL scény sú presunuté do klientskeho prehliadača (GPU/CPU), zatiaľ čo perzistencia, autentifikácia a analýza bežia na globálnej sieti <strong>Cloudflare Edge Network</strong> bez nutnosti správy vlastných dedikovaných serverov.
          </p>
          <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200">
            <strong>Kľúčový princíp:</strong> Hybridný model distribúcie assetov (Hybrid Asset Delivery Model). Statické 2K náhľady, dlaždice a miniatúry sú distribuované cez Cloudflare Pages CDN s dlhým kešovaním, API volania riešia V8 izoláty v Cloudflare Workers s databázou Cloudflare D1. Plné 8K, 11K (Insta360) a 15K originály sa primárne servujú z R2/CDN a v prípade novo publikovaných alebo privátnych panorám sa dynamicky a bezpečne streamujú priamo z lokálneho úložiska cez šifrovaný Cloudflare Tunnel (<code className="text-cyan-300">*.trusik.link</code>) bez potreby okamžitého duplicitného nahrávania na CDN.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block mb-1">Klientska Vrstva (SPA)</span>
              React 19, TypeScript 5.8, Vite 6 (Rolldown bundler), Three.js (WebGL2 s adaptívnym offscreen canvas downsamplingom pre GPU limity <code className="text-cyan-300">gl.MAX_TEXTURE_SIZE</code> 4096px / 8192px pri 8K/11K/15K), Tailwind CSS, Leaflet pre mapy.
            </div>
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1">Edge Gateway (Workers)</span>
              Cloudflare Pages Functions (<code className="text-amber-300">/api/*</code>), V8 engine, WAF/Scanner ochrana (<code className="text-amber-300">_middleware.js</code>), overovanie Google GIS OAuth JWT tokenov, asset proxy fallback router.
            </div>
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">Perzistentná Vrstva (D1 & KV)</span>
              Cloudflare D1 (konsolidovaná SQLite databáza pre panorámy, zobrazenia, hviezdičky, komentáre a spätnú väzbu). Rýchle transakcie priamo na hrane.
            </div>
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-xs font-bold text-violet-400 uppercase tracking-wider block mb-1">Hybridná Asset Distribúcia</span>
              CDN Tier (2K náhľady v <code className="text-violet-300">panoramas_2k/</code>, miniatúry, R2 originály) + Tunnel Tier (lokálny server cez <code className="text-violet-300">ag.trusik.link</code> pre privátne a čerstvo publikované 8K/11K/15K mastre).
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'sec-2',
      title: isSk ? '2. Dátové Modely & Databázová Schéma' : '2. Domain Data Models & Database Schemas',
      category: 'Data',
      icon: Database,
      content: (
        <div className="space-y-4 text-xs md:text-sm text-zinc-300 leading-relaxed">
          <p>
            Všetky atribúty panorámy sú prísne typované v TypeScript interface <code>Panorama</code> a na hrane synchronizované do SQLite schémy v Cloudflare D1:
          </p>
          <pre className="p-3 rounded-xl bg-black/60 border border-white/10 text-[11px] md:text-xs font-mono text-cyan-300 overflow-x-auto">
{`export interface Panorama {
  id: string | number;              // Unikátny identifikátor
  filename: string;                 // Relatívna cesta k equirektangulárnemu JPEG
  title?: string;                   // Názov / popis panorámy
  city?: string;                    // Mesto / lokalita
  country?: string;                 // Štát
  date: string;                     // Dátum striktne vo formáte 'yyyy-MM-dd'
  lat: number | null;               // Desatinná šírka (WGS 84, -90 až +90)
  lon: number | null;               // Desatinná dĺžka (WGS 84, -180 až +180)
  width: number;                    // Natívna horizontálna šírka (napr. 15360)
  height: number;                   // Natívna vertikálna výška (napr. 7680)
  is_private?: boolean;             // Stav súkromia (true = iba po prihlásení)
  folder?: string | null;           // Zložka alebo '!DELETED!'
  views?: number;                   // Počet zobrazení
  favorites?: number;               // Počet obľúbení (hviezdičiek)
  shares?: number;                  // Počet zdieľaní linku
  comments_count?: number;          // Počet komentárov
  tags?: string[];                  // Dynamické hashtagy (#yyyy, #mesiac, #lokalita)
}`}
          </pre>
        </div>
      ),
    },
    {
      id: 'sec-3',
      title: isSk ? '3. Pipeline Ingescie & Dynamické Hashtagy' : '3. Ingestion Pipeline & Dynamic Hashtags',
      category: 'Data',
      icon: Sparkles,
      content: (
        <div className="space-y-4 text-xs md:text-sm text-zinc-300 leading-relaxed">
          <p>
            Pri načítaní fotografií skript extrahuje EXIF/XMP metadáta (GPS súradnice normalizované na desatinné stupne a expozičný čas).
          </p>
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
            <strong>Pravidlo pre dátumy:</strong> V slovenskej aj anglickej verzii sa dátum striktne zobrazuje vo formáte <code className="text-amber-100 font-bold">yyyy-MM-dd</code>.
          </div>
          <p>
            <strong>Dynamické generovanie hashtagov:</strong>
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Dátumové tagy:</strong> Striktne z dátumu zhotovenia (napr. <code>#2025</code> a lokalizovaný mesiac <code>#january</code> / <code>#januar</code>).</li>
            <li><strong>Lokalitné tagy:</strong> Mesto a kataster očistené od diakritiky (napr. <code>#vysokaprimorave</code>, <code>#bratislava</code>).</li>
            <li><strong>Kľúčové slová:</strong> Sémantické slová z názvu súboru (napr. <code>#aluvium</code>, <code>#zaplavy</code>, <code>#jesen</code>).</li>
            <li>Vyhradené 3 riadky v paneli detailov s možnosťou kombinovaného viacnásobného výberu (zúženie filtra).</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'sec-4',
      title: isSk ? '4. 3D WebGL Projekcie & Zosúladenie Stredu' : '4. 3D WebGL Projections & Alignment',
      category: 'Graphics',
      icon: Compass,
      content: (
        <div className="space-y-4 text-xs md:text-sm text-zinc-300 leading-relaxed">
          <p>
            Viewer využíva vlastný Three.js render loop s tromi optickými režimami zobrazenia:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="font-bold text-cyan-300 mb-1">1. Štandard (Rectilinear)</div>
              Klasická perspektívna kamera s vertikálnym FOV v rozsahu 15° až 120°. Zachováva rovné priamky.
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="font-bold text-cyan-300 mb-1">2. Zaoblené (Curved)</div>
              Konformná stereografická projekcia. Eliminuje skreslenie na okrajoch pri širokých záberoch.
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="font-bold text-cyan-300 mb-1">3. Malá planéta (Planet)</div>
              Azimutálna stereografická inverzia sféry. Zem je v strede, horizont v kruhu a obloha na okrajoch.
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200">
            <strong>Zosúladenie stredu a ťahania:</strong> Pri prepnutí medzi Štandardným a Zaobleným zobrazením zostáva stredový objekt na plátne na presne rovnakom mieste. Ovládanie myšou/dotykom je zjednotené (ťahanie nahor ťahá povrch panorámy nahor, takže sa kamera pozerá dolu — bez nežiaducej inverzie).
          </div>
        </div>
      ),
    },
    {
      id: 'sec-5',
      title: isSk ? '5. Matematické Odvodenie 1:1 Pixel Zoomu (Kláves 0)' : '5. Mathematical Derivation of 1:1 Pixel Zoom',
      category: 'Graphics',
      icon: Sliders,
      content: (
        <div className="space-y-4 text-xs md:text-sm text-zinc-300 leading-relaxed">
          <p>
            Režim <strong>1:1 Zoom (Kláves 0)</strong> garantuje, že presne 1 pixel v plnom rozlíšení panorámy zodpovedá presne 1 pixelu na obrazovke používateľa na horizonte:
          </p>
          <div className="p-4 rounded-xl bg-black/70 border border-white/10 font-mono text-xs text-emerald-300 space-y-2">
            <div>1. Uhlová hustota panorámy:  ρ_pano = W / (2π) [px/rad]</div>
            <div>2. Uhlová hustota na obrazovke: ρ_screen = H_phys / (2 * tan(α / 2)) [px/rad]</div>
            <div className="text-zinc-400 text-[11px]">   (kde H_phys = H_css * DPR sú reálne fyzické pixely displeja; na Retina/mobile DPR = 2.0 až 3.0)</div>
            <div>3. Rovnosť hustôt (1:1 zhoda): tan(α / 2) = (H_phys * π) / W</div>
            <div className="text-white font-bold text-sm pt-1">
              ⇒ α_1:1 = 2 * arctan( (H_phys * π) / W )
            </div>
          </div>
          <p>
            Na 1080p desktop monitore (H = 1080, DPR = 1) pre 15K panorámu (W = 15360) vychádza vertikálny FOV presne <strong>24.87°</strong>. Na Retina smartfóne (napr. výška 844 CSS px s DPR = 3, t.j. H_phys = 2532 fyzických pixelov) je presný 1:1 FOV <strong>54.71°</strong>. Vďaka započítaniu DPR zobrazuje displej mobilu panorámu skutočne 1:1 bez prezoomovania.
          </p>
        </div>
      ),
    },
    {
      id: 'sec-6',
      title: isSk ? '6. Progresívny HDR Profil & Export 4K Snímky' : '6. Progressive HDR Profile & 4K Export',
      category: 'Graphics',
      icon: Layers,
      content: (
        <div className="space-y-4 text-xs md:text-sm text-zinc-300 leading-relaxed">
          <p>
            Algoritmus HDR simulácie v reálnom čase rozširuje dynamický rozsah bežných 8-bitových fotografií:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Čierna zostáva čiernou:</strong> Úplne čierne pixely (\(RGB \to 0\)) sú chránené a nezošednú.</li>
            <li><strong>Vytiahnutie tieňov:</strong> Nelineárne zosvetlenie tmavých oblastí odhaľuje kresbu v tieňoch.</li>
            <li><strong>Zvýšenie kontrastu a sýtosti v stredoch:</strong> S-krivka mikrokontrastu so zvýšenou saturáciou neutrálnych sivých tónov, pričom jasné svetlá zostávajú chránené pred prepálením.</li>
            <li><strong>Export:</strong> Kláves <code>C</code> alebo ikona fotoaparátu vygeneruje 4K čistú snímku vrátane zachovania zvoleného HDR profilu a aplikácie decentnej vodotlače s GPS súradnicami a mestom.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'sec-7',
      title: isSk ? '7. Filmový Pás, Klastrovanie na Mape & Filtre' : '7. Filmstrip, Map Clustering & Active Filters',
      category: 'UX',
      icon: Eye,
      content: (
        <div className="space-y-4 text-xs md:text-sm text-zinc-300 leading-relaxed">
          <p>
            <strong>Veľkosti filmového pásu:</strong> Prepínač medzi tromi veľkosťami (<code>mini</code> pre nerušený záber, <code>normal</code>, a <code>large</code> pre 3× väčšie 2K náhľady na 4K monitoroch).
          </p>
          <p>
            <strong>Náhľad pri hoveri (2K Hover Popover):</strong> Prechod myšou ponad miniatúru zobrazí detailný 2K popup náhľad. Podobne prehľadová mapa je interaktívna a po kliknutí naviguje priamo na mapové zobrazenie s príslušným zoomom.
          </p>
          <p>
            <strong>Klastrovanie modrých bodiek na mape:</strong> Panorámy v tesnej blízkosti sa zhlukujú do väčšieho krúžku s počtom fotografií. Kliknutie na klastrový kruh plynule nazoomuje mapu tak, aby sa všetky panorámy pekne oddelili. Modré bodky majú optimalizovaný dotykový hit-box pre okamžité otvorenie na mobiloch na prvý dotyk.
          </p>
          <p>
            <strong>Globálna lišta aktívnych filtrov:</strong> Trvalo viditeľná navrchu obrazovky na detaile, mape aj dlaždiciach, s možnosťou vypínať filtre jednotlivo alebo naraz.
          </p>
        </div>
      ),
    },
    {
      id: 'sec-8',
      title: isSk ? '8. Klávesové Skratky & Herný HUD Pomocník' : '8. Keyboard Shortcuts & Gaming HUD',
      category: 'UX',
      icon: Keyboard,
      content: (
        <div className="space-y-4 text-xs md:text-sm text-zinc-300 leading-relaxed">
          <p>
            Kompletná matica klávesových skratiek pre rýchle ovládanie:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 font-mono text-xs">
            <div className="p-2 rounded-lg bg-white/5 border border-white/10"><span className="text-cyan-400 font-bold">WASD / Šípky</span>: Rozhliadanie</div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10"><span className="text-cyan-400 font-bold">0</span>: 1:1 Pixel Zoom</div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10"><span className="text-cyan-400 font-bold">+ / -</span>: Priblíženie / Oddialenie</div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10"><span className="text-cyan-400 font-bold">PgUp / PgDn</span>: Ďalšia / Predchádzajúca</div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10"><span className="text-cyan-400 font-bold">/</span>: Čistý režim (Clean View)</div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10"><span className="text-cyan-400 font-bold">C</span>: Export 4K snímky</div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10"><span className="text-cyan-400 font-bold">1 / 2 / 3</span>: Štandard / Zaoblené / Planéta</div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10"><span className="text-cyan-400 font-bold">P</span>: Otáčanie (R/Stop/L)</div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10"><span className="text-amber-400 font-bold">M</span>: Režim filmu (Kino 360°)</div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10"><span className="text-blue-400 font-bold">F</span>: Celá obrazovka (Fullscreen)</div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10"><span className="text-sky-400 font-bold">B</span>: Peak Finder (Vrcholy na horizonte)</div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10"><span className="text-teal-400 font-bold">X</span>: 3D Virtuálna Chôdza (Hotspoty)</div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10"><span className="text-amber-400 font-bold">Y</span>: Cestovanie v Čase (Časová os)</div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10"><span className="text-violet-400 font-bold">G</span>: Gyroskop & Senzory mobilu</div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10"><span className="text-amber-400 font-bold">I</span>: Info & AI Lokálny Príbeh</div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10"><span className="text-cyan-400 font-bold">E</span>: Prieskumník (Filmový pás)</div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10"><span className="text-emerald-400 font-bold">L</span>: Mapa sveta na GPS pozícii</div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10"><span className="text-zinc-300 font-bold">R</span>: Reset kamery & FOV</div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10"><span className="text-cyan-400 font-bold">U</span>: Zdieľať odkaz na panorámu</div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10"><span className="text-cyan-400 font-bold">O</span>: 3D Priestorové audio [EXP]</div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10"><span className="text-amber-400 font-bold">K</span>: Solárny kompas [EXP]</div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10"><span className="text-cyan-400 font-bold">T</span>: Admin Tagovanie (D1)</div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10"><span className="text-yellow-400 font-bold">H</span>: Herný HUD pomocník</div>
          </div>
          <p>
            Stlačením <code>H</code> alebo kliknutím na ikonu klávesnice pri ovládačoch zoomu sa zobrazí interaktívna mechanická klávesnica s neónovými bublinami a popismi funkcií.
          </p>
        </div>
      ),
    },
    {
      id: 'sec-9',
      title: isSk ? '9. Bezpečnosť, Google OAuth & Cloudflare KV' : '9. Security, Google OAuth & Cloudflare KV',
      category: 'Security',
      icon: ShieldCheck,
      content: (
        <div className="space-y-4 text-xs md:text-sm text-zinc-300 leading-relaxed">
          <p>
            Administrátorský prístup je schovaný v hamburger menu a autorizovaný cez <strong>Google Identity Services (GIS)</strong> voči e-mailu <code>majo.trusik@gmail.com</code>.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Cloudflare KV Overrides:</strong> Zmeny stavu panorám (zverejnenie/skrytie, zložky, vymazanie) sa zapisujú do Cloudflare KV a okamžite prejavujú bez nutnosti prebudovávania celého JSON.</li>
            <li><strong>Zložka !DELETED!:</strong> Zmazané panorámy sa presúvajú do karantény <code>!DELETED!</code>, odkiaľ ich administrátor môže kedykoľvek jedným klikom obnoviť.</li>
            <li><strong>Rate Limiting sťahovania:</strong> Bežní návštevníci majú sťahovanie plných gigapixelových panorám obmedzené na 1 stiahnutie za minútu (administrátor má neobmedzené sťahovanie).</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'sec-10',
      title: isSk ? '10. Chronologický Prehľad Zmien (Od Počiatku po Súčasnosť)' : '10. Chronological Evolution Log',
      category: 'Evolution',
      icon: BookOpen,
      content: (
        <div className="space-y-3 text-xs md:text-sm text-zinc-300 leading-relaxed">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-cyan-400 font-bold text-xs uppercase block">Fáza 1: Vznik & WebGL Základy</span>
            Vytvorenie 360° prehliadača s Three.js sférou, čítanie EXIF GPS dát, základná Leaflet mapa a nasadenie na Cloudflare Pages.
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-cyan-400 font-bold text-xs uppercase block">Fáza 2: Sociálna Vrstva & D1 Databáza</span>
            Pridanie počítadla videní, hviezdičiek (obľúbené), zdieľania odkazov a komentárov poháňaných Cloudflare D1.
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-cyan-400 font-bold text-xs uppercase block">Fáza 3: Admin Konzola & Google GIS</span>
            Odomknutie správy cez Google OAuth, hromadný výber panorám, Cloudflare KV prepisy a zálohovanie databázy.
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-cyan-400 font-bold text-xs uppercase block">Fáza 4: Trojica Projekcií (Curved & Little Planet)</span>
            Doplnenie stereografických shaderov pre zaoblené zobrazenie a formát planétky so zachovaním rovnakého stredu otáčania.
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-cyan-400 font-bold text-xs uppercase block">Fáza 5: Progresívne HDR & 4K Export Snímok</span>
            Implementácia HDR tone mappingu chrániaceho hlbokú čiernu a export čistých 4K snímok s decentnou vodotlačou.
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-cyan-400 font-bold text-xs uppercase block">Fáza 6: Dynamické Tagy, Klastrovanie & Filmový Pás</span>
            Hashtagy z dátumu a lokality (3 riadky), zhlukovanie modrých bodiek na mape do klastrov, 3 veľkosti filmového pásu a 2K hover popup.
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-cyan-400 font-bold text-xs uppercase block">Fáza 7: 1:1 Pixel Zoom, Herný HUD & Klávesnica</span>
            Odstránenie kolízie ovládačov s veľkým pásom, odvodenie 1:1 natívneho zoomu (kláves 0), čistý režim (/), matica WASD klávesov a vizuálny herný HUD.
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-cyan-400 font-bold text-xs uppercase block">Fáza 8: Plynulý Prechod Medzi Panorámami & Zachovanie Stavov</span>
            Stabilná inštancia prehliadača naprieč filmovým pásom: zachovanie sklonu (tilt angle), plynulé neprerušované cyklické otáčanie (auto-pan) a identický projekčný režim (štandard / zaoblené / little planet). GPU shader crossfade (380ms Hermite blend) namiesto preblikávania.
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-cyan-400 font-bold text-xs uppercase block">Fáza 9: Režim Filmu (Kino 360° Celoobrazovková Prehliadka)</span>
            Kláves <code>M</code> alebo horná ikona filmu prepne prehliadač do celoobrazovkového čistého režimu (fullscreen iba s názvom a informáciami vľavo hore) a spustí plnú 360° rotáciu panorámy pri zachovaní sklonu a projekčného režimu. Po dokončení celého 360° kruhu automaticky a plynule prejde na nasledujúcu panorámu vo filmovom páse (prechádza všetkých 30 a nekonečne cykluje). Ukončenie prebieha stlačením klávesu M, ESC alebo krížikom.
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-cyan-400 font-bold text-xs uppercase block">
              {isSk ? 'Fáza 10: Inteligentný GPU Preloading Textúr & Prechod Bez Zaseknutia' : 'Phase 10: Intelligent GPU Texture Preloading & Stutter-Free Transitions'}
            </span>
            {isSk
              ? 'Predbežné načítanie textúr nasledujúcej a predchádzajúcej panorámy v playliste priamo do pamäte GPU cez renderer.initTexture(). V režime Filmu (M) plynulá rotácia pokračuje bez zastavenia, kým sieť nedokončí sťahovanie. Okamžitý 380ms Hermite shader crossfade priamo na ostrú textúru.'
              : 'Preloading of adjacent textures in playlist into GPU memory via renderer.initTexture(). Seamless continuous rotation in Movie mode (M) while network transfers complete, and instant 380ms Hermite shader crossfade without thumbnail flicker.'}
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-cyan-500/30">
            <span className="text-cyan-400 font-bold text-xs uppercase block">
              {isSk ? 'Fáza 11: Konsolidácia D1, Bezpečnostný Hardening, Hybridná Distribúcia, Admin Tagy (T) & Smart GPS (Súčasnosť - 15. Október 2026)' : 'Phase 11: D1 Consolidation, Security Hardening, Hybrid Asset Delivery, Admin Tagging (T) & Smart GPS (Current - October 15, 2026)'}
            </span>
            {isSk ? (
              <div className="space-y-1.5 mt-1 text-zinc-300">
                <p>• <strong>Cloudflare D1 Konsolidácia:</strong> Kompletný prechod z panoramas.json + KV prepisov na serverless SQLite Cloudflare D1. Všetky CRUD úpravy, zobrazenia, komentáre a hviezdičky bežia na D1.</p>
                <p>• <strong>Cloudflare Security Hardening:</strong> Striktné hlavičky (_headers) s HSTS, CSP, štandard RFC 9116 security.txt, _routes.json a edge _middleware.js blokujúci skenery zraniteľností a prázdne User-Agenty.</p>
                <p>• <strong>Hybrid Asset Delivery & 11K/15K GPU Oprava:</strong> Cloudflare Pages CDN pre 2K náhľady a šifrovaný Cloudflare Tunnel (ag.trusik.link) pre bezpečné streamovanie plných 8K/11K/15K originálov. Automatický offscreen canvas downsampling pre GPU limity (8192px).</p>
                <p>• <strong>Admin Správa Zložiek & Tagovanie (Kláves T):</strong> Zoskupovanie privátnych zložiek s hromadným výberom (Vybrať zložku) a editor vlastných hashtagov (kláves T) ukladaných do D1.</p>
                <p>• <strong>Smart GPS Workflow:</strong> 1-klikové kopírovanie GPS z rovnakého dátumu, vyhľadanie oblasti cez Nominatim a interaktívne umiestnenie na mapu s ťahaním pinov 1 po 1.</p>
                <p>• <strong>Fix Lišty Filtrov:</strong> Vyriešená vizuálna kolízia ActiveFiltersBar s hornými tlačidlami nástrojov v detaile panorámy.</p>
              </div>
            ) : (
              <div className="space-y-1.5 mt-1 text-zinc-300">
                <p>• <strong>Cloudflare D1 Consolidation:</strong> Migrated from static JSON + KV overrides to serverless SQLite Cloudflare D1. All CRUD operations, views, comments, favorites, and custom tags persist directly in D1.</p>
                <p>• <strong>Cloudflare Security Hardening:</strong> Strict HTTP security headers (_headers) with HSTS, CSP, RFC 9116 security.txt, _routes.json, and edge _middleware.js blocking vulnerability scanners and empty User-Agents.</p>
                <p>• <strong>Hybrid Asset Delivery & 11K/15K GPU Fix:</strong> Cloudflare Pages CDN for 2K previews combined with encrypted Cloudflare Tunnel (ag.trusik.link) streaming for 8K/11K/15K masters. Offscreen canvas downsampling for GPUs capped at 8192px.</p>
                <p>• <strong>Admin Folder Management & Tagging (Key T):</strong> Grouping private albums with 1-click batch selection and instant custom hashtag editor (hotkey T) persisted in D1.</p>
                <p>• <strong>Smart GPS Workflow:</strong> 1-click same-date GPS auto-copy, Nominatim location auto-zoom, and bulk map placement with 1-by-1 draggable fine-tuning markers.</p>
                <p>• <strong>Detail View Filter Bar Fix:</strong> Eliminated UI collisions between ActiveFiltersBar and top-right action buttons in detail view.</p>
              </div>
            )}
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-purple-500/30">
            <span className="text-purple-400 font-bold text-xs uppercase block">
              {isSk ? 'Fáza 12: Peak Finder, 3D Virtuálna Chôdza, Time-Travel, Gyroskop, AI Intel & Google Earth KML (Aktuálne - Október 2026)' : 'Phase 12: Peak Finder, 3D Walkthrough, Time-Travel, Gyroscope, AI Intel & Google Earth KML (Current - October 2026)'}
            </span>
            {isSk ? (
              <div className="space-y-1.5 mt-1 text-zinc-300">
                <p>• <strong>Peak Finder (Kláves B):</strong> Dynamický geodetický prepočet horizontu. 3D orientačné body pre horské vrcholy (Tatry, Malé Karpaty, Alpy), hrady a vysielače s presnou eleváciou a hladkým natočením kamery na klik.</p>
                <p>• <strong>3D Virtuálna Chôdza (Kláves X):</strong> Pozemné chevróny v 360° sfére s raycastingom a plynulým 220ms zrýchleným preletom (warp fly-in) na susedné panorámy (do 3.5 km).</p>
                <p>• <strong>Time-Travel Porovnanie v čase (Kláves Y):</strong> Automatická detekcia záberov v okruhu 100 m z minimálne 2 rôznych kalendárnych dní. Viaceré zábery z rovnakého dňa sú zlúčené do 1 reprezentanta s najbližšou letovou/GPS výškou. Plávajúca časová os so 60 FPS GPU prelínaním a zachovaním smeru pohľadu a zoomu.</p>
                <p>• <strong>Vizuálna Kalibrácia Zhlukov (Shift + C):</strong> Interaktívna administrátorská kalibrácia severného azimutu v reálnom čase s 50% shader prekryvom, krokovým ladením (±0.1°, ±1.0°, ±5.0°), A/B blikaním a perzistenciou v Cloudflare D1.</p>
                <p>• <strong>WebXR & Mobilný Gyroskop (Kláves G):</strong> Plynulé prepojenie DeviceOrientation senzorov smartfónu pre hands-free rozhliadanie sa pohybom zariadenia v priestore.</p>
                <p>• <strong>AI Scene Intel & Lokálne Príbehy (Kláves I):</strong> Atmosférické nálady scény (západ slnka, zima, les, voda, pamiatky) integrované do filtrov bočného panelu a detailný historicko-geografický kontext v paneli Info.</p>
                <p>• <strong>Google Earth KML Export:</strong> Hromadný export všetkých verejných panorám s priamymi URL odkazmi na panorama.trusik.link a presnou sieťou zobrazenia.</p>
                <p>• <strong>Zjednotený azimut v Movie exporte:</strong> Hromadné exporty rotujúcich videí pre klastrované panorámy zosynchronizované na rovnaký azimut pre plynulý strih v DaVinci Resolve.</p>
                <p>• <strong>Stiahnutie Príručky ako PDF:</strong> Vstavaný generátor tlačového PDF sprievodcu bez závislosti na externých balíkoch.</p>
              </div>
            ) : (
              <div className="space-y-1.5 mt-1 text-zinc-300">
                <p>• <strong>Peak Finder (Key B):</strong> Geodesic horizon calculation projecting 3D billboard markers for mountain peaks (Tatras, Carpathians, Alps), castles, and towers with smooth click-to-aim rotation.</p>
                <p>• <strong>3D Walkthrough (Key X):</strong> Ground chevrons inside the 360° sphere with multi-tier raycasting and cinematic 220ms fly-in warp transitions to neighboring panoramas (up to 3.5 km).</p>
                <p>• <strong>Time-Travel Timeline (Key Y):</strong> Automatic clustering within 100 m across at least 2 distinct calendar days with same-day altitude matching. Floating timeline with 60 FPS GPU crossfade and exact view-state retention.</p>
                <p>• <strong>Visual Cluster Calibration (Shift + C):</strong> Real-time 50% WebGL shader overlay alignment suite with fine step tuning (±0.1°, ±1°, ±5°), A/B flip comparator, and Cloudflare D1 persistence.</p>
                <p>• <strong>WebXR & Mobile Gyroscope (Key G):</strong> Real-time DeviceOrientation sensor tracking for intuitive hands-free exploration on smartphones and tablets.</p>
                <p>• <strong>AI Scene Intel & Local Heritage (Key I):</strong> Atmospheric mood filtering in the sidebar paired with contextual history in the Info modal.</p>
                <p>• <strong>Google Earth KML Integration:</strong> One-click bulk export of all public panoramas with deep-links to panorama.trusik.link.</p>
                <p>• <strong>Unified Movie Azimuth:</strong> Consistent North heading synchronization across cluster captures in video exports for DaVinci Resolve rotative blends.</p>
                <p>• <strong>Download User Guide as PDF:</strong> Built-in zero-dependency print-to-PDF engine generating vector-sharp documentation.</p>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'sec-11',
      title: isSk ? '11. Návod na Zostavenie Podobného Projektu Od Nuly' : '11. Green-Field Project Blueprint',
      category: 'Blueprint',
      icon: FileCode2,
      content: (
        <div className="space-y-4 text-xs md:text-sm text-zinc-300 leading-relaxed">
          <p>
            Postup pre nasadenie identickej architektúry na novom projekte:
          </p>
          <pre className="p-3 rounded-xl bg-black/60 border border-white/10 text-[11px] md:text-xs font-mono text-cyan-300 overflow-x-auto">
{`# 1. Klonovanie a inštalácia závislostí
git clone <repo-url>
cd frontend
npm install three @types/three lucide-react leaflet @types/leaflet react-router-dom i18next react-i18next

# 2. Vytvorenie Cloudflare D1 databázy a KV
npx wrangler d1 create panoramas_db
npx wrangler kv:namespace create ADMIN_KV

# 3. Zostavenie projektu
npm run build

# 4. Nasadenie na Cloudflare Pages
npx wrangler pages deploy dist --project-name panoramas-platform`}
          </pre>
        </div>
      ),
    },
    {
      id: 'sec-pro-tips',
      title: isSk ? '12. Pro Tipy & Kľúčové Odporúčané Funkcie' : '12. Pro Tips & Recommended Power Features',
      category: 'Pro Tips',
      icon: Sparkles,
      content: (
        <div className="space-y-4 text-xs md:text-sm text-zinc-300 leading-relaxed">
          <p>
            {isSk
              ? 'Súhrn najnovších prémiových funkcií a odporúčaných pracovných postupov pre maximálny zážitok z gigapixelových panorám:'
              : 'Summary of the latest premium features and recommended power-user workflows for the gigapixel panorama platform:'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <span className="text-amber-400 font-extrabold text-xs uppercase block mb-1">🎬 Režim Filmu (Kláves M)</span>
              {isSk
                ? 'Plná 360° automatická celoobrazovková prehliadka. Prehliadač sám otáča panorámu, na pozadí do GPU warm-upuje nasledujúcu a plynulo bez jediného dotyku prechádza cez všetkých 30 položiek filmového pásu.'
                : 'Full 360° automated hands-free tour. The viewer pans the scene, warms up the next texture in GPU memory, and seamlessly traverses all 30 strip items.'}
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-emerald-400 font-extrabold text-xs uppercase block mb-1">📸 4K Export Snímky (Kláves C)</span>
              {isSk
                ? 'Okamžitý export a stiahnutie čistého 4K obrázka aktuálneho pohľadu bez ovládacích prvkov, s decentným metadátovým pruhom (lokalita, dátum, GPS súradnice) pre sociálne siete.'
                : 'Instantly renders and downloads a pristine 4K snapshot of the active viewport without UI controls, complete with metadata watermark.'}
            </div>
            <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30">
              <span className="text-cyan-400 font-extrabold text-xs uppercase block mb-1">⌨️ Klávesový Gaming HUD (Kláves H)</span>
              {isSk
                ? 'Herná mapa klávesov s neónovými bublinami: WASD / šípky pre pohyb, 1/2/3 pre projekcie (štandard / zaoblené / planétka), 0 pre 1:1 natívny pixel zoom, P pre 3-krokový auto-pan a / pre čistý režim.'
                : 'Interactive gaming HUD keyboard guide: WASD navigation, 1/2/3 projection switcher, 0 for 1:1 native pixel zoom, P for auto-pan cycle, and / for clean view.'}
            </div>
          </div>
        </div>
      ),
    },
  ], [isSk]);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter((s) => s.title.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
  }, [sections, searchQuery]);

  return (
    <div className={`w-full ${standalone ? 'min-h-screen bg-[#090a0f] p-4 md:p-10' : 'p-2 md:p-6'} text-white`}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="glass-panel-elevated p-6 md:p-8 rounded-3xl border border-cyan-500/30 relative overflow-hidden shadow-2xl">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-widest">
                  Lead Systems Analyst Dossier • v4.2
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-wide">
                {isSk ? 'Systémová Architektúra & Kompletný Changelog' : 'System Architecture & Complete Changelog'}
              </h1>
              <p className="text-xs md:text-sm text-zinc-400 max-w-2xl leading-relaxed">
                {isSk
                  ? 'Komplexná technická špecifikácia od vzniku projektu po súčasný stav: matematické odvodenia projekcií, WebGL shadery, 1:1 pixel mapping, ingescia hashtagov a blueprint pre podobné projekty.'
                  : 'Comprehensive technical specification from inception to current state: projection optics derivation, WebGL shaders, 1:1 pixel mapping, hashtag ingestion and green-field blueprint.'}
              </p>
            </div>

            {/* Quick Actions (HTML Export / Print / Copy) */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                onClick={handleCopyHtml}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-200 hover:text-white border border-white/15 transition-all cursor-pointer shadow-md"
                title={isSk ? 'Skopírovať kompletný HTML kód' : 'Copy standalone HTML code'}
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
                <span>{copied ? (isSk ? 'Skopírované!' : 'Copied!') : (isSk ? 'Kopírovať HTML' : 'Copy HTML')}</span>
              </button>

              <button
                onClick={handleDownloadHtml}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-xs font-semibold text-cyan-300 hover:text-white border border-cyan-500/30 transition-all cursor-pointer shadow-md"
                title={isSk ? 'Stiahnuť samostatný HTML súbor' : 'Download standalone HTML file'}
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>{isSk ? 'Stiahnuť HTML' : 'Download HTML'}</span>
              </button>

              <a
                href="/tech-spec.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-xs font-bold text-cyan-200 hover:text-white border border-cyan-500/40 transition-all cursor-pointer shadow-md"
                title={isSk ? 'Otvoriť samostatnú HTML stránku v novom okne' : 'Open standalone HTML in new tab'}
              >
                <ExternalLink className="w-4 h-4 text-cyan-400" />
                <span>{isSk ? 'Samostatné HTML' : 'Standalone HTML'}</span>
              </a>

              <button
                onClick={() => window.print()}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-all cursor-pointer"
                title={isSk ? 'Tlačiť / Exportovať do PDF' : 'Print / Export to PDF'}
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isSk ? 'Filtrovať sekcie architektúry (napr. 1:1, HDR, WebGL)...' : 'Filter architectural sections (e.g. 1:1, HDR, WebGL)...'}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Sections Content List */}
        <div className="space-y-4">
          {filteredSections.map((sec) => {
            const Icon = sec.icon;
            const isOpen = activeSection === sec.id;
            return (
              <div
                key={sec.id}
                id={sec.id}
                className="glass-panel-elevated rounded-3xl border border-white/10 overflow-hidden transition-all shadow-xl"
              >
                <button
                  type="button"
                  onClick={() => setActiveSection(isOpen ? '' : sec.id)}
                  className="w-full flex items-center justify-between p-4 md:p-5 text-left bg-white/[0.02] hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                        {sec.category}
                      </span>
                      <h2 className="text-sm md:text-base font-bold text-white tracking-wide">
                        {sec.title}
                      </h2>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 text-zinc-400 transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-90 text-cyan-400' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="p-5 md:p-6 border-t border-white/10 bg-black/40 animate-fade-in">
                    {sec.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
