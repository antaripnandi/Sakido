import React from 'react';
import { CheckCircle2, CircleDashed, Clock } from 'lucide-react';

export const RoadmapSection: React.FC = () => {
  const milestones = [
    {
      quarter: 'Q1 2026',
      title: 'Public Landing Page & 240-Frame Reveal',
      status: 'Completed',
      desc: 'Minimal hero interaction, scroll-driven storytelling, and early waitlist access.',
      active: false,
    },
    {
      quarter: 'Q2 2026',
      title: 'Core Desktop Application Release',
      status: 'In Development',
      desc: 'Notes, Tasks, Calendar, and Knowledge graph engine for macOS and Windows.',
      active: true,
    },
    {
      quarter: 'Q3 2026',
      title: 'Bring Your Own AI (BYO-AI)',
      status: 'Upcoming',
      desc: 'Integration for Ollama, LM Studio, Anthropic, and Gemini API keys.',
      active: false,
    },
    {
      quarter: 'Q4 2026',
      title: 'End-to-End Encrypted Sync',
      status: 'Planned',
      desc: 'Peer-to-peer device sync with zero-knowledge encryption keys.',
      active: false,
    },
  ];

  return (
    <section id="roadmap" className="py-24 px-6 max-w-5xl mx-auto bg-white border-t border-zinc-100">
      <div className="max-w-xl mb-16">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Roadmap</span>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 mt-2">
          Future releases.
        </h2>
        <p className="text-sm text-zinc-500 mt-2 font-normal">
          Building Sakido in public with a focused, quiet trajectory.
        </p>
      </div>

      <div className="space-y-6">
        {milestones.map((m, idx) => (
          <div
            key={m.quarter}
            className={`p-6 rounded-2xl border transition-all ${
              m.active
                ? 'border-zinc-900 bg-zinc-50'
                : 'border-zinc-200/80 bg-white'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {m.status === 'Completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-zinc-900 flex-shrink-0" />
                ) : m.active ? (
                  <Clock className="w-5 h-5 text-zinc-900 animate-spin flex-shrink-0" />
                ) : (
                  <CircleDashed className="w-5 h-5 text-zinc-400 flex-shrink-0" />
                )}
                <span className="text-xs font-mono font-bold text-zinc-400 uppercase">{m.quarter}</span>
                <h3 className="text-base font-bold text-zinc-900">{m.title}</h3>
              </div>

              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${
                  m.active
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                {m.status}
              </span>
            </div>

            <p className="text-xs text-zinc-500 mt-3 sm:ml-8 max-w-xl leading-relaxed">
              {m.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
