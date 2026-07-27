import React from 'react';
import { Github, ArrowUpRight } from 'lucide-react';

interface NavbarProps {
  onOpenGetStarted: () => void;
  onNavigateSection: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenGetStarted,
  onNavigateSection,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xs border-b border-zinc-100">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="text-lg font-bold tracking-tight text-zinc-900 hover:opacity-80 transition-opacity flex items-center gap-2"
        >
          <span className="w-2.5 h-2.5 bg-zinc-900 rounded-full" />
          Sakido
        </button>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-600">
          <button
            onClick={() => onNavigateSection('sequence-hero')}
            className="hover:text-zinc-900 transition-colors cursor-pointer"
          >
            Product
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
            <Github className="w-4 h-4" />
            GitHub
          </a>
        </nav>

        {/* Right CTA */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenGetStarted}
            className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-full transition-all flex items-center gap-1 cursor-pointer"
          >
            Get Started
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
