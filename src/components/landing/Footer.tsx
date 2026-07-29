import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FooterProps {
  onOpenGetStarted?: () => void;
  onNavigateSection?: (sectionId: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenGetStarted,
}) => {
  return (
    <footer className="bg-black text-zinc-400 border-t border-zinc-900/80 py-12 md:py-16 px-6 relative z-30 font-sans">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div>
          <div className="flex items-center gap-2 text-base font-bold text-white tracking-tight">
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
            Sakido
          </div>
          <p className="text-xs text-zinc-500 mt-2 max-w-sm leading-relaxed">
            Essentialist academic operating system. Single workspace for focus, notes, tasks, calendar, and knowledge.
          </p>
        </div>

        {/* Legal & Navigation Links */}
        <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-zinc-400">
          <Link to="/privacy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-white transition-colors">
            Terms of Service
          </Link>
          <Link to="/cookie-policy" className="hover:text-white transition-colors">
            Cookie Policy
          </Link>
          <Link to="/contact" className="hover:text-white transition-colors">
            Support & Contact
          </Link>
        </div>

        {/* Right Status Indicator & Action */}
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-mono font-medium text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Verified Domain</span>
          </div>

          {onOpenGetStarted && (
            <button
              onClick={onOpenGetStarted}
              className="bg-white hover:bg-zinc-200 text-black text-xs font-semibold px-4 py-2 rounded-full transition-all flex items-center gap-1 cursor-pointer shadow-md"
            >
              Get Started
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-10 pt-8 border-t border-zinc-900/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 gap-4">
        <p>© {new Date().getFullYear()} Sakido Technologies Inc. All rights reserved.</p>

        {/* Legal Links Bar */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-zinc-400 font-medium">
          <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          <span className="text-zinc-700">·</span>
          <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
          <span className="text-zinc-700">·</span>
          <Link to="/cookie-policy" className="hover:text-white transition-colors">Cookies</Link>
          <span className="text-zinc-700">·</span>
          <Link to="/contact" className="hover:text-white transition-colors">Support</Link>
        </div>

        <p className="mt-2 sm:mt-0 font-mono text-zinc-500">Designed for quiet, distraction-free study.</p>
      </div>
    </footer>
  );
};
