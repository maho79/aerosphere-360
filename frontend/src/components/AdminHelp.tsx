import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdmin } from '../context/AdminContext';
import { Link } from 'react-router-dom';
import {
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  Boxes,
  CheckSquare,
  HardDrive,
  Cloud,
  FileJson,
  FolderLock,
  Layers,
  Sparkles,
  Download,
  AlertTriangle,
  CheckCircle2,
  Terminal,
  Cpu,
  BookOpen,
  FileCode2,
  Globe2,
  FileDown,
  RotateCcw,
} from 'lucide-react';
import { AdminTechSpec } from './AdminTechSpec';
import { downloadHelpPdf } from '../utils/pdfHelpExporter';

export const AdminHelp: React.FC = () => {
  const { i18n } = useTranslation();
  const isSk = i18n.language === 'sk';
  const { isAdmin, setShowAdminModal } = useAdmin();
  const [activeTab, setActiveTab] = useState<'selection' | 'folders' | 'cloudflare' | 'migration' | 'pipeline' | 'googleearth' | 'techspec'>('selection');

  // If not logged in as Admin, show locked access gate
  if (!isAdmin) {
    return (
      <div className="h-full overflow-y-auto p-4 md:p-12 flex items-center justify-center">
        <div className="w-full max-w-lg glass-panel-elevated p-8 md:p-10 rounded-3xl border border-rose-500/30 text-center space-y-6 shadow-2xl relative overflow-hidden animate-fade-in">
          <div className="absolute -top-24 -left-24 w-56 h-56 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-950/60">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-[11px] font-bold text-rose-300 uppercase tracking-widest">
              {isSk ? 'Chránená Oblasť' : 'Protected Area'}
            </span>
            <h1 className="text-2xl font-black text-white">
              {isSk ? 'Administrátorská Nápoveda' : 'Administrator Guide'}
            </h1>
            <p className="text-xs md:text-sm text-zinc-400 leading-relaxed max-w-md mx-auto">
              {isSk
                ? 'Táto sekcia obsahuje detailné inštrukcie pre správu archívu, hromadné úpravy, migráciu projektu a nasadenie na Cloudflare. Prístup je vyhradený pre administrátora.'
                : 'This section contains technical documentation for archive management, bulk property editing, PC migration, and Cloudflare deployment. Administrator access is required.'}
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setShowAdminModal(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-950/60 transition-all flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              <span>{isSk ? 'Odomknúť Admin Režim' : 'Unlock Admin Mode'}</span>
            </button>
            <Link
              to="/help"
              className="w-full sm:w-auto px-5 py-3 rounded-2xl glass-button text-xs font-semibold text-zinc-300 hover:text-white flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>{isSk ? 'Verejná Nápoveda' : 'Public User Guide'}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Admin View
  return (
    <div className="h-full overflow-y-auto p-4 md:p-10 max-w-5xl mx-auto custom-scrollbar">
      <div className="space-y-8 pb-16">
        {/* Header Hero */}
        <div className="glass-panel-elevated p-6 md:p-8 rounded-3xl border border-rose-500/30 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-950/50">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-black text-white tracking-wide">
                    {isSk ? 'Administrátorský Manuál' : 'Administrator Operations Guide'}
                  </h1>
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping" />
                </div>
                <p className="text-xs md:text-sm text-zinc-400">
                  {isSk
                    ? 'Kompletná dokumentácia správy archívu, hromadných úprav, migrácie a Cloudflare'
                    : 'Complete technical manual for archive administration, bulk editing, migration & Cloudflare'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => downloadHelpPdf(isSk, true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition-all shadow-md shadow-rose-950/40 cursor-pointer"
                title={isSk ? 'Stiahnuť kompletnú administrátorskú príručku ako PDF' : 'Download complete administrator manual as PDF'}
              >
                <FileDown className="w-3.5 h-3.5 text-rose-400" />
                <span>{isSk ? 'Stiahnuť PDF' : 'Download PDF'}</span>
              </button>
              <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-[11px] font-bold text-rose-300">
                {isSk ? 'Režim Správcu Aktívny' : 'Admin Session Active'}
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 pt-6 border-t border-white/10 mt-6">
            <button
              onClick={() => setActiveTab('selection')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'selection'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                  : 'glass-button text-zinc-300 hover:text-white'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{isSk ? '1. Hromadný Výber & Úpravy' : '1. Multi-Select & Bulk Edit'}</span>
            </button>
            <button
              onClick={() => setActiveTab('folders')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'folders'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                  : 'glass-button text-zinc-300 hover:text-white'
              }`}
            >
              <FolderLock className="w-3.5 h-3.5" />
              <span>{isSk ? '2. Súkromné Zložky & Non-GPS' : '2. Private Folders & Non-GPS'}</span>
            </button>
            <button
              onClick={() => setActiveTab('cloudflare')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'cloudflare'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                  : 'glass-button text-zinc-300 hover:text-white'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>{isSk ? '3. Lokálny Beh vs. Cloudflare' : '3. Local Run vs. Cloudflare'}</span>
            </button>
            <button
              onClick={() => setActiveTab('migration')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'migration'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                  : 'glass-button text-zinc-300 hover:text-white'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>{isSk ? '4. Migrácia na PC (Úspora 33.5 GB)' : '4. PC Migration (Save 33.5GB)'}</span>
            </button>
            <button
              onClick={() => setActiveTab('pipeline')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'pipeline'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                  : 'glass-button text-zinc-300 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{isSk ? '5. Spracovanie Nových Fotiek' : '5. Ingestion Pipeline'}</span>
            </button>
            <button
              onClick={() => setActiveTab('googleearth')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'googleearth'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                  : 'glass-button text-amber-300 hover:text-white border-amber-500/30'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{isSk ? '6. Google Earth KML Prepojenie' : '6. Google Earth KML Feed'}</span>
            </button>
            <button
              onClick={() => setActiveTab('techspec')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'techspec'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md shadow-cyan-500/30'
                  : 'glass-button text-cyan-300 hover:text-white border-cyan-500/30'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isSk ? '7. Systémová Architektúra & Changelog' : '7. System Architecture & Tech Spec'}</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Multi-Select & Bulk Edit */}
        {activeTab === 'selection' && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6">
              <div className="flex items-center gap-3">
                <CheckSquare className="w-6 h-6 text-rose-400" />
                <h2 className="text-xl font-bold text-white">
                  {isSk ? 'Hromadný Výber a Editácia Vlastností' : 'Multi-Selection & Bulk Property Editing'}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
                    1
                  </div>
                  <h3 className="font-bold text-white text-sm">
                    {isSk ? 'Obdĺžnikový Výber na Mape (Box Select)' : 'Map Rectangle Marquee Selection'}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {isSk
                      ? 'Na mape kliknite na tlačidlo "Box Select". Kurzor sa zmení na krížik – ťahaním myšou nakreslite obdĺžnik a označte celú geografickú oblasť naraz.'
                      : 'Click the "Box Select" button on the map. Drag a rectangle to instantly select all pins in that geographic area.'}
                  </p>
                </div>

                <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
                    2
                  </div>
                  <h3 className="font-bold text-white text-sm">
                    {isSk ? 'Zaškrtávanie v Bočnom Paneli' : 'Sidebar Cards & Folder Selection'}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {isSk
                      ? 'Každá karta má zaškrtávacie políčko. Tlačidlom "Select Folder" môžete vybrať alebo odznačiť všetky fotky v celej zložke jedným kliknutím.'
                      : 'Each photo card has a selection checkbox. Use "Select Folder" to toggle selection across an entire album.'}
                  </p>
                </div>

                <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                    3
                  </div>
                  <h3 className="font-bold text-white text-sm">
                    {isSk ? 'Výber vo Filmovom Páse' : 'Viewer Filmstrip Checkboxes'}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {isSk
                      ? 'Počas prezerania 360° fotky môžete označovať susedné panorámy priamo vo filmovom páse (fajka v rohu náhľadu) alebo v hornej lište.'
                      : 'While viewing a 360° panorama, toggle selection directly on filmstrip cards or via the top-bar checkbox.'}
                  </p>
                </div>
              </div>

              {/* Floating Toolbar Explanation */}
              <div className="p-6 rounded-2xl bg-zinc-950/80 border border-white/15 space-y-4">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Boxes className="w-4 h-4 text-cyan-400" />
                  <span>{isSk ? 'Plávajúci Panel Hromadných Akcií (Bulk Actions Bar)' : 'Floating Bulk Actions Bar'}</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {isSk
                    ? 'Keď je označená aspoň jedna fotka, dole v strede obrazovky sa automaticky vysunie plávajúci panel s počítadlom vybraných položiek a okamžitými akciami:'
                    : 'Whenever photos are selected, a floating bar docks at the bottom with quick actions:'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
                    <span className="font-bold block mb-1">[ Make Public ]</span>
                    {isSk ? 'Zverejní vybrané fotky – sprístupní ich všetkým návštevníkom.' : 'Makes selected photos visible to the public.'}
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                    <span className="font-bold block mb-1">[ Make Private ]</span>
                    {isSk ? 'Presunie vybrané fotky do súkromného archívu (iba pre admina).' : 'Hides photos into private archives (admin only).'}
                  </div>
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                    <span className="font-bold block mb-1">[ Delete ]</span>
                    {isSk ? 'Označí fotky ako zmazané (presun do zložky !DELETED!).' : 'Marks photos as deleted (moves to !DELETED!).'}
                  </div>
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-300">
                    <span className="font-bold block mb-1">[ Tagy (Kláves T) ]</span>
                    {isSk ? 'Otvoriť editor vlastných hashtagov (perzistencia v D1) pre označené fotky.' : 'Open custom tags editor (persisted in D1) for selected photos.'}
                  </div>
                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300">
                    <span className="font-bold block mb-1">[ Smart GPS ]</span>
                    {isSk ? 'Inteligentný GPS asistent: kopírovanie podľa dňa, hľadanie lokality a mapa.' : 'Smart GPS tool: same-date copy, Nominatim auto-zoom & map placement.'}
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-xs text-emerald-200">
                    <span className="font-bold block mb-1">[ Zarovnať 2 (Shift+C) ]</span>
                    {isSk ? 'Kalibrácia azimutu 2 označených panorám z rovnakého klastra v reálnom čase.' : 'Real-time azimuth calibration for 2 selected cluster panoramas.'}
                  </div>
                </div>
              </div>

              {/* Visual Alignment & Timeline Clusters Specification */}
              <div className="p-6 rounded-2xl bg-amber-950/20 border border-amber-500/40 space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span>{isSk ? 'Vizuálna Kalibrácia Zhlukov & Pravidlá Časovej Osi' : 'Visual Calibration & Timeline Cluster Rules'}</span>
                </div>
                <div className="text-xs text-zinc-300 space-y-2 leading-relaxed">
                  <p>
                    {isSk
                      ? '• <strong>50% Prekryv (Shift + C):</strong> Pre presné zrovnanie dvoch panorám v klastri stlačte Shift + C (alebo označte presne 2 na mape a kliknite na Zarovnať 2). Nástroj v reálnom čase premieta referenčnú panorámu s 50% blendom priamo v WebGL shadere, podporuje jemné ladenie azimutu (±0.1°, ±1.0°, ±5.0°), A/B blikanie (Medzerník) a uloženie do Cloudflare D1.'
                      : '• <strong>50% Overlay Blend (Shift + C):</strong> Press Shift + C inside a cluster or select exactly 2 panoramas on map. Offers live shader rotation, ±0.1° / ±1° / ±5° step tuning, A/B flip (Space), and Cloudflare D1 persistence.'}
                  </p>
                  <p>
                    {isSk
                      ? '• <strong>Rôzne kalendárne dni:</strong> Časový klaster striktne vyžaduje zábery z minimálne 2 rôznych kalendárnych dní (YYYY-MM-DD) v okruhu do 100 m. Viacero záberov z rovnakého dňa sa zlúči do 1 reprezentanta podľa najpodobnejšej letovej/GPS výšky (altitúdy).'
                      : '• <strong>Distinct calendar dates:</strong> Timeline clusters require captures from >= 2 calendar days within 100m. Same-day multi-captures collapse into 1 representative matching the camera flight altitude.'}
                  </p>
                  <p>
                    {isSk
                      ? '• <strong>Zjednotený azimut pre Movie export:</strong> Pri hromadnom exporte filmov v admin režime sa panorámy patriace do zrovnaných klastrov vždy renderujú so zhodným azimutom pre plynulé vrstvenie a prechody v strižniach (DaVinci Resolve).'
                      : '• <strong>Unified Movie Azimuth:</strong> Group video exports automatically harmonize azimuths across cluster captures for seamless rotative dissolve blending in DaVinci Resolve.'}
                  </p>
                  <p>
                    {isSk
                      ? '• <strong>Automatické prehrávanie časovej osi (Play 2s):</strong> Tlačidlo Play na časovej osi (alebo Shift+Y) automaticky rotuje všetky zábery v klastri po 2-sekundových intervaloch pre okamžitú kontrolu stability a kontinuity.'
                      : '• <strong>Timeline Auto-Play (2s):</strong> Play button on timeline (or Shift+Y) auto-rotates cluster captures at 2s intervals for fast alignment and continuity review.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Private Folders & Non-GPS */}
        {activeTab === 'folders' && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6">
              <div className="flex items-center gap-3">
                <FolderLock className="w-6 h-6 text-rose-400" />
                <h2 className="text-xl font-bold text-white">
                  {isSk ? 'Súkromné Archívy, Zložky a Panorámy bez GPS' : 'Private Folders & Non-GPS Protection'}
                </h2>
              </div>

              <div className="space-y-4 text-xs text-zinc-300 leading-relaxed">
                <p>
                  {isSk
                    ? 'Systém automaticky chráni vaše súkromie. Fotografie, ktoré nemajú v EXIF metadátach uložené GPS súradnice, sú automaticky nastavené ako súkromné (is_private: true) a usporiadané do virtuálnych zložiek podľa ich pôvodného priečinka na disku (napr. private/2025-08-15 - Sloup).'
                    : 'All panoramas lacking EXIF GPS coordinates are automatically classified as private (is_private: true) and organized into virtual folders derived from their original source path (e.g. private/2025-08-15 - Sloup).'}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-white font-bold">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>{isSk ? 'Viditeľnosť pre Verejnosť' : 'Public Visitor Visibility'}</span>
                    </div>
                    <p className="text-zinc-400">
                      {isSk
                        ? 'Bežný návštevník vidí iba verejné fotky s GPS bodmi na mape. Nemá prístup k súkromným zložkám ani fotografiám bez GPS.'
                        : 'Public visitors only see geotagged public photos. Private folders are strictly invisible without authentication.'}
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-white font-bold">
                      <Unlock className="w-4 h-4 text-rose-400" />
                      <span>{isSk ? 'Záložka "Private Folders"' : 'Private Folders Tab'}</span>
                    </div>
                    <p className="text-zinc-400">
                      {isSk
                        ? 'Po prihlásení cez autorizovaný účet Google sa v bočnom paneli odomkne záložka Private Folders. Môžete v nej prechádzať všetky zložky, hľadať a hromadne ich zverejňovať.'
                        : 'After signing in with the authorized Google account, the Private Folders tab appears in the sidebar. Browse all albums, search, and bulk publish as needed.'}
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-white font-bold">
                      <CheckSquare className="w-4 h-4 text-cyan-400" />
                      <span>{isSk ? 'Hromadný Výber Zložky & Smart GPS' : 'Folder Bulk Select & Smart GPS'}</span>
                    </div>
                    <p className="text-zinc-400">
                      {isSk
                        ? 'Kliknutím na "Vybrať zložku" označíte celú dávku. Následne tlačidlom Smart GPS môžete zamerať celú zložku (kopírovanie z rovnakého dátumu alebo vyhľadanie cez Nominatim).'
                        : 'Click "Select Folder" to highlight all items in that folder, then use Smart GPS to geotag the entire batch via same-date copy or Nominatim geocoding.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Local Run vs. Cloudflare */}
        {activeTab === 'cloudflare' && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6">
              <div className="flex items-center gap-3">
                <Cloud className="w-6 h-6 text-rose-400" />
                <h2 className="text-xl font-bold text-white">
                  {isSk ? 'Architektúra: Lokálny Beh, Cloudflare D1 & Bezpečnosť' : 'Architecture: Local Disk, Cloudflare D1 & Security'}
                </h2>
              </div>

              <div className="space-y-4 text-xs text-zinc-300 leading-relaxed">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Local Mode */}
                  <div className="p-5 rounded-2xl glass-panel border border-cyan-500/30 space-y-3">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                      <HardDrive className="w-4 h-4" />
                      <span>{isSk ? 'A. Lokálny Beh & Hybridný Tunnel' : 'A. Local Run & Hybrid Tunnel'}</span>
                    </div>
                    <p className="text-zinc-300">
                      {isSk
                        ? 'Pri lokálnom vývoji a úpravách beží aplikácia cez Vite a lokálne API endpointy. Lokálny server zároveň cez šifrovaný Cloudflare Tunnel (ag.trusik.link) poskytuje plné 8K, 11K a 15K textúry priamo z disku bez nutnosti ich okamžitého nahrávania na Cloudflare CDN.'
                        : 'During local development and editing, changes interact directly with local APIs. Furthermore, the local server streams master 8K/11K/15K textures over encrypted Cloudflare Tunnel (ag.trusik.link) on-demand.'}
                    </p>
                    <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-cyan-200">
                      {isSk
                        ? '✓ Automatický Canvas Downsampling: pre grafické karty s limitom 8192px Three.js adaptívne zmenší 11K/15K textúru bez pádu do 2K.'
                        : '✓ Automatic Canvas Downsampling: Three.js gracefully downsamples 11K/15K textures on client GPUs capped at 8192px.'}
                    </div>
                  </div>

                  {/* Cloudflare Mode */}
                  <div className="p-5 rounded-2xl glass-panel border border-rose-500/30 space-y-3">
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                      <Cloud className="w-4 h-4" />
                      <span>{isSk ? 'B. Cloudflare D1 & Bezpečnostný Hardening' : 'B. Cloudflare D1 & Security Hardening'}</span>
                    </div>
                    <p className="text-zinc-300">
                      {isSk
                        ? 'V produkcii beží databáza na serverless SQLite Cloudflare D1. Všetky úpravy, komentáre, videnia, hviezdičky a vlastné tagy sa ukladajú priamo v D1. Edge _middleware.js blokuje skenery zraniteľností a požiadavky bez User-Agenta.'
                        : 'In production, metadata resides in serverless SQLite Cloudflare D1. Edits, comments, views, favorites, and custom tags persist directly in D1. Edge _middleware.js blocks scanners and empty User-Agents.'}
                    </p>
                    <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/20 text-rose-200">
                      {isSk
                        ? '✓ Bezpečnostné hlavičky (_headers) s HSTS, CSP a RFC 9116 security.txt chránia doménu pred zneužitím.'
                        : '✓ Security headers (_headers) with HSTS, CSP and RFC 9116 security.txt safeguard the domain.'}
                    </div>
                  </div>
                </div>

                {/* Backup & Export Button Reminder */}
                <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <FileJson className="w-5 h-5 text-cyan-400 shrink-0" />
                    <div>
                      <span className="text-white font-bold block">{isSk ? 'Záloha a Export Databázy' : 'Database Export & Backup'}</span>
                      <span className="text-zinc-400 text-[11px]">
                        {isSk
                          ? 'V okne Admin Modal máte k dispozícii tlačidlo "Export / Download panoramas.json" pre okamžité stiahnutie aktuálnej databázy.'
                          : 'In the Admin Modal, click "Export / Download panoramas.json" anytime to download the unified database.'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAdminModal(true)}
                    className="px-3.5 py-2 rounded-xl glass-button text-xs font-bold text-cyan-300 hover:text-white shrink-0"
                  >
                    {isSk ? 'Otvoriť Admin Okno' : 'Open Admin Modal'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: PC Migration & Saving 33.5 GB */}
        {activeTab === 'migration' && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6">
              <div className="flex items-center gap-3">
                <HardDrive className="w-6 h-6 text-rose-400" />
                <h2 className="text-xl font-bold text-white">
                  {isSk ? 'Migrácia na Nový PC (Úspora 33.5 GB)' : 'PC Migration Guide (Save 33.5 GB)'}
                </h2>
              </div>

              {/* Crucial Warning Box */}
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-xs text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <span>{isSk ? 'KĽÚČOVÁ ÚSPORA PRI PRENOSE: Vynechajte zložku panoramas/' : 'CRITICAL TRANSFER SAVING: Omit panoramas/ folder'}</span>
                </div>
                <p className="leading-relaxed">
                  {isSk
                    ? 'Priečinok frontend/public/panoramas/ (33.5 GB) obsahuje iba staré neoptimalizované súbory. Prehliadač 360°, mapa aj tlačidlo na stiahnutie plnej panorámy používajú výhradne optimalizované 15K súbory z frontend/public/panoramas_web/ (<= 24.5 MB). Tento priečinok môžete pred kopírovaním vynechať alebo rovno zmazať!'
                    : 'The directory frontend/public/panoramas/ (33.5 GB) contains raw duplicates. The 360 viewer, map, and full downloads now load directly from frontend/public/panoramas_web/ (<= 24.5 MB). Skip or delete panoramas/ to cut transfer size in half!'}
                </p>
              </div>

              {/* Checklist Table */}
              <div className="space-y-3">
                <h3 className="font-bold text-white text-sm">
                  {isSk ? 'Kontrolný Zoznam pre Prenos (Čo Kopírovať):' : 'Transfer Checklist:'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5 text-emerald-200">
                    <span className="font-bold flex items-center gap-1.5 text-emerald-300">
                      <CheckCircle2 className="w-4 h-4" />
                      {isSk ? 'SKOPÍROVAŤ (Potrebné)' : 'COPY (Required)'}
                    </span>
                    <ul className="space-y-1 text-[11px] list-disc list-inside text-emerald-100/80">
                      <li><code>frontend/public/panoramas_web/</code> (~33.1 GB, 15K fotky)</li>
                      <li><code>frontend/public/thumbnails/</code> (~54 MB, náhľady)</li>
                      <li><code>frontend/public/panoramas.json</code> (~1.6 MB, databáza)</li>
                      <li><code>frontend/src/</code>, <code>package.json</code>, <code>vite.config.ts</code></li>
                      <li><code>backend/</code>, <code>start.bat</code>, <code>Start_GUI.bat</code></li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1.5 text-rose-200">
                    <span className="font-bold flex items-center gap-1.5 text-rose-300">
                      <AlertTriangle className="w-4 h-4" />
                      {isSk ? 'NEKOPÍROVAŤ (Vynechať)' : 'DO NOT COPY (Skip)'}
                    </span>
                    <ul className="space-y-1 text-[11px] list-disc list-inside text-rose-100/80">
                      <li><code>frontend/public/panoramas/</code> (Ušetríte 33.5 GB!)</li>
                      <li><code>frontend/node_modules/</code> (Stiahne sa cez npm install)</li>
                      <li><code>frontend/dist/</code> (Dočasné zostavenie)</li>
                      <li><code>scratch_*</code> (Testovacie dočasné súbory)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Launch on New PC */}
              <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>{isSk ? 'Spustenie na Novom PC (1 Kliknutím)' : 'Running on the New PC (1 Click)'}</span>
                </h3>
                <ol className="text-xs text-zinc-300 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>{isSk ? 'Nainštalujte Node.js (LTS z nodejs.org) a Python 3.10+ (so zaškrtnutým "Add Python to PATH").' : 'Install Node.js LTS and Python 3.10+ (with "Add Python to PATH").'}</li>
                  <li>
                    {isSk
                      ? 'Dvakrát kliknite na start.bat. Skript automaticky stiahne balíčky (npm install), spustí webový server a sám otvorí prehliadač na http://localhost:5173.'
                      : 'Double click start.bat. The script will automatically install npm packages, start the Vite dev server, and open http://localhost:5173.'}
                  </li>
                  <li>
                    {isSk
                      ? 'Všetko funguje okamžite – nie je potrebné nič znovu skenovať ani generovať!'
                      : 'Everything runs immediately – no rescan or reprocessing required!'}
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Processing Pipeline */}
        {activeTab === 'pipeline' && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6">
              <div className="flex items-center gap-3">
                <Cpu className="w-6 h-6 text-rose-400" />
                <h2 className="text-xl font-bold text-white">
                  {isSk ? 'Spracovanie Nových Fotografií (Pipeline)' : 'Processing New Panoramas (Pipeline)'}
                </h2>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                {isSk
                  ? 'Ak v budúcnosti nafotíte nové 360° panorámy, môžete ich pridať jedným kliknutím cez administrátorskú Python konzolu:'
                  : 'Whenever you have new spherical photos to add, process them with 1 click using the Python admin console:'}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-xs">
                    Krok 1
                  </div>
                  <h4 className="font-bold text-white text-xs">Scan & Repack (Max 15K, &le;24.5MB)</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {isSk
                      ? 'Nájde 2:1 panorámy, extrahuje GPS a dátum, odstráni duplikáty (ponechá najvyššie rozlíšenie), zmenší nad 15K a zbalí pod 24.5 MB.'
                      : 'Finds 2:1 photos, extracts GPS/date, deduplicates, clamps resolution to 15K max, and repacks under Cloudflare 24.5 MB limit.'}
                  </p>
                </div>

                <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                    Krok 2
                  </div>
                  <h4 className="font-bold text-white text-xs">Auto-Categorize (Outdoor/Indoor)</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {isSk
                      ? 'Analyzuje oblohu v horných 15 % fotky a automaticky priradí odznak ☀️ Exteriér alebo 🏠 Interiér.'
                      : 'Analyzes sky atmosphere in top 15% to categorize as Outdoor (☀️) or Indoor (🏠).'}
                  </p>
                </div>

                <div className="p-5 rounded-2xl glass-panel border border-white/10 space-y-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs">
                    Krok 3
                  </div>
                  <h4 className="font-bold text-white text-xs">Sky Infill (Fix Black Zenith)</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {isSk
                      ? 'Deteguje chýbajúci alebo čierny vrch (zenit) a plynule domieša prirodzenú oblohu bez ostrých prechodov.'
                      : 'Detects missing or black zenith tops and blends natural blue sky gradients seamlessly.'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Terminal className="w-5 h-5 text-rose-400 shrink-0" />
                  <div className="text-xs text-zinc-300">
                    <span className="font-bold text-white block">Start_GUI.bat</span>
                    <span>{isSk ? 'Spustí grafickú konzolu pre kompletný pipeline' : 'Launches Tkinter pipeline dashboard'}</span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-zinc-400">
                  python backend/gui_launcher.py
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Google Earth KML Live Feed */}
        {activeTab === 'googleearth' && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-panel p-6 md:p-8 rounded-3xl border border-amber-500/30 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Globe2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">
                    {isSk ? 'Google Earth Živé KML Prepojenie (Network Link)' : 'Google Earth Live KML Network Link Feed'}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {isSk
                      ? 'Automatická synchronizácia všetkých verejných 360° panorám do Google Earth'
                      : 'Automatic synchronization of all public 360° panoramas into Google Earth'}
                  </p>
                </div>
              </div>

              <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
                {isSk
                  ? 'Server poskytuje dynamický KML kanál na adrese https://panorama.trusik.link/api/panoramas/kml. Všetky verejné panorámy (aktuálne 390+) s platnými GPS súradnicami sa exportujú ako body s ikonou fotoaparátu. Každý pin obsahuje dátum a čas, názov lokality, optimalizovanú miniatúru z R2 CDN a priamy klikateľný odkaz na otvorenie v 360° WebGL prehliadači.'
                  : 'The server provides a dynamic KML feed at https://panorama.trusik.link/api/panoramas/kml. All public panoramas with GPS coordinates are exported with date, locality, R2 thumbnail, and a direct clickable link to open in the 360° viewer.'}
              </p>

              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-2">
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                  {isSk ? 'URL adresa feedu pre Google Earth:' : 'Feed URL for Google Earth:'}
                </span>
                <code className="block p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-amber-200 select-all">
                  https://panorama.trusik.link/api/panoramas/kml
                </code>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px]">A</span>
                    <span>{isSk ? 'Google Earth pre Web (earth.google.com)' : 'Google Earth for Web'}</span>
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {isSk
                      ? 'Webová verzia neumožňuje zadať priamu URL cez menu (obmedzenie prehliadača). Postup je: stiahnuť súbor KML a v Google Earth Web zvoliť Súbor > Otvoriť lokálny súbor KML (alebo skratka Ctrl+I) prípadne Importovať súbor.'
                      : 'Web version does not support direct URL link adding due to browser restrictions. Download the KML file first, then in Google Earth Web select File > Open local KML file (Ctrl+I) or Import file.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px]">B</span>
                    <span>{isSk ? 'Google Earth Pro (Desktop PC/Mac)' : 'Google Earth Pro Desktop'}</span>
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {isSk
                      ? 'Nainštalovaná desktopová verzia Google Earth Pro plne podporuje živé URL: cez menu Pridať > Odkaz na sieť (Network Link) vložíte URL a nastavíte hodinové obnovovanie.'
                      : 'Installed desktop Google Earth Pro supports live URL feeds: via Add > Network Link paste the feed URL and set 1-hour periodic refresh.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 7: System Architecture & Technical Specification */}
        {activeTab === 'techspec' && (
          <div className="animate-fade-in -mx-4 md:-mx-6">
            <AdminTechSpec />
          </div>
        )}
      </div>
    </div>
  );
};
