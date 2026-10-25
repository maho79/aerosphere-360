import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Globe,
  Compass,
  Filter,
  Camera,
  Download,
  Layers,
  MapPin,
  ZoomIn,
  Move,
  RotateCw,
  Maximize2,
  Menu,
  Sparkles,
  Clock,
  ExternalLink,
  ChevronDown,
  Info,
  CheckCircle2,
  Film,
  Keyboard,
  Volume2,
  Sun,
  Mountain,
  Footprints,
  Smartphone,
  History,
  Share2,
  RotateCcw,
  FileDown,
} from 'lucide-react';
import { downloadHelpPdf } from '../utils/pdfHelpExporter';

export const PublicHelp: React.FC = () => {
  const { i18n } = useTranslation();
  const isSk = i18n.language === 'sk';
  const [activeTab, setActiveTab] = useState<'map' | 'filters' | 'viewer' | 'export' | 'pro-tips'>('pro-tips');

  return (
    <div className="h-full overflow-y-auto p-4 md:p-10 max-w-5xl mx-auto custom-scrollbar">
      <div className="space-y-8 pb-16">
        {/* Header Hero */}
        <div className="glass-panel-elevated p-6 md:p-8 rounded-3xl border border-white/10 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/50">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-wide">
                  {isSk ? 'Sprievodca a Nápoveda' : 'User Guide & Help'}
                </h1>
                <p className="text-xs md:text-sm text-zinc-400">
                  {isSk
                    ? 'Objavte všetky funkcie 360° Glass Noir Panorama Explorer'
                    : 'Discover all features of 360° Glass Noir Panorama Explorer'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => downloadHelpPdf(isSk, false)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 hover:text-white border border-cyan-500/40 text-xs font-bold transition-all shadow-md shadow-cyan-950/40 cursor-pointer"
                title={isSk ? 'Stiahnuť kompletného sprievodcu ako PDF' : 'Download complete user guide as PDF'}
              >
                <FileDown className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isSk ? 'Stiahnuť PDF' : 'Download PDF'}</span>
              </button>
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-semibold text-cyan-300">
                {isSk ? 'Verejná verzia' : 'Public Edition'}
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-zinc-300">
                v2.8 (15K HDR)
              </span>
            </div>
          </div>

          {/* Quick Navigation Tabs */}
          <div className="flex flex-wrap gap-2 pt-6 border-t border-white/10 mt-6">
            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'map'
                  ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/30'
                  : 'glass-button text-zinc-300 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{isSk ? '1. Mapa a Svet' : '1. World Map'}</span>
            </button>
            <button
              onClick={() => setActiveTab('filters')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'filters'
                  ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/30'
                  : 'glass-button text-zinc-300 hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{isSk ? '2. Filtre a Vyhľadávanie' : '2. Filters & Search'}</span>
            </button>
            <button
              onClick={() => setActiveTab('viewer')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'viewer'
                  ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/30'
                  : 'glass-button text-zinc-300 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{isSk ? '3. 360° Prehliadač' : '3. 360° Viewer'}</span>
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'export'
                  ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/30'
                  : 'glass-button text-zinc-300 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{isSk ? '4. 4K Export a Sťahovanie' : '4. 4K Export & Downloads'}</span>
            </button>
            <button
              onClick={() => setActiveTab('pro-tips')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'pro-tips'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 shadow-md shadow-amber-500/30 font-extrabold'
                  : 'glass-button text-amber-300 hover:text-white border-amber-500/30'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isSk ? '5. ⭐ Pro Tipy pre Divákov' : '5. ⭐ Visitor Pro Tips'}</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Map Exploration */}
        {activeTab === 'map' && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6">
              <div className="flex items-center gap-3">
                <Globe className="w-6 h-6 text-cyan-400" />
                <h2 className="text-xl font-bold text-white">
                  {isSk ? 'Prieskum a Navigácia na Mape' : 'World Map Exploration'}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-white text-sm">
                    {isSk ? 'Zoskupovanie a Piny' : 'Clusters & Pins'}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {isSk
                      ? 'Panorámy v blízkom okolí sa automaticky zoskupujú do číselných bublín. Kliknutím na bublinu sa mapa priblíži na konkrétne miesta.'
                      : 'Nearby panoramas automatically group into cluster bubbles. Click a cluster to zoom in on individual locations.'}
                  </p>
                </div>

                <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-white text-sm">
                    {isSk ? 'Klikateľné GPS Súradnice' : 'Clickable GPS Coordinates'}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {isSk
                      ? 'Pri zobrazení náhľadu fotky kliknite na modré GPS súradnice – okamžite sa otvorí Google Maps s presným označením bodu v novom okne.'
                      : 'When viewing panorama cards, click the blue GPS coordinates to open the exact coordinates directly in Google Maps.'}
                  </p>
                </div>

                <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-white text-sm">
                    {isSk ? 'Mapové Podklady' : 'Map Layer Switcher'}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {isSk
                      ? 'V pravom hornom rohu mapy môžete prepínať medzi tmavým štýlom Glass Noir, detailným satelitným snímkom a klasickou cestnou mapou.'
                      : 'Switch between Dark Glass Noir theme, high-res Satellite imagery, and OpenStreetMap street view in the top right map controls.'}
                  </p>
                </div>
              </div>

              {/* Pro-Tip Box */}
              <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-start gap-3">
                <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-300 leading-relaxed">
                  <span className="font-bold text-cyan-300">
                    {isSk ? 'Rýchly tip:' : 'Pro tip:'}{' '}
                  </span>
                  {isSk
                    ? 'Prejdením myšou (hover) nad ľubovoľným bodom na mape sa vám okamžite zobrazí rýchla karta s miniatúrou, mestom, dátumom a rozlíšením panorámy bez nutnosti klikania.'
                    : 'Hovering over any map pin displays an instant hover card showing the photo thumbnail, city, date, and resolution.'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Smart Filters & Search */}
        {activeTab === 'filters' && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6">
              <div className="flex items-center gap-3">
                <Filter className="w-6 h-6 text-cyan-400" />
                <h2 className="text-xl font-bold text-white">
                  {isSk ? 'Inteligentné Vyhľadávanie a Filtre' : 'Smart Search & Categorization'}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Resolution Filters */}
                <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/40">
                      15K
                    </span>
                    <h3 className="font-bold text-white text-sm">
                      {isSk ? 'Filtrovanie podľa Rozlíšenia' : 'Resolution Filter (6K – 15K)'}
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {isSk
                      ? 'Všetky panorámy sú automaticky označené odznakom rozlíšenia (napr. 15K pre šírku 15 000 px, 12K, 8K atď.). V bočnom paneli môžete filtrovať fotky podľa požadovanej kvality.'
                      : 'Panoramas are badged with exact width categories (e.g. 15K for 15,000 px, 12K, 8K). Filter by minimum resolution to explore ultra high-definition captures.'}
                  </p>
                </div>

                {/* Month & Multi-select Filter */}
                <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/40">
                      Jan – Dec
                    </span>
                    <h3 className="font-bold text-white text-sm">
                      {isSk ? 'Filtrovanie podľa Mesiaca a Rokov' : 'Month & Year Multi-Selection'}
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {isSk
                      ? 'Vyberte si konkrétne mesiace v roku alebo kombinujte viacero rokov súčasne. Všetky filtre umožňujú viacnásobný výber a okamžite aktualizujú mapu aj filmový pás.'
                      : 'Filter by specific months or combine multiple years simultaneously. All filters support multi-selection and update the map and filmstrip dynamically.'}
                  </p>
                </div>

                {/* Time & Years Filter */}
                <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Clock className="w-4 h-4" />
                    <h3 className="font-bold text-white text-sm">
                      {isSk ? 'Časová Os a Roky' : 'Timeline & Years'}
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {isSk
                      ? 'Filtrujte archív podľa roku vzniku fotografie jedným kliknutím. Rýchlo si tak prezriete zábery z konkrétnej expedície alebo dovolenky.'
                      : 'Filter through years with a single click. Instantly isolate memories from specific expeditions and trips.'}
                  </p>
                </div>

                {/* Quick Search */}
                <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Sparkles className="w-4 h-4" />
                    <h3 className="font-bold text-white text-sm">
                      {isSk ? 'Rýchle Vyhľadávanie' : 'Instant Search'}
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {isSk
                      ? 'Do vyhľadávacieho poľa stačí zadať názov mesta (napr. Sloup, Brno, Rím), štátu alebo kľúčového slova zo súboru. Výsledky sa okamžite vyfiltrujú na mape aj v zozname.'
                      : 'Type a city name, country, or keyword into the search bar. The map and list update in real-time.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Immersive 360 Viewer */}
        {activeTab === 'viewer' && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6">
              <div className="flex items-center gap-3">
                <Compass className="w-6 h-6 text-cyan-400" />
                <h2 className="text-xl font-bold text-white">
                  {isSk ? 'Ovládanie 360° WebGL Prehliadača' : '360° Immersive Viewer Controls'}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl glass-panel border border-white/10 space-y-2">
                  <Move className="w-5 h-5 text-cyan-400" />
                  <h4 className="font-bold text-white text-xs">{isSk ? 'Otáčanie Pohľadu' : 'Look Around'}</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {isSk
                      ? 'Ťahajte myšou (alebo prstom na dotykovej obrazovke) ľubovoľným smerom v celom 360° priestore.'
                      : 'Click and drag with mouse, or swipe on touchscreen to look around in 360°.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl glass-panel border border-white/10 space-y-2">
                  <ZoomIn className="w-5 h-5 text-cyan-400" />
                  <h4 className="font-bold text-white text-xs">{isSk ? 'Priblíženie (Zoom)' : 'Zoom In / Out'}</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {isSk
                      ? 'Otáčaním kolieska myši alebo gestom dvoch prstov (pinch) plynule približujete detaily v plnom 15K rozlíšení.'
                      : 'Use mouse wheel or pinch-to-zoom to inspect crisp details in high resolution.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl glass-panel border border-white/10 space-y-2">
                  <RotateCw className="w-5 h-5 text-cyan-400" />
                  <h4 className="font-bold text-white text-xs">{isSk ? 'Plynulé Auto-Otáčanie' : 'Auto-Rotate'}</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {isSk
                      ? 'Tlačidlom rotácie spustíte relaxačné automatické otáčanie scény ako v digitálnej galérii.'
                      : 'Activate slow cinematic auto-rotation for a hands-free panoramic showcase.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl glass-panel border border-white/10 space-y-2">
                  <Menu className="w-5 h-5 text-cyan-400" />
                  <h4 className="font-bold text-white text-xs">{isSk ? 'Hamburger Menu (☰)' : 'Sidebar Toggle (☰)'}</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {isSk
                      ? 'Kliknutím na ikonu menu vľavo hore si môžete otvoriť zoznam a filtre panorám aj bez zatvorenia aktuálnej fotky.'
                      : 'Click hamburger menu top-left to browse all albums while keeping current panorama open.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl glass-panel border border-white/10 space-y-2">
                  <ChevronDown className="w-5 h-5 text-cyan-400" />
                  <h4 className="font-bold text-white text-xs">{isSk ? 'Filmový Pás (v)' : 'Filmstrip Minimize (v)'}</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {isSk
                      ? 'Dolný filmový pás zobrazuje najbližšie susedné panorámy zoradené podľa GPS vzdialenosti. Tlačidlom (v) ho môžete minimalizovať.'
                      : 'Bottom filmstrip displays nearby spots by GPS distance. Click (v) to minimize to bottom edge.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl glass-panel border border-white/10 space-y-2">
                  <Maximize2 className="w-5 h-5 text-cyan-400" />
                  <h4 className="font-bold text-white text-xs">{isSk ? 'Celá Obrazovka' : 'Fullscreen Mode'}</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {isSk
                      ? 'Tlačidlom celoobrazovkového režimu (alebo klávesom F11) maximalizujete zážitok bez rušivých líšt prehliadača.'
                      : 'Expand the sphere across your entire display for total immersion without browser frames.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: 4K Export & Downloads */}
        {activeTab === 'export' && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6">
              <div className="flex items-center gap-3">
                <Camera className="w-6 h-6 text-cyan-400" />
                <h2 className="text-xl font-bold text-white">
                  {isSk ? '4K Export Pohľadu a Pravidlá Sťahovania' : '4K View Export & Download Rules'}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 4K View Export */}
                <div className="p-6 rounded-2xl glass-panel border border-cyan-500/30 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/40 text-[11px] font-mono font-bold text-cyan-300">
                      3840 × 2160 (16:9)
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-base">
                    {isSk ? 'Export Aktuálneho Pohľadu (Pic Download)' : 'Export Current View (Pic Download)'}
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {isSk
                      ? 'Natočte a priblížte si v 360° priestore presne ten záber, ktorý sa vám páči, a kliknite na ikonu fotoaparátu. Systém okamžite vygeneruje čistý záber v plnom 4K Ultra HD (3840 × 2160 px, pomer 16:9) bez akýchkoľvek ikon či rušivých prvkov.'
                      : 'Frame your ideal perspective inside the sphere and click the camera icon. An offscreen WebGL renderer captures that exact view in true 4K Ultra HD (3840 × 2160, 16:9 aspect) completely clean.'}
                  </p>
                  <ul className="text-xs text-zinc-400 space-y-1 pt-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{isSk ? 'Bez limitu – môžete exportovať koľko záberov chcete' : 'Unlimited exports for all visitors'}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{isSk ? 'Ideálne ako pozadie na plochu alebo pre tlač' : 'Perfect for 4K desktop wallpapers & prints'}</span>
                    </li>
                  </ul>
                </div>

                {/* Full 360 Panorama Download */}
                <div className="p-6 rounded-2xl glass-panel border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center">
                      <Download className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] font-mono font-bold text-zinc-300">
                      {isSk ? '15K Ekvirektangulár' : '15K Equirectangular'}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-base">
                    {isSk ? 'Stiahnutie Plnej 360° Panorámy' : 'Download Full 360° Panorama'}
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {isSk
                      ? 'Umožňuje stiahnuť kompletný 15 000 px ekvirektangulárny JPG súbor vhodný pre VR okuliare (Oculus/Meta Quest, Vision Pro) alebo ďalšie grafické úpravy.'
                      : 'Download the full 15K equirectangular JPEG file for VR headsets (Meta Quest, Apple Vision Pro) or photography post-processing.'}
                  </p>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{isSk ? 'Bezpečnostný Limit Sťahovania:' : 'Download Rate Limit:'}</span>
                    </div>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      {isSk
                        ? 'Pre bežných návštevníkov je z dôvodu šetrenia šírky pásma povolené 1 stiahnutie za 1 minútu. Po kliknutí vidíte živý odpočet sekúnd priamo na tlačidle.'
                        : 'To protect server bandwidth, public visitors are limited to 1 full panorama download per 60 seconds with live countdown indicator.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Tab 5: Pro Tips for Public Visitors */}
        {activeTab === 'pro-tips' && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-panel p-6 md:p-8 rounded-3xl border border-amber-500/30 space-y-6 relative overflow-hidden bg-gradient-to-b from-amber-500/5 via-transparent to-black/40">
              <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/40 shadow-lg shadow-amber-950/40">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {isSk ? '⭐ Pro Tipy & Kľúčové Funkcie pre Návštevníkov' : '⭐ Visitor Pro Tips & Key Recommended Features'}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {isSk
                      ? 'Vyťažte z gigapixelového 360° prehliadača maximum vďaka týmto odporúčaniam'
                      : 'Get the most out of the gigapixel 360° experience with these power-user recommendations'}
                  </p>
                </div>
              </div>

              {/* 3 Main Highlighted Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. Movie Mode */}
                <div className="p-6 rounded-3xl glass-panel border border-amber-500/40 space-y-3.5 bg-zinc-950/70 hover:border-amber-400 transition-all shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
                      <Film className="w-5 h-5 text-amber-400" />
                    </div>
                    <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 font-mono font-black text-xs">
                      KLÁVES M
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-base">
                    {isSk ? '🎬 Režim Filmu (Kino 360° Tour)' : '🎬 Cinematic Movie Mode'}
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {isSk
                      ? 'Sadnite si do kresla a stlačte M (alebo ikonu filmu na hornej lište). Prehliadač sa prepne do čistej celej obrazovky (fullscreen iba s názvom) a sám otočí aktuálnu panorámu o 360°. Následne plynulým shader rozpustením automaticky prejde na ďalšiu z 30 panorám vo filmovom páse.'
                      : 'Lean back and press M (or the film icon in the top toolbar). Launches a fullscreen hands-free cinema tour: completes a smooth 360° rotation on each panorama, preloads the next texture in GPU memory, and seamlessly auto-advances across all 30 strip items.'}
                  </p>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-zinc-300 space-y-1">
                    <span className="text-amber-300 font-bold block">
                      {isSk ? 'Prečo si to zamilujete:' : 'Why you will love it:'}
                    </span>
                    {isSk
                      ? 'Nulové zaseknutie: prehliadač textúru ďalšej panorámy zahrieva vopred v grafickej karte (GPU) a prepne sa až v momente dokonalej plynulosti.'
                      : 'Zero stutter: textures warm up ahead of time in GPU memory with smooth Hermite dissolves.'}
                  </div>
                </div>

                {/* 2. 4K Photo Capture */}
                <div className="p-6 rounded-3xl glass-panel border border-emerald-500/40 space-y-3.5 bg-zinc-950/70 hover:border-emerald-400 transition-all shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30">
                      <Camera className="w-5 h-5 text-emerald-400" />
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-mono font-black text-xs">
                      KLÁVES C
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-base">
                    {isSk ? '📸 Čistá 4K Fotka bez Ikon' : '📸 4K Pure Snapshot'}
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {isSk
                      ? 'Natočte si záber do ľubovoľného uhla a stlačte C (alebo ikonu fotoaparátu). Okamžite sa vygeneruje a stiahne čistá fotografia aktuálneho výrezu v ultra-vysokom rozlíšení 3840 × 2160 px (4K) bez akýchkoľvek ovládacích prvkov, s decentným podpisom a GPS súradnicami.'
                      : 'Frame your ideal angle in 360° and hit C (or camera icon). Instantly generates and downloads a pure 3840×2160 4K wallpaper of that exact view with clean metadata overlay.'}
                  </p>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-zinc-300 space-y-1">
                    <span className="text-emerald-300 font-bold block">
                      {isSk ? 'Neobmedzené použitie:' : 'Unlimited usage:'}
                    </span>
                    {isSk
                      ? 'Môžete si naklikať a uložiť toľko záberov, koľko chcete – ideálne ako tapety na obrazovku či pozadia.'
                      : 'Export as many angles as you like without rate limits – perfect for prints & desktop wallpapers.'}
                  </div>
                </div>

                {/* 3. Gaming Keyboard Navigation */}
                <div className="p-6 rounded-3xl glass-panel border border-cyan-500/40 space-y-3.5 bg-zinc-950/70 hover:border-cyan-400 transition-all shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-500/30">
                      <Keyboard className="w-5 h-5 text-cyan-400" />
                    </div>
                    <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-mono font-black text-xs">
                      KLÁVES H
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-base">
                    {isSk ? '⌨️ Herný Sprievodca Klávesov' : '⌨️ Gaming Keyboard Guide'}
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {isSk
                      ? 'Stlačte H kedykoľvek pre zobrazenie interaktívnej hernej klávesnice s neónovými bublinami. Získate okamžitú kontrolu nad celým 360° priestorom ako v moderných počítačových hrách.'
                      : 'Press H anytime to open the interactive glowing mechanical keyboard guide. Fly through panoramic environments with gaming shortcuts.'}
                  </p>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-zinc-300 space-y-1">
                    <span className="text-cyan-300 font-bold block">
                      {isSk ? 'Kompletný zoznam herných skratiek:' : 'Full shortcut mapping:'}
                    </span>
                    <ul className="space-y-0.5 text-zinc-400">
                      <li>• <strong>WASD / Šípky</strong>: plynulé otáčanie kamery</li>
                      <li>• <strong>1 / 2 / 3</strong>: Štandard / Zaoblené / Planétka</li>
                      <li>• <strong>0</strong>: 1:1 natívny pixel zoom v strede</li>
                      <li>• <strong>P</strong>: {isSk ? 'Automatická rotácia scény (Rotate)' : 'Auto-Rotate camera scene'}</li>
                      <li>• <strong>F</strong>: Celá obrazovka (Fullscreen)</li>
                      <li>• <strong>B</strong>: Peak Finder (vrcholy na horizonte)</li>
                      <li>• <strong>X</strong>: 3D Virtuálna chôdza (hotspoty)</li>
                      <li>• <strong>Y / Shift+Y</strong>: {isSk ? 'Časová os / Automatické prehrávanie (2s)' : 'Timeline / 2s Auto-Play'}</li>
                      <li>• <strong>] / PageUp / .</strong>: {isSk ? 'Novšia / nasledujúca panoráma (hore po osi)' : 'Next / newer panorama (up on timeline)'}</li>
                      <li>• <strong>[ / PageDown / ,</strong>: {isSk ? 'Staršia / predchádzajúca panoráma (dole po osi)' : 'Previous / older panorama (down on timeline)'}</li>
                      <li>• <strong>G</strong>: Gyroskop (pohybové senzory)</li>
                      <li>• <strong>I</strong>: Informácie a AI príbeh lokality</li>
                      <li>• <strong>E</strong>: Prieskumník & filmový pás</li>
                      <li>• <strong>L</strong>: Otvoriť mapu na GPS súradniciach</li>
                      <li>• <strong>R</strong>: Reset kamery do predvoleného stavu</li>
                      <li>• <strong>U</strong>: Zdieľať odkaz na panorámu</li>
                      <li>• <strong>O</strong>: Priestorové 3D ozvučenie [EXP]</li>
                      <li>• <strong>K</strong>: Solárny kompas & True North [EXP]</li>
                      <li>• <strong>/</strong>: Čistý režim bez rušivých líšt</li>
                    </ul>
                  </div>
                </div>

                {/* 4. Spatial Audio Engine [EXPERIMENTAL] */}
                <div className="p-6 rounded-3xl glass-panel border border-cyan-500/40 space-y-3.5 bg-zinc-950/70 hover:border-cyan-400 transition-all shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-500/30">
                      <Volume2 className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-amber-400 text-zinc-950 font-black text-[9px] uppercase font-mono">
                        [EXP]
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-mono font-black text-xs">
                        KLÁVES O
                      </span>
                    </div>
                  </div>
                  <h3 className="font-bold text-white text-base">
                    {isSk ? '🔊 Priestorový Spatial Audio Engine' : '🔊 3D Spatial Audio Engine'}
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {isSk
                      ? 'Experimentálny modul Three.js PositionalAudio vytvorí upokojujúcu 3D zvukovú kulisu: jemný hudobný ambientný pad na pozadí, príjemné prelety vtákov na oblohe, jemný vietor na horizonte a vzdialené linkové lietadlo bez akýchkoľvek rušivých tónov.'
                      : 'Experimental Three.js PositionalAudio engine renders a soothing 3D soundscape: gentle musical ambient pad chords, smooth bird flybys, horizon breeze, and distant airliner.'}
                  </p>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-zinc-300 space-y-1">
                    <span className="text-cyan-300 font-bold block">
                      {isSk ? 'Procedurálna syntéza:' : 'Procedural synthesis:'}
                    </span>
                    {isSk
                      ? 'Engine disponuje inteligentnou syntézou Web Audio, ktorá generuje audio aj pri výpadku siete alebo offline prehliadaní.'
                      : 'Equipped with procedural Web Audio fallback that synthesizes audio buffers on the fly.'}
                  </div>
                </div>

                {/* 5. Solar Azimuth Compass & Sun Tracking [EXPERIMENTAL] */}
                <div className="p-6 rounded-3xl glass-panel border border-amber-500/40 space-y-3.5 bg-zinc-950/70 hover:border-amber-400 transition-all shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
                      <Compass className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-amber-400 text-zinc-950 font-black text-[9px] uppercase font-mono">
                        [EXP]
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 font-mono font-black text-xs">
                        KLÁVES K
                      </span>
                    </div>
                  </div>
                  <h3 className="font-bold text-white text-base">
                    {isSk ? '🧭 Solárny Kompas, AR v oblakoch & Radar' : '🧭 Solar Compass, Cloud AR & Radar'}
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {isSk
                      ? 'V štandardnom režime premieta AR azimutové značky priamo v 3D scéne v oblakoch (+20° nad horizontom), presný stredový zameriavač so stupňami a nadmorskou výškou, a vľavo dolu rotujúcu satelitnú radarovú mapku (r ≈ 1 km) natočenú podľa aktuálneho smeru pohľadu.'
                      : 'In standard view, renders 360° AR azimuth markers floating in the clouds (+20° above horizon), center crosshair reticle with degrees & elevation, and a rotating circular satellite radar minimap (r ≈ 1 km).'}
                  </p>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-zinc-300 space-y-1">
                    <span className="text-amber-300 font-bold block">
                      {isSk ? 'Vysoká presnosť:' : 'High accuracy:'}
                    </span>
                    {isSk
                      ? 'Viac než 1 500 panorám v databáze má presný kalibrovaný uhol natočenia na sever so spoľahlivosťou až 92%.'
                      : 'Over 1,500 panoramas in the database are calibrated with exact north offsets up to 92% confidence.'}
                  </div>
                </div>

                {/* 6. Peak Finder & POI na horizonte */}
                <div className="p-6 rounded-3xl glass-panel border border-sky-500/40 space-y-3.5 bg-zinc-950/70 hover:border-sky-400 transition-all shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-300 flex items-center justify-center border border-sky-500/30">
                      <Mountain className="w-5 h-5 text-sky-400" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-sky-500/20 border border-sky-400/50 text-sky-300 font-mono font-black text-xs">
                      KLÁVES B
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-base">
                    {isSk ? '⛰️ Peak Finder (Vrcholy na Horizonte)' : '⛰️ Peak Finder (Horizon Peaks)'}
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {isSk
                      ? 'Stlačením klávesu B zapnete 3D orientačné značky na horizonte pre okolité hory, hrady, rozhľadne a vysielače. Zobrazujú presný názov, nadmorskú výšku a vzdialenosť v km. Kliknutím na značku sa kamera hladko otočí priamo na daný vrchol.'
                      : 'Press B to toggle 3D mountain peak and landmark markers floating along the horizon. Shows peak names, elevation, and distance in km. Clicking a marker smoothly rotates camera to face it.'}
                  </p>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-zinc-300 space-y-1">
                    <span className="text-sky-300 font-bold block">
                      {isSk ? 'Geodetický výpočet:' : 'Geodesic calculation:'}
                    </span>
                    {isSk
                      ? 'Azimuty sú prepočítavané cez sférickú trigonometriu so započítaním kalibrácie severu každej panorámy.'
                      : 'Bearings are computed using spherical trigonometry and realigned with calibrated panorama north.'}
                  </div>
                </div>

                {/* 7. 3D Virtuálna Chôdza & Hotspoty */}
                <div className="p-6 rounded-3xl glass-panel border border-teal-500/40 space-y-3.5 bg-zinc-950/70 hover:border-teal-400 transition-all shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-500/30">
                      <Footprints className="w-5 h-5 text-teal-400" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-teal-500/20 border border-teal-400/50 text-teal-300 font-mono font-black text-xs">
                      KLÁVES X
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-base">
                    {isSk ? '🚶 3D Virtuálna Chôdza (Hotspoty & Prelet)' : '🚶 3D Virtual Walkthrough'}
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {isSk
                      ? 'Stlačením klávesu X aktivujete navigačné šípky (chevróny) umiestnené na zemi v 360° priestore smerujúce k okolitým panorámam (do 3.5 km). Kliknutím na chevrón sa spustí plynulý zrýchlený prelet (fly-in warp) priamo na nové miesto.'
                      : 'Press X to enable ground chevron hotspots pointing toward neighboring panoramas. Clicking any chevron triggers a cinematic zoom fly-in warp directly into the target view.'}
                  </p>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-zinc-300 space-y-1">
                    <span className="text-teal-300 font-bold block">
                      {isSk ? 'Plynulý Street View zážitok:' : 'Street View experience:'}
                    </span>
                    {isSk
                      ? 'Prechádzajte sa po chodníkoch a vyhliadkach prirodzeným klikaním do priestoru bez nutnosti hľadať v zoznamoch.'
                      : 'Walk through scenic trails and view points seamlessly by simply clicking ground hotspots.'}
                  </div>
                </div>

                {/* 8. Time-Travel Porovnanie v čase */}
                <div className="p-6 rounded-3xl glass-panel border border-amber-500/40 space-y-3.5 bg-zinc-950/70 hover:border-amber-400 transition-all shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
                      <History className="w-5 h-5 text-amber-400" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 font-mono font-black text-xs">
                      KLÁVES Y
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-base">
                    {isSk ? '⏳ Cestovanie v Čase (Time-Travel)' : '⏳ Time-Travel Comparison'}
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {isSk
                      ? 'Ak sa na danom mieste (v okruhu do 100 m) nachádzajú zábery z minimálne 2 rôznych kalendárnych dní, stlačením klávesu Y (alebo kliknutím na Časová os) otvoríte chronologickú časovú os. Viaceré zábery z toho istého dňa systém automaticky zlúči do 1 najlepšieho reprezentanta podľa zhodnej letovej výšky (altitúdy).'
                      : 'When captures exist across at least 2 distinct calendar days within 100m, pressing Y (or clicking Timeline) opens chronological captures. Multiple shots on the same day are collapsed into 1 best representative matching camera flight altitude.'}
                  </p>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-zinc-300 space-y-1">
                    <span className="text-amber-300 font-bold block">
                      {isSk ? 'Rýchla navigácia, Prehrávanie & Kontinuita:' : 'Fast Navigation, Auto-Play & Continuity:'}
                    </span>
                    {isSk
                      ? 'Klávesy PageDown / PageUp prepínajú medzi rokmi s 60 FPS GPU prelínaním. Nové malé tlačidlo Play na lište časovej osi (alebo Shift+Y) automaticky cyklicky rotuje všetky zábery v 2-sekundových intervaloch.'
                      : 'PageDown / PageUp keys cycle chronologically with smooth 60 FPS GPU crossfade. The small Play button on the timeline (or Shift+Y) auto-rotates through all captures at 2-second intervals.'}
                  </div>
                </div>

                {/* 9. WebXR & Mobilný Gyroskop */}
                <div className="p-6 rounded-3xl glass-panel border border-violet-500/40 space-y-3.5 bg-zinc-950/70 hover:border-violet-400 transition-all shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-violet-500/20 text-violet-300 flex items-center justify-center border border-violet-500/30">
                      <Smartphone className="w-5 h-5 text-violet-400" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-violet-500/20 border border-violet-400/50 text-violet-300 font-mono font-black text-xs">
                      KLÁVES G
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-base">
                    {isSk ? '📱 Mobilný Gyroskop & WebXR Senzory' : '📱 Mobile Gyroscope & WebXR'}
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {isSk
                      ? 'Na smartfónoch a tabletoch stlačením ikony gyroskopu (alebo klávesu G) premeníte zariadenie na virtuálne okno do reality. Otáčajte telefónom okolo seba v priestore a kamera v 360° panoráme bude presne sledovať vaše fyzické pohyby.'
                      : 'On smartphones and tablets, toggling the gyroscope (or pressing G) transforms your device into a real-time motion window. Simply point your phone around to look inside the 360° environment.'}
                  </p>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-zinc-300 space-y-1">
                    <span className="text-violet-300 font-bold block">
                      {isSk ? 'iOS & Android podpora:' : 'iOS & Android support:'}
                    </span>
                    {isSk
                      ? 'Automatické vyžiadanie DeviceOrientation permission na iOS s plynulou alfa/beta/gama filtráciou šumu.'
                      : 'Seamless DeviceOrientation permission handling on iOS with smooth alpha/beta/gamma smoothing.'}
                  </div>
                </div>

                {/* 10. AI Scene Intel & Lokálne Príbehy */}
                <div className="p-6 rounded-3xl glass-panel border border-emerald-500/40 space-y-3.5 bg-zinc-950/70 hover:border-emerald-400 transition-all shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30">
                      <Sparkles className="w-5 h-5 text-emerald-400" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-mono font-black text-xs">
                      KLÁVES I
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-base">
                    {isSk ? '🧠 AI Atmosféra & Lokálne Príbehy' : '🧠 AI Scene Intel & Local Stories'}
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {isSk
                      ? 'V bočnom paneli môžete filtrovať panorámy podľa atmosféry a nálady (Západ slnka, Zima a sneh, Lesné ticho, Voda, Historické dedičstvo). Stlačením klávesu I v prehliadači sa zobrazí detailný historicko-geografický príbeh lokality s odporúčanými highlightmi.'
                      : 'Filter scenes by atmospheric mood tags in the sidebar (Sunset, Winter Snow, Forest, Water, Heritage). Pressing I in the viewer presents localized historical context and sightseeing highlights.'}
                  </p>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-zinc-300 space-y-1">
                    <span className="text-emerald-300 font-bold block">
                      {isSk ? 'Inteligentný kontext:' : 'Intelligent context:'}
                    </span>
                    {isSk
                      ? 'Získajte hlbšie informácie o histórii hradov, prírodných rezervácií a vyhliadok jedným kliknutím.'
                      : 'Gain deeper cultural and geographical insight into every capture location with a single keystroke.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
