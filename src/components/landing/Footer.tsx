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
    <footer className="bg-black text-zinc-400 border-t border-zinc-900/60 py-12 md:py-16 px-6 relative z-30 font-sans">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        {/* Brand & Minimalist Subtext */}
        <div className="space-y-1">
          <span className="font-syne text-xl md:text-2xl font-bold tracking-tight text-white block">
            Sakido
          </span>
          <p className="text-xs text-zinc-500 font-normal max-w-xs leading-relaxed">
            Minimalist academic focus workspace.
          </p>
        </div>

        {/* Minimalist Legal Links */}
        <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-zinc-400">
          <Link to="/privacy" className="hover:text-white transition-colors">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-white transition-colors">
            Terms
          </Link>
          <Link to="/cookie-policy" className="hover:text-white transition-colors">
            Cookies
          </Link>
          <Link to="/contact" className="hover:text-white transition-colors">
            Support
          </Link>
        </div>

        {/* Action Button */}
        {onOpenGetStarted && (
          <div>
            <button
              onClick={onOpenGetStarted}
              className="bg-white hover:bg-zinc-200 text-black text-xs font-semibold px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>Get Started</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-zinc-900/60 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-600 gap-2">
        <p>© {new Date().getFullYear()} Sakido. All rights reserved.</p>
        <p className="font-mono text-zinc-600">Quiet study environment.</p>
      </div>
    </footer>
  );
};
