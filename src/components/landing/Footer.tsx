import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SakidoLogo } from '../common/SakidoLogo';

interface FooterProps {
  onOpenGetStarted?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenGetStarted,
}) => {
  return (
    <footer className="bg-black text-zinc-400 py-6 px-6 relative z-30 font-sans">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Brand & Copyright */}
        <div className="flex items-center gap-3">
          <SakidoLogo size="w-6 h-6" showText textClassName="font-syne text-lg font-bold tracking-tight text-white" />
          <span className="text-zinc-700 text-xs">·</span>
          <span className="text-xs text-zinc-400 font-normal">
            © {new Date().getFullYear()} Sakido Academic Portal
          </span>
        </div>

        {/* Center: Legal Links */}
        <div className="flex items-center gap-6 text-xs font-medium text-zinc-400">
          <Link to="/privacy" className="hover:text-white transition-colors">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-white transition-colors">
            Terms
          </Link>
          <button
            onClick={onOpenGetStarted}
            className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>Get Started</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
