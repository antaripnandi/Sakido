import React from 'react';
import { Github, ArrowUpRight } from 'lucide-react';

interface FooterProps {
  onOpenGetStarted: () => void;
  onNavigateSection: (sectionId: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenGetStarted,
  onNavigateSection,
}) => {
  return (
    <footer className="bg-white border-t border-zinc-100 py-16 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div>
          <div className="flex items-center gap-2 text-base font-bold text-zinc-900">
            <span className="w-2.5 h-2.5 bg-zinc-900 rounded-full" />
            Sakido
          </div>
          <p className="text-xs text-zinc-500 mt-2 max-w-sm leading-relaxed">
            Your second brain for school. A single workspace for notes, tasks, calendars, and knowledge.
          </p>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center gap-8 text-xs font-medium text-zinc-600">
          <button
            onClick={() => onNavigateSection('sequence-hero')}
            className="hover:text-zinc-900 transition-colors cursor-pointer"
          >
            240-Frame Reveal
          </button>
          <button
            onClick={() => onNavigateSection('features')}
            className="hover:text-zinc-900 transition-colors cursor-pointer"
          >
            Features
          </button>
          <button
            onClick={() => onNavigateSection('about')}
            className="hover:text-zinc-900 transition-colors cursor-pointer"
          >
            About
          </button>
          <button
            onClick={() => onNavigateSection('roadmap')}
            className="hover:text-zinc-900 transition-colors cursor-pointer"
          >
            Roadmap
          </button>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-900 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Github className="w-3.5 h-3.5" />
            GitHub
          </a>
        </div>

        {/* Right Status Indicator & Get Started */}
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-50 border border-zinc-200/80 text-[11px] font-mono font-medium text-zinc-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>240 Frames Ready</span>
          </div>

          <button
            onClick={onOpenGetStarted}
            className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2 rounded-full transition-all flex items-center gap-1 cursor-pointer"
          >
            Get Started
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-400">
        <p>© {new Date().getFullYear()} Sakido Technologies Inc. All rights reserved.</p>
        <p className="mt-2 sm:mt-0 font-mono">Designed for quiet, distraction-free study.</p>
      </div>
    </footer>
  );
};
