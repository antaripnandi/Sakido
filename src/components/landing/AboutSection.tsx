import React from 'react';

export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-28 px-6 max-w-4xl mx-auto bg-white border-t border-zinc-100 text-center">
      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Philosophy</span>
      
      <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 mt-4 leading-tight">
        Software should feel like stationery.
      </h2>

      <p className="mt-8 text-base sm:text-lg text-zinc-600 font-medium max-w-2xl mx-auto leading-relaxed">
        Modern student software is cluttered with notifications, gamification, and endless menus. Sakido was created as a quiet counterweight. Pure white space, rapid responsiveness, and total focus on what matters most—your learning.
      </p>

      <div className="mt-12 pt-8 border-t border-zinc-100 flex flex-wrap justify-center gap-12 text-xs font-mono text-zinc-400">
        <div>
          <span className="block text-zinc-900 font-bold text-sm">001</span>
          <span>Zero Distractions</span>
        </div>
        <div>
          <span className="block text-zinc-900 font-bold text-sm">240</span>
          <span>Precision Frames</span>
        </div>
        <div>
          <span className="block text-zinc-900 font-bold text-sm">100%</span>
          <span>Local Ownership</span>
        </div>
      </div>
    </section>
  );
};
