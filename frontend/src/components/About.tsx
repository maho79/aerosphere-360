import React from 'react';
import { useTranslation } from 'react-i18next';
import { Compass, Globe, Camera, Sparkles, Film, Keyboard } from 'lucide-react';

export const About: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isSk = i18n.language.startsWith('sk');

  return (
    <div className="h-full overflow-y-auto p-6 md:p-12 max-w-4xl mx-auto custom-scrollbar">
      <div className="glass-panel-elevated p-8 rounded-3xl border border-white/10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
            <Compass className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-wide">{t('about')}</h1>
            <p className="text-xs text-zinc-400">Glass Noir Panorama Explorer</p>
          </div>
        </div>

        <p className="text-base text-zinc-300 leading-relaxed">
          {t('about_text')}
        </p>

        {/* Pro Tips Banner for Public Visitors */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-cyan-500/10 to-purple-500/15 border border-amber-500/35 space-y-3 shadow-xl">
          <div className="flex items-center gap-2.5 text-amber-300 font-extrabold text-sm uppercase font-mono tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{isSk ? '⭐ Pro Tipy pre Návštevníkov' : '⭐ Visitor Pro Tips'}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-zinc-300">
            <div className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <Film className="w-3.5 h-3.5 text-amber-400" />
                <span>{isSk ? 'Režim Filmu (Kláves M)' : 'Movie Mode (Key M)'}</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {isSk
                  ? 'Celoobrazovková 360° prehliadka, ktorá sama otáča panorámy a plynulo prechádza po filmovom páse.'
                  : 'Automated hands-free tour that pans 360° and seamlessly advances across nearby panoramas.'}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isSk ? 'Čistá 4K Fotka (Kláves C)' : '4K Snapshot (Key C)'}</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {isSk
                  ? 'Okamžité stiahnutie čistého 4K obrázka aktuálneho záberu bez rušivých prvkov s GPS podpisom.'
                  : 'Instant 4K photo export of your exact view without UI overlays, perfect for wallpapers.'}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isSk ? 'Herný HUD (Kláves H)' : 'Gaming HUD (Key H)'}</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {isSk
                  ? 'Stlačte H pre hernú mapu klávesov: WASD pohyb, 1-2-3 projekcie a 0 pre 1:1 natívny pixel zoom.'
                  : 'Press H for full mechanical keyboard map: WASD flight, 1-2-3 projections, and 0 for 1:1 zoom.'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-5 rounded-2xl glass-panel space-y-2 border border-white/10">
            <Globe className="w-6 h-6 text-cyan-400" />
            <h3 className="font-bold text-white text-sm">Interactive World Mapping</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Explore geotagged 360° spherical panoramas from around the world. Filter by year, search by city, and inspect locations directly in Google Maps.
            </p>
          </div>

          <div className="p-5 rounded-2xl glass-panel space-y-2 border border-white/10">
            <Camera className="w-6 h-6 text-cyan-400" />
            <h3 className="font-bold text-white text-sm">Immersive 360° Viewing</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Drag, zoom, and activate slow auto-panning in full-screen. Browse nearby panoramas with calculated GPS distances in real-time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
