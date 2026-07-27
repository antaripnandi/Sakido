import React from 'react';
import { BookOpen, CheckSquare, Calendar, Database, Cpu } from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      id: 'notes',
      icon: BookOpen,
      title: 'Notes',
      subtitle: 'Capture ideas without distraction.',
      description: 'Clean markdown editor designed for speed, focus, and deep learning.',
    },
    {
      id: 'tasks',
      icon: CheckSquare,
      title: 'Tasks',
      subtitle: 'Stay organized without feeling overwhelmed.',
      description: 'Prioritized course deliverables with automated schedule deadlines.',
    },
    {
      id: 'calendar',
      icon: Calendar,
      title: 'Calendar',
      subtitle: 'Know what is next.',
      description: 'Unified course schedules, exam dates, and assignment timeline.',
    },
    {
      id: 'knowledge',
      icon: Database,
      title: 'Knowledge',
      subtitle: 'Save everything worth remembering.',
      description: 'Interlinked concept maps and cross-referenced course archives.',
    },
    {
      id: 'ai',
      icon: Cpu,
      title: 'Bring Your Own AI',
      subtitle: 'Your notes stay yours.',
      description: 'Connect local models or private API keys with zero data leakage.',
    },
  ];

  return (
    <section id="features" className="py-24 px-6 max-w-6xl mx-auto bg-white border-t border-zinc-100">
      {/* Header */}
      <div className="max-w-xl mb-16">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Pillars</span>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 mt-2">
          Designed for quiet clarity.
        </h2>
        <p className="text-sm text-zinc-500 mt-2 font-normal">
          Five essential pillars engineered for students who value intentionality.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {features.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div
              key={feat.id}
              className={`p-8 rounded-2xl bg-white border border-zinc-200/80 flex flex-col justify-between ${
                idx === 4 ? 'md:col-span-2' : ''
              }`}
            >
              <div>
                <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mb-6">
                  <Icon className="w-5 h-5 text-zinc-900" />
                </div>
                <span className="text-xs font-mono font-semibold text-zinc-400">0{idx + 1}</span>
                <h3 className="text-xl font-bold text-zinc-900 mt-1">
                  {feat.title}
                </h3>
                <p className="text-sm font-semibold text-zinc-700 mt-1">
                  {feat.subtitle}
                </p>
                <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
                  {feat.description}
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400 font-medium">
                <span>Sakido Pillar</span>
                <span>Core Module</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
