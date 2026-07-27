import React from 'react';
import { ShieldCheck, HardDrive, FileText, Zap, Lock, RefreshCw } from 'lucide-react';

export const ProductSpecsSection: React.FC = () => {
  const specs = [
    {
      icon: HardDrive,
      title: 'Local-First Architecture',
      detail: '100% offline access. All course notes and tasks reside locally on your device.',
    },
    {
      icon: Lock,
      title: 'Private AI Integration',
      detail: 'Bring your own API key or run local LLMs (Ollama, LM Studio). Zero server storage.',
    },
    {
      icon: FileText,
      title: 'Plain Text & Markdown',
      detail: 'Portable, future-proof notes saved in standard Open Markdown format.',
    },
    {
      icon: Zap,
      title: 'Instant Keyboard Navigation',
      detail: 'Global command palette and Vim-inspired shortcuts for seamless flow state.',
    },
    {
      icon: ShieldCheck,
      title: 'Zero Tracking & Ad-Free',
      detail: 'No telemetry, no analytics beacons, and no monetized user data.',
    },
    {
      icon: RefreshCw,
      title: '240-Frame Interactive Precision',
      detail: 'Every interaction calibrated for 60 FPS scroll smoothness and visual perfection.',
    },
  ];

  return (
    <section className="py-24 px-6 max-w-6xl mx-auto bg-white border-t border-zinc-100">
      <div className="max-w-xl mb-16">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Specifications</span>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 mt-2">
          Engineered for privacy.
        </h2>
        <p className="text-sm text-zinc-500 mt-2 font-normal">
          Designed with no compromises on speed, ownership, and simplicity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
        {specs.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="flex gap-4 items-start pt-6 border-t border-zinc-100">
              <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-zinc-900" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  {item.title}
                </h3>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  {item.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
