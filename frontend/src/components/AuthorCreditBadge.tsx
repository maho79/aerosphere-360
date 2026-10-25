import React from 'react';
import { panoConfig } from '../config/panoConfig';
import { Globe } from 'lucide-react';

export interface AuthorCreditBadgeProps {
  className?: string;
  variant?: 'pill' | 'minimal' | 'footer';
}

export const AuthorCreditBadge: React.FC<AuthorCreditBadgeProps> = ({
  className = '',
  variant = 'pill',
}) => {
  const { author } = panoConfig.branding;
  if (!author.showCreditBadge) return null;

  if (variant === 'minimal') {
    return (
      <a
        href={author.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`text-[10px] text-zinc-400 hover:text-cyan-300 transition-colors flex items-center gap-1 ${className}`}
        title="Engine by Marian Trusik"
      >
        <span>Engine by {author.name}</span>
      </a>
    );
  }

  if (variant === 'footer') {
    return (
      <div className={`text-xs text-zinc-400 flex items-center justify-center gap-1.5 py-2 ${className}`}>
        <span>Engineered by</span>
        <a
          href={author.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 font-semibold underline decoration-cyan-500/40 hover:decoration-cyan-400 transition-colors"
        >
          {author.name}
        </a>
        <span>·</span>
        <a
          href={author.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-400 hover:text-white transition-colors"
        >
          panorama.trusik.link
        </a>
      </div>
    );
  }

  return (
    <aside aria-label="Author Credit">
      <a
        href={author.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`pointer-events-auto px-2.5 py-1 rounded-full bg-zinc-950/85 backdrop-blur-md border border-white/10 hover:border-cyan-500/40 text-[10px] text-zinc-400 hover:text-cyan-300 shadow-xl flex items-center gap-1.5 transition-all duration-300 hover:scale-105 group ${className}`}
        title="Powered by AeroSphere 360 · Created by Marian Trusik"
      >
        <Globe className="w-3 h-3 text-cyan-400/80 group-hover:text-cyan-300 group-hover:rotate-45 transition-transform" />
        <span className="font-medium tracking-tight">
          Engine by <strong className="text-zinc-200 group-hover:text-white">{author.name}</strong>
        </span>
        <span className="text-cyan-400/60 font-mono text-[9px]">trusik.link</span>
      </a>
    </aside>
  );
};
