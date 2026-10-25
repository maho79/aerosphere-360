import React from 'react';
import {
  X,
  Keyboard,
  Camera,
  Globe2,
  Eye,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Film,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import i18n from '../i18n';

interface KeyboardControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface KeyboardControlsContentProps {
  isSk?: boolean;
}

export const KeyboardControlsContent: React.FC<KeyboardControlsContentProps> = ({
  isSk = i18n.language.startsWith('sk'),
}) => {
  return (
    <div className="space-y-6">
      {/* Visual Game Keyboard Representation */}
      <div className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-white/10 shadow-inner relative overflow-hidden">
        <div className="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-500 mb-3 flex items-center justify-between">
          <span>KEYBOARD LAYOUT & CALLOUTS</span>
          <span className="text-cyan-400/80">Active Keys Highlighted</span>
        </div>

          {/* Row 1: Esc, 1, 2, 3, 0, -, + */}
          <div className="flex flex-wrap items-end gap-2 sm:gap-3 mb-3 font-mono text-xs">
            {/* ESC */}
            <div className="flex flex-col items-center gap-1 min-w-[3.5rem]">
              <div className="px-2 py-0.5 rounded-md bg-rose-500 text-zinc-950 text-[9px] font-black uppercase whitespace-nowrap shadow-md tracking-wider">
                {isSk ? 'Zavrieť' : 'Close'}
              </div>
              <div className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-rose-950/80 border-2 border-rose-500/80 text-rose-300 font-bold shadow-lg shadow-rose-950/60 ring-1 ring-rose-400/50">
                ESC
              </div>
            </div>

            <div className="h-10 w-px bg-white/10 mx-0.5 hidden sm:block" />

            {/* 1, 2, 3 (Projections Group) */}
            <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="flex flex-col items-center gap-1 min-w-[3.25rem]">
                <div className="px-2 py-0.5 rounded-md bg-emerald-400 text-zinc-950 text-[9px] font-black uppercase whitespace-nowrap shadow-md tracking-wider">
                  {isSk ? 'Štandard' : 'Standard'}
                </div>
                <div className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-emerald-950/90 border-2 border-emerald-400 text-emerald-300 font-extrabold shadow-lg shadow-emerald-950/60 ring-2 ring-emerald-500/40">
                  1
                </div>
              </div>

              <div className="flex flex-col items-center gap-1 min-w-[3.25rem]">
                <div className="px-2 py-0.5 rounded-md bg-emerald-400 text-zinc-950 text-[9px] font-black uppercase whitespace-nowrap shadow-md tracking-wider">
                  {isSk ? 'Zaoblené' : 'Curved'}
                </div>
                <div className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-emerald-950/90 border-2 border-emerald-400 text-emerald-300 font-extrabold shadow-lg shadow-emerald-950/60 ring-2 ring-emerald-500/40">
                  2
                </div>
              </div>

              <div className="flex flex-col items-center gap-1 min-w-[3.25rem]">
                <div className="px-2 py-0.5 rounded-md bg-emerald-400 text-zinc-950 text-[9px] font-black uppercase whitespace-nowrap shadow-md tracking-wider">
                  {isSk ? 'Planéta' : 'Planet'}
                </div>
                <div className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-emerald-950/90 border-2 border-emerald-400 text-emerald-300 font-extrabold shadow-lg shadow-emerald-950/60 ring-2 ring-emerald-500/40">
                  3
                </div>
              </div>
            </div>

            {/* Inactive number fillers */}
            <div className="hidden lg:flex items-center gap-1 text-zinc-600 pb-1">
              <div className="px-2 py-1.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-[11px]">4</div>
              <div className="px-2 py-1.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-[11px]">5</div>
              <div className="px-2 py-1.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-[11px]">6</div>
              <div className="px-2 py-1.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-[11px]">7</div>
              <div className="px-2 py-1.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-[11px]">8</div>
              <div className="px-2 py-1.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-[11px]">9</div>
            </div>

            {/* 0 (1:1 Zoom) */}
            <div className="flex flex-col items-center gap-1 min-w-[4rem]">
              <div className="px-2 py-0.5 rounded-md bg-purple-400 text-zinc-950 text-[9px] font-black uppercase whitespace-nowrap shadow-md tracking-wider">
                1:1 Pixel
              </div>
              <div className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-purple-950/90 border-2 border-purple-400 text-purple-300 font-extrabold shadow-lg shadow-purple-950/60 ring-2 ring-purple-500/40">
                0
              </div>
            </div>

            {/* - / + Zoom */}
            <div className="flex flex-col items-center gap-1 min-w-[3.75rem]">
              <div className="px-2 py-0.5 rounded-md bg-cyan-400 text-zinc-950 text-[9px] font-black uppercase whitespace-nowrap shadow-md tracking-wider">
                {isSk ? 'Širší záber' : 'Wider'}
              </div>
              <div className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-cyan-950/90 border-2 border-cyan-400 text-cyan-300 font-extrabold shadow-lg shadow-cyan-950/60 ring-2 ring-cyan-500/40">
                -
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 min-w-[3.75rem]">
              <div className="px-2 py-0.5 rounded-md bg-cyan-400 text-zinc-950 text-[9px] font-black uppercase whitespace-nowrap shadow-md tracking-wider">
                {isSk ? 'Priblížiť' : 'Zoom In'}
              </div>
              <div className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-cyan-950/90 border-2 border-cyan-400 text-cyan-300 font-extrabold shadow-lg shadow-cyan-950/60 ring-2 ring-cyan-500/40">
                +
              </div>
            </div>
          </div>

          {/* Row 2: WASD, Arrows, C, /, PgUp/PgDn */}
          <div className="flex flex-wrap items-end gap-2.5 sm:gap-4 my-3 font-mono text-xs">
            {/* WASD cluster */}
            <div className="flex flex-col items-center gap-1.5 bg-cyan-500/10 p-2 rounded-2xl border border-cyan-500/30">
              <span className="text-[9px] text-cyan-300 font-black uppercase tracking-wider px-1">
                {isSk ? 'WASD • Rozhliadanie' : 'WASD • Look Around'}
              </span>
              <div className="flex flex-col items-center gap-1">
                <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-cyan-500/30 border border-cyan-400 text-cyan-200 font-black shadow-md">
                  W
                </div>
                <div className="flex gap-1">
                  <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-cyan-500/30 border border-cyan-400 text-cyan-200 font-black shadow-md">
                    A
                  </div>
                  <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-cyan-500/30 border border-cyan-400 text-cyan-200 font-black shadow-md">
                    S
                  </div>
                  <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-cyan-500/30 border border-cyan-400 text-cyan-200 font-black shadow-md">
                    D
                  </div>
                </div>
              </div>
            </div>

            {/* Arrows cluster */}
            <div className="flex flex-col items-center gap-1.5 bg-cyan-500/10 p-2 rounded-2xl border border-cyan-500/30">
              <span className="text-[9px] text-cyan-300 font-black uppercase tracking-wider px-1">
                {isSk ? 'Smerové šípky' : 'Arrow Keys'}
              </span>
              <div className="flex flex-col items-center gap-1">
                <div className="p-1 sm:p-1.5 rounded-lg bg-cyan-500/30 border border-cyan-400 text-cyan-200 font-black shadow-md">
                  <ArrowUp className="w-3.5 h-3.5" />
                </div>
                <div className="flex gap-1">
                  <div className="p-1 sm:p-1.5 rounded-lg bg-cyan-500/30 border border-cyan-400 text-cyan-200 font-black shadow-md">
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </div>
                  <div className="p-1 sm:p-1.5 rounded-lg bg-cyan-500/30 border border-cyan-400 text-cyan-200 font-black shadow-md">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </div>
                  <div className="p-1 sm:p-1.5 rounded-lg bg-cyan-500/30 border border-cyan-400 text-cyan-200 font-black shadow-md">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* C (Camera Export) */}
            <div className="flex flex-col items-center gap-1 min-w-[3.75rem]">
              <div className="px-2 py-0.5 rounded-md bg-amber-400 text-zinc-950 text-[9px] font-black uppercase whitespace-nowrap shadow-md tracking-wider">
                4K Foto
              </div>
              <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-amber-950/90 border-2 border-amber-400 text-amber-300 font-extrabold shadow-lg shadow-amber-950/60 ring-2 ring-amber-500/40">
                C
              </div>
            </div>

            {/* / (Clean View) */}
            <div className="flex flex-col items-center gap-1 min-w-[4rem]">
              <div className="px-2 py-0.5 rounded-md bg-fuchsia-400 text-zinc-950 text-[9px] font-black uppercase whitespace-nowrap shadow-md tracking-wider">
                Zen (Bez UI)
              </div>
              <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-fuchsia-950/90 border-2 border-fuchsia-400 text-fuchsia-300 font-extrabold shadow-lg shadow-fuchsia-950/60 ring-2 ring-fuchsia-500/40">
                /
              </div>
            </div>

            {/* PgUp / PgDn (Strip Navigation) */}
            <div className="flex flex-col items-center gap-1">
              <div className="px-2 py-0.5 rounded-md bg-blue-400 text-zinc-950 text-[9px] font-black uppercase whitespace-nowrap shadow-md tracking-wider">
                {isSk ? 'Filmový pás' : 'Filmstrip'}
              </div>
              <div className="flex gap-1">
                <div className="px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl bg-blue-950/90 border-2 border-blue-400 text-blue-300 font-extrabold shadow-lg shadow-blue-950/60 ring-2 ring-blue-500/40 text-[11px]">
                  PgUp
                </div>
                <div className="px-2.5 py-2 sm:px-3 sm:py-2.5 rounded-xl bg-blue-950/90 border-2 border-blue-400 text-blue-300 font-extrabold shadow-lg shadow-blue-950/60 ring-2 ring-blue-500/40 text-[11px]">
                  PgDn
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Modes, Audio & Extended Tools */}
          <div className="flex flex-wrap items-end gap-2.5 sm:gap-4 pt-3 border-t border-white/10 font-mono text-xs">
            {/* P (Auto-Panning Cycle: Right / Stop / Left) */}
            <div className="flex flex-col items-center gap-1 min-w-[5rem]">
              <div className="px-2 py-0.5 rounded-md bg-emerald-400 text-zinc-950 text-[9px] font-black uppercase whitespace-nowrap shadow-md tracking-wider">
                {isSk ? 'Otáčanie (R/Stop/L)' : 'Pan (R/Stop/L)'}
              </div>
              <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-emerald-950/90 border-2 border-emerald-400 text-emerald-300 font-extrabold shadow-lg shadow-emerald-950/60 ring-2 ring-emerald-500/40">
                P
              </div>
            </div>

            {/* M (Movie Mode / Kino) */}
            <div className="flex flex-col items-center gap-1 min-w-[5rem]">
              <div className="px-2 py-0.5 rounded-md bg-amber-400 text-zinc-950 text-[9px] font-black uppercase whitespace-nowrap shadow-md tracking-wider">
                {isSk ? 'Režim filmu (Kino)' : 'Movie Mode'}
              </div>
              <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-amber-950/90 border-2 border-amber-400 text-amber-300 font-extrabold shadow-lg shadow-amber-950/60 ring-2 ring-amber-500/40">
                M
              </div>
            </div>

            {/* O (Spatial Audio [EXP]) */}
            <div className="flex flex-col items-center gap-1 min-w-[4.5rem]">
              <div className="px-2 py-0.5 rounded-md bg-cyan-400 text-zinc-950 text-[9px] font-black uppercase whitespace-nowrap shadow-md tracking-wider">
                3D Audio [EXP]
              </div>
              <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-cyan-950/90 border-2 border-cyan-400 text-cyan-300 font-extrabold shadow-lg shadow-cyan-950/60 ring-2 ring-cyan-500/40">
                O
              </div>
            </div>

            {/* K (Solar Compass [EXP]) */}
            <div className="flex flex-col items-center gap-1 min-w-[4.5rem]">
              <div className="px-2 py-0.5 rounded-md bg-amber-400 text-zinc-950 text-[9px] font-black uppercase whitespace-nowrap shadow-md tracking-wider">
                Kompas [EXP]
              </div>
              <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-amber-950/90 border-2 border-amber-400 text-amber-300 font-extrabold shadow-lg shadow-amber-950/60 ring-2 ring-amber-500/40">
                K
              </div>
            </div>

            {/* T (Admin Tagging) */}
            <div className="flex flex-col items-center gap-1 min-w-[5rem]">
              <div className="px-2 py-0.5 rounded-md bg-cyan-400 text-zinc-950 text-[9px] font-black uppercase whitespace-nowrap shadow-md tracking-wider">
                {isSk ? 'Tagy (Admin)' : 'Admin Tagging'}
              </div>
              <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-cyan-950/90 border-2 border-cyan-400 text-cyan-300 font-extrabold shadow-lg shadow-cyan-950/60 ring-2 ring-cyan-500/40">
                T
              </div>
            </div>

            {/* H (Help) */}
            <div className="flex flex-col items-center gap-1 min-w-[4rem]">
              <div className="px-2 py-0.5 rounded-md bg-yellow-400 text-zinc-950 text-[9px] font-black uppercase whitespace-nowrap shadow-md tracking-wider">
                {isSk ? 'Nápoveda' : 'Help'}
              </div>
              <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-yellow-950/90 border-2 border-yellow-400 text-yellow-300 font-extrabold shadow-lg shadow-yellow-950/60 ring-2 ring-yellow-500/40">
                H
              </div>
            </div>
          </div>

          {/* Row 4: F, I, E, L, R, G, B, X, Y, U (Exploration & Navigation) */}
          <div className="flex flex-wrap items-end gap-2 sm:gap-3 pt-3 border-t border-white/10 font-mono text-xs">
            {/* F (Fullscreen) */}
            <div className="flex flex-col items-center gap-1 min-w-[3.5rem]">
              <div className="px-2 py-0.5 rounded-md bg-blue-400 text-zinc-950 text-[9px] font-black uppercase whitespace-nowrap shadow-md tracking-wider">
                Fullscreen
              </div>
              <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-blue-950/90 border-2 border-blue-400 text-blue-300 font-extrabold shadow-lg shadow-blue-950/60 ring-2 ring-blue-500/40">
                F
              </div>
            </div>

            {/* I (Info) */}
            <div className="flex flex-col items-center gap-1 min-w-[3.25rem]">
              <div className="px-2 py-0.5 rounded-md bg-amber-400 text-zinc-950 text-[9px] font-black uppercase whitespace-nowrap shadow-md tracking-wider">
                Info
              </div>
              <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-amber-950/90 border-2 border-amber-400 text-amber-300 font-extrabold shadow-lg shadow-amber-950/60 ring-2 ring-amber-500/40">
                I
              </div>
            </div>

            {/* E (Explorer) */}
            <div className="flex flex-col items-center gap-1 min-w-[3.5rem]">
              <div className="px-2 py-0.5 rounded-md bg-cyan-400 text-zinc-950 text-[9px] font-black uppercase whitespace-nowrap shadow-md tracking-wider">
                Explorer
              </div>
              <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-cyan-950/90 border-2 border-cyan-400 text-cyan-300 font-extrabold shadow-lg shadow-cyan-950/60 ring-2 ring-cyan-500/40">
                E
              </div>
            </div>

            {/* L (Map Location) */}
            <div className="flex flex-col items-center gap-1 min-w-[3.25rem]">
              <div className="px-2 py-0.5 rounded-md bg-emerald-400 text-zinc-950 text-[9px] font-black uppercase whitespace-nowrap shadow-md tracking-wider">
                {isSk ? 'Mapa' : 'Map'}
              </div>
              <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-emerald-950/90 border-2 border-emerald-400 text-emerald-300 font-extrabold shadow-lg shadow-emerald-950/60 ring-2 ring-emerald-500/40">
                L
              </div>
            </div>

            {/* R (Reset Camera) */}
            <div className="flex flex-col items-center gap-1 min-w-[3.5rem]">
              <div className="px-2 py-0.5 rounded-md bg-zinc-400 text-zinc-950 text-[9px] font-black uppercase whitespace-nowrap shadow-md tracking-wider">
                Reset
              </div>
              <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-zinc-900 border-2 border-zinc-400 text-zinc-200 font-extrabold shadow-lg">
                R
              </div>
            </div>

            {/* G (Gyroscope) */}
            <div className="flex flex-col items-center gap-1 min-w-[3.75rem]">
              <div className="px-2 py-0.5 rounded-md bg-violet-400 text-zinc-950 text-[9px] font-black uppercase whitespace-nowrap shadow-md tracking-wider">
                Gyroskop
              </div>
              <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-violet-950/90 border-2 border-violet-400 text-violet-300 font-extrabold shadow-lg ring-2 ring-violet-500/40">
                G
              </div>
            </div>

            {/* B (Peak Finder) */}
            <div className="flex flex-col items-center gap-1 min-w-[3.75rem]">
              <div className="px-2 py-0.5 rounded-md bg-sky-400 text-zinc-950 text-[9px] font-black uppercase whitespace-nowrap shadow-md tracking-wider">
                Vrcholy
              </div>
              <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-sky-950/90 border-2 border-sky-400 text-sky-300 font-extrabold shadow-lg ring-2 ring-sky-500/40">
                B
              </div>
            </div>

            {/* X (Walkthrough) */}
            <div className="flex flex-col items-center gap-1 min-w-[3.75rem]">
              <div className="px-2 py-0.5 rounded-md bg-teal-400 text-zinc-950 text-[9px] font-black uppercase whitespace-nowrap shadow-md tracking-wider">
                3D Chôdza
              </div>
              <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-teal-950/90 border-2 border-teal-400 text-teal-300 font-extrabold shadow-lg ring-2 ring-teal-500/40">
                X
              </div>
            </div>

            {/* Y (Time Travel) */}
            <div className="flex flex-col items-center gap-1 min-w-[3.75rem]">
              <div className="px-2 py-0.5 rounded-md bg-amber-400 text-zinc-950 text-[9px] font-black uppercase whitespace-nowrap shadow-md tracking-wider">
                Časová os
              </div>
              <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-amber-950/90 border-2 border-amber-400 text-amber-300 font-extrabold shadow-lg ring-2 ring-amber-500/40">
                Y
              </div>
            </div>

            {/* U (Share) */}
            <div className="flex flex-col items-center gap-1 min-w-[3.5rem]">
              <div className="px-2 py-0.5 rounded-md bg-cyan-400 text-zinc-950 text-[9px] font-black uppercase whitespace-nowrap shadow-md tracking-wider">
                Zdieľať
              </div>
              <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-cyan-950/90 border-2 border-cyan-400 text-cyan-300 font-extrabold shadow-lg ring-2 ring-cyan-500/40">
                U
              </div>
            </div>
          </div>
        </div>

        {/* Pro Tips Section: Najnovšie Odporúčané Funkcie */}
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-cyan-500/10 to-purple-500/15 border border-amber-500/35 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-xl bg-amber-400 text-zinc-950 font-black flex items-center justify-center shadow-md shadow-amber-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-amber-400 block">
                {isSk ? 'ODPORÚČANIE PRE FAJNŠMEKROV' : 'RECOMMENDED FOR POWER USERS'}
              </span>
              <h3 className="text-sm sm:text-base font-extrabold text-white tracking-wide">
                {isSk ? '⭐ PRO TIPY: NAJNOVŠIE KĽÚČOVÉ FUNKCIE' : '⭐ PRO TIPS: LATEST KEY FEATURES'}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Pro Tip 1: Movie Mode */}
            <div className="p-3 rounded-xl bg-black/60 border border-amber-500/30 hover:border-amber-400/60 transition-colors">
              <div className="flex items-center gap-2 mb-1.5 text-amber-300 font-bold">
                <Film className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{isSk ? 'Režim Filmu (Kláves M)' : 'Movie Mode (Key M)'}</span>
              </div>
              <p className="text-zinc-300 text-[11px] leading-relaxed">
                {isSk
                  ? 'Sadnite si a stlačte M: celoobrazovková 360° prehliadka automaticky pretočí každú panorámu o 360° a plynulo prejde na ďalšiu vo filmovom páse bez dotyku myši.'
                  : 'Press M for a hands-free cinema tour: full 360° rotation on each panorama with seamless auto-advance across all 30 strip items.'}
              </p>
            </div>

            {/* Pro Tip 2: 4K Pure Photo Export */}
            <div className="p-3 rounded-xl bg-black/60 border border-emerald-500/30 hover:border-emerald-400/60 transition-colors">
              <div className="flex items-center gap-2 mb-1.5 text-emerald-300 font-bold">
                <Camera className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{isSk ? 'Čistá 4K Fotka (Kláves C)' : '4K Pure Capture (Key C)'}</span>
              </div>
              <p className="text-zinc-300 text-[11px] leading-relaxed">
                {isSk
                  ? 'Stlačte C alebo kliknite na fotoaparát pre okamžité stiahnutie čistého 4K záberu aktuálneho pohľadu bez ovládacích prvkov s decentnou vodotlačou.'
                  : 'Press C or click camera icon to instantly capture a pristine 4K image of your exact viewpoint without any UI overlays.'}
              </p>
            </div>

            {/* Pro Tip 3: Keyboard Power Combos */}
            <div className="p-3 rounded-xl bg-black/60 border border-cyan-500/30 hover:border-cyan-400/60 transition-colors">
              <div className="flex items-center gap-2 mb-1.5 text-cyan-300 font-bold">
                <Keyboard className="w-4 h-4 shrink-0 text-cyan-400" />
                <span>{isSk ? 'Kombinácie 1-2-3, 0, P, /' : 'Combos 1-2-3, 0, P, /'}</span>
              </div>
              <p className="text-zinc-300 text-[11px] leading-relaxed">
                {isSk
                  ? 'Číslami 1/2/3 bleskovo meníte projekcie (štandard / zaoblené / planétka), 0 vyvolá 1:1 pixel zoom, P spustí/otočí auto-pan a / zapne čistý režim.'
                  : 'Toggle projections with 1/2/3, jump to 1:1 native pixel zoom with 0, cycle auto-pan with P, and hide UI with /.'}
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Action Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs mb-4">
          {/* Card: WASD / Arrows */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-500/40">
                WASD / Šípky
              </span>
              <span className="font-bold text-white">{isSk ? 'Rozhliadanie' : 'Look Around'}</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {isSk
                ? 'Plynulé otáčanie kamery do všetkých 4 smerov (hore, dole, vľavo, vpravo).'
                : 'Smooth pan and tilt in 4 directions around the panoramic scene.'}
            </p>
          </div>

          {/* Card: T (Admin Tagging) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-500/40">
                T
              </span>
              <span className="font-bold text-white">{isSk ? 'Admin Tagovanie' : 'Admin Tagging'}</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {isSk
                ? 'Rýchly editor hashtagov pre aktuálnu panorámu alebo celú označenú skupinu panorám s priamym ukladaním do Cloudflare D1.'
                : 'Quick hashtag editor for the current panorama or multi-selected group with direct Cloudflare D1 persistence.'}
            </p>
          </div>

          {/* Card: Shift + C (Admin Calibration) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/40">
                Shift + C
              </span>
              <span className="font-bold text-white">{isSk ? 'Admin Kalibrácia Clustra' : 'Admin Cluster Calibration'}</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {isSk
                ? 'Vizuálne zrovnanie severného azimutu dvoch snímok v reálnom čase pomocou 50% priesvitného WebGL prekryvu, ladenia ±0.1°/1°/5° a A/B blikania.'
                : 'Real-time azimuth calibration between two cluster captures using 50% overlay blend, ±0.1°/1°/5° nudge, and A/B flipping.'}
            </p>
          </div>

          {/* Card: 0 (1:1 Zoom) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 font-mono font-bold border border-purple-500/40">
                0
              </span>
              <span className="font-bold text-white">{isSk ? '1:1 Natívny Pixel' : '1:1 Pixel Zoom'}</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {isSk
                ? '1 pixel v plnej panoráme = presne 1 pixel na obrazovke v strede horizontu (100% detail).'
                : '1 pixel in full-res panorama maps to exactly 1 pixel on your screen (100% pixel detail).'}
            </p>
          </div>

          {/* Card: - / + (Wider / Closer) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-500/40">
                - / +
              </span>
              <span className="font-bold text-white">{isSk ? 'Širší záber / Zoom' : 'Wider / Zoom'}</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {isSk
                ? 'Kláves "-" rozšíri zorný uhol na ultra-široký záber. Kláves "+" priblíži scénu.'
                : 'Key "-" zooms out to wider FOV angle. Key "+" zooms closer into details.'}
            </p>
          </div>

          {/* Card: 1, 2, 3 (Projections) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/40">
                1 / 2 / 3
              </span>
              <span className="font-bold text-white">{isSk ? 'Režimy projekcie' : 'Projections'}</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {isSk
                ? '1 = Štandard (Rectilinear), 2 = Zaoblené (Stereographic), 3 = Little Planet.'
                : '1 = Standard view, 2 = Curved stereographic, 3 = Little Planet.'}
            </p>
          </div>

          {/* Card: / (Clean View) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-fuchsia-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-fuchsia-500/20 text-fuchsia-300 font-mono font-bold border border-fuchsia-500/40">
                /
              </span>
              <span className="font-bold text-white">{isSk ? 'Čistý Zen režim' : 'Clean View'}</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {isSk
                ? 'Skryje všetky ovládacie prvky a nechá iba čistú panorámu. Opätovným stlačením "/" sa vrátite späť.'
                : 'Completely hides all UI controls for pure immersion. Press "/" again to exit.'}
            </p>
          </div>

          {/* Card: C (Photo Export) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/40">
                C
              </span>
              <span className="font-bold text-white">{isSk ? '4K Export fotky' : 'Capture 4K'}</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {isSk
                ? 'Okamžite vyexportuje a stiahne čistú snímku aktuálneho pohľadu v ultra-vysokom 4K rozlíšení.'
                : 'Instantly captures and downloads a pure snapshot in 4K resolution.'}
            </p>
          </div>

          {/* Card: PgUp / PgDn */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 font-mono font-bold border border-blue-500/40">
                PgUp / PgDn
              </span>
              <span className="font-bold text-white">{isSk ? 'Filmový pás' : 'Filmstrip Next/Prev'}</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {isSk
                ? 'Prepína na predchádzajúcu (PgUp) alebo nasledujúcu (PgDn) panorámu na páse.'
                : 'Switches to the previous (PgUp) or next (PgDn) panorama on the filmstrip.'}
            </p>
          </div>

          {/* Card: H */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-yellow-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-yellow-500/20 text-yellow-300 font-mono font-bold border border-yellow-500/40">
                H
              </span>
              <span className="font-bold text-white">{isSk ? 'Tento prehľad' : 'Help Guide'}</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {isSk
                ? 'Kedykoľvek otvorí alebo zatvorí túto interaktívnu mapu herného ovládania.'
                : 'Toggles this game-style keyboard guide.'}
            </p>
          </div>

          {/* Card: P (Auto-Rotate Cycle) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-500/40">
                P
              </span>
              <span className="font-bold text-white">{isSk ? 'Automatická rotácia (Rotate)' : 'Auto-Rotate (Rotate)'}</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {isSk
                ? '1. klik: rotácia doprava • 2. klik: stop • 3. klik: rotácia doľava... a cyklicky opakuje. Tlačidlo má ikonu rotácie.'
                : '1st press: rotate right • 2nd press: stop • 3rd press: rotate left... and continuously cycles. Replaced generic Play icon with Rotate.'}
            </p>
          </div>

          {/* Card: M (Movie Mode / Kino) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/40">
                M
              </span>
              <span className="font-bold text-white">{isSk ? 'Režim filmu (Kino)' : 'Movie Mode (Cinema)'}</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {isSk
                ? 'Prepne na celú obrazovku v čistom režime (iba s názvom) a spustí 360° rotáciu s automatickým prepínaním na ďalšiu panorámu v páse.'
                : 'Switches to fullscreen clean mode (with title only) and runs a 360° rotation with auto-advance across the playlist.'}
            </p>
          </div>

          {/* Card: O (Spatial Audio [EXP]) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-500/40">
                O
              </span>
              <span className="font-bold text-white">{isSk ? 'Spatial Audio 3D [EXP]' : 'Spatial Audio 3D [EXP]'}</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {isSk
                ? 'Zapne/vypne 3D priestorovú zvukovú kulisu: jemný hudobný ambient, prelet vtákov, horský vietor a vzdialené lietadlo.'
                : 'Toggles 3D spatial soundscape: gentle musical ambient pads, bird flybys, wind, and distant airplane.'}
            </p>
          </div>

          {/* Card: K (Solar Compass [EXP]) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/40">
                K
              </span>
              <span className="font-bold text-white">{isSk ? 'Solárny Kompas & Radar [EXP]' : 'Solar Compass & Radar [EXP]'}</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {isSk
                ? 'V štandardnom režime zobrazí AR azimut priamo v oblakoch (+20°), stredový zameriavač so stupňami & výškou nad morom a rotujúcu satelitnú mapku (r ≈ 1 km).'
                : 'In standard view, renders AR azimuth in the clouds (+20°), center reticle with degrees & elevation, and rotating satellite minimap (r ≈ 1 km).'}
            </p>
          </div>

          {/* Card: F (Fullscreen) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 font-mono font-bold border border-blue-500/40">
                F
              </span>
              <span className="font-bold text-white">{isSk ? 'Celá obrazovka' : 'Fullscreen'}</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {isSk
                ? 'Okamžite prepne prehliadač na celú obrazovku (fullscreen) alebo späť.'
                : 'Toggles full-screen viewing mode on and off.'}
            </p>
          </div>

          {/* Card: I (Info & AI Story) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/40">
                I
              </span>
              <span className="font-bold text-white">{isSk ? 'Info & AI Príbeh' : 'Info & AI Story'}</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {isSk
                ? 'Otvorí informačný panel s technickými detailmi, GPS súradnicami a lokálnym AI príbehom lokality.'
                : 'Opens detail panel with technical specs, GPS coordinates, and localized AI heritage context.'}
            </p>
          </div>

          {/* Card: E (Explorer) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-500/40">
                E
              </span>
              <span className="font-bold text-white">{isSk ? 'Prieskumník' : 'Explorer Drawer'}</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {isSk
                ? 'Otvorí spodný filmový pás a zoznam okolitých a filtrovaných panorám.'
                : 'Toggles the bottom filmstrip drawer with nearby and filtered panoramas.'}
            </p>
          </div>

          {/* Card: L (Map) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/40">
                L
              </span>
              <span className="font-bold text-white">{isSk ? 'Mapa sveta (GPS)' : 'Location Map'}</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {isSk
                ? 'Otvorí interaktívnu mapu vycentrovanú na presnú GPS pozíciu aktuálnej panorámy.'
                : 'Opens the world map centered at the exact coordinates of the current panorama.'}
            </p>
          </div>

          {/* Card: R (Reset Camera) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-zinc-400/40 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-200 font-mono font-bold border border-zinc-600">
                R
              </span>
              <span className="font-bold text-white">{isSk ? 'Resetovať pohľad' : 'Reset Camera'}</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {isSk
                ? 'Okamžite vráti orientáciu kamery, náklon a zorné pole (FOV) na predvolenú hodnotu.'
                : 'Instantly resets camera orientation, pitch, and FOV to default.'}
            </p>
          </div>

          {/* Card: G (Gyroscope) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-violet-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-violet-500/20 text-violet-300 font-mono font-bold border border-violet-500/40">
                G
              </span>
              <span className="font-bold text-white">{isSk ? 'Gyroskop & Senzory' : 'Gyroscope Mode'}</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {isSk
                ? 'Aktivuje pohybové senzory na smartfóne a tablete pre rozhliadanie sa otáčaním zariadenia v priestore.'
                : 'Activates mobile device motion sensors for hands-free look-around in real space.'}
            </p>
          </div>

          {/* Card: B (Peak Finder) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-sky-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 font-mono font-bold border border-sky-500/40">
                B
              </span>
              <span className="font-bold text-white">{isSk ? 'Vrcholy a Horizont' : 'Peak Finder'}</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {isSk
                ? 'Zobrazí 3D orientačné značky okolitých vrchov, hradov, vysielačov a rozhľadní na horizonte s azimutom a vzdialenosťou.'
                : 'Displays 3D landmark pins for surrounding mountain peaks, castles, and towers along the horizon.'}
            </p>
          </div>

          {/* Card: X (Walkthrough) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-teal-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-teal-500/20 text-teal-300 font-mono font-bold border border-teal-500/40">
                X
              </span>
              <span className="font-bold text-white">{isSk ? '3D Virtuálna Chôdza' : '3D Walkthrough'}</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {isSk
                ? 'Zapne navigačné chevróny na zemi smerujúce na susedné panorámy s plynulým preletom (warp transition).'
                : 'Enables ground navigation chevron hotspots pointing to nearby panoramas with smooth fly-in warp transitions.'}
            </p>
          </div>

          {/* Card: Y (Time-Travel) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/40">
                Y / Shift+Y
              </span>
              <span className="font-bold text-white">{isSk ? 'Časová os & Prehrávanie (Play)' : 'Timeline & Play'}</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {isSk
                ? 'Y otvorí časovú os záberov na rovnakom mieste (do 100 m). Shift+Y (alebo tlačidlo Play na lište) spustí automatické cyklické prehrávanie záberov s 2-sekundovým intervalom.'
                : 'Y opens chronological captures at the location (within 100 m). Shift+Y (or Play button on timeline) toggles 2-second auto-playback across cluster captures.'}
            </p>
          </div>

          {/* Card: U (Share) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-500/40">
                U
              </span>
              <span className="font-bold text-white">{isSk ? 'Zdieľať panorámu' : 'Share Link'}</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {isSk
                ? 'Otvorí okno pre rýchle zdieľanie odkazu alebo skopírovanie priameho linku na aktuálnu panorámu.'
                : 'Opens share modal to quickly copy or send the direct link to the current panorama.'}
            </p>
          </div>

          {/* Card: ESC */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-rose-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 font-mono font-bold border border-rose-500/40">
                ESC
              </span>
              <span className="font-bold text-white">{isSk ? 'Zatvorenie' : 'Close / Back'}</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {isSk
                ? 'Postupne zatvára nápovedu, informačný panel, čistý režim alebo samotný prehliadač.'
                : 'Closes overlays or exits the panorama viewer.'}
            </p>
          </div>
        </div>
      </div>
  );
};

export const KeyboardControlsModal: React.FC<KeyboardControlsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const isSk = i18n.language.startsWith('sk');

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar bg-gradient-to-b from-zinc-900/95 via-zinc-950/98 to-black rounded-3xl border border-cyan-500/40 p-5 sm:p-7 shadow-2xl shadow-cyan-950/60 text-white animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Futuristic glowing corner accents */}
        <div className="absolute top-0 left-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-950/50">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-amber-300 font-mono">
                  {isSk ? 'HERNÉ OVLÁDANIE KLÁVESNICOU' : 'KEYBOARD CONTROLS GUIDE'}
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold border border-cyan-500/40">
                  PRO HUD
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {isSk
                  ? 'Kompletná mapa kláves pre bleskurýchle ovládanie 360° panorámy'
                  : 'Fast keyboard mapping for ultra-smooth 360° panoramic navigation'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-colors cursor-pointer border border-white/10"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <KeyboardControlsContent isSk={isSk} />

        {/* Footer tip */}
        <div className="pt-4 mt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              {isSk
                ? 'Tip: Klávesovú nápovedu otvoríte kedykoľvek stlačením "H" alebo kliknutím na "?"'
                : 'Tip: Press "H" or click "?" to open this guide anytime'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold font-mono transition-all cursor-pointer shadow-lg shadow-cyan-500/30"
          >
            {isSk ? 'Rozumiem (OK)' : 'Got it (OK)'}
          </button>
        </div>
      </div>
    </div>
  );
};
