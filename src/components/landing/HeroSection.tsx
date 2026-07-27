import React from 'react';
import { ArrowDown, Sparkles } from 'lucide-react';

interface HeroSectionProps {
  onOpenGetStarted: () => void;
  onScrollToStory: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenGetStarted,
  onScrollToStory,
}) => {
  return (
    <section className="pt-24 pb-16 md:pt-36 md:pb-24 px-6 text-center max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[70vh]">
      {/* Small Eyebrow Pill */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-semibold text-zinc-700 mb-8">
        <Sparkles className="w-3.5 h-3.5 text-zinc-900" />
        <span>240-Frame Interactive Reveal</span>
      </div>

      {/* Main Title */}
      <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-zinc-900 leading-[1.05]">
        Sakido
      </h1>

      {/* Subtitle */}
      <p className="mt-6 text-xl sm:text-2xl md:text-3xl font-medium text-zinc-800 tracking-tight max-w-2xl">
        Your second brain for school.
      </p>

      {/* Supporting Copy */}
      <p className="mt-4 text-sm sm:text-base text-zinc-500 font-normal max-w-xl leading-relaxed">
        One workspace for notes, tasks, calendars, and knowledge.
      </p>

      {/* Action Buttons */}
      <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
        <button
          onClick={onOpenGetStarted}
          className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm px-8 py-3.5 rounded-full transition-all cursor-pointer shadow-xs"
        >
          Get Started
        </button>

        <button
          onClick={onScrollToStory}
          className="w-full sm:w-auto bg-white hover:bg-zinc-50 text-zinc-900 font-semibold text-sm px-8 py-3.5 rounded-full border border-zinc-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          Learn More
          <ArrowDown className="w-4 h-4 text-zinc-500" />
        </button>
      </div>

      {/* Minimal Scroll Prompt */}
      <div className="mt-20 flex flex-col items-center gap-2 text-zinc-400 text-xs font-medium tracking-wide uppercase">
        <span>Scroll to unbox</span>
        <div className="w-px h-8 bg-zinc-200 animate-pulse" />
      </div>
    </section>
  );
};
