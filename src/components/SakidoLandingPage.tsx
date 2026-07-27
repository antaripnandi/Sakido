import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FrameCanvas } from './FrameCanvas';

gsap.registerPlugin(ScrollTrigger);

/**
 * =========================================================================
 * FEATURE CALLOUT FRAME RANGES (0 to 239)
 * Exact copy from product specification.
 * =========================================================================
 */
const FEATURE_CALLOUTS = [
  {
    id: 'notes',
    title: 'Notes',
    text: 'Write notes by course and semester.',
    startFrame: 25,
    peakStart: 32,
    peakEnd: 50,
    endFrame: 58,
  },
  {
    id: 'calendar',
    title: 'Calendar',
    text: 'See your classes and deadlines. Connect Google Calendar if you want.',
    startFrame: 58,
    peakStart: 65,
    peakEnd: 83,
    endFrame: 91,
  },
  {
    id: 'tasks-grades',
    title: 'Tasks & grades',
    text: 'Track assignments and calculate your grade.',
    startFrame: 91,
    peakStart: 98,
    peakEnd: 116,
    endFrame: 124,
  },
  {
    id: 'knowledge-inbox',
    title: 'Knowledge Inbox',
    text: "Save a link — a video, article, or PDF — so you don't lose it. Share a YouTube link and it plays right on the page.",
    startFrame: 124,
    peakStart: 131,
    peakEnd: 149,
    endFrame: 157,
  },
  {
    id: 'chat',
    title: 'Chat',
    text: 'Message people at your university, or join the global chat.',
    startFrame: 157,
    peakStart: 164,
    peakEnd: 182,
    endFrame: 190,
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    text: "Opens to today's classes and what's due next.",
    startFrame: 190,
    peakStart: 197,
    peakEnd: 212,
    endFrame: 218,
  },
  {
    id: 'search',
    title: 'Search',
    text: 'Ctrl/Cmd+K to find any note fast.',
    startFrame: 218,
    peakStart: 222,
    peakEnd: 232,
    endFrame: 238,
  },
];

/** Helper to calculate opacity for callout at a given frame index */
function getCalloutOpacity(frame: number, start: number, peakStart: number, peakEnd: number, end: number): number {
  if (frame < start || frame > end) return 0;
  if (frame >= peakStart && frame <= peakEnd) return 1;
  if (frame < peakStart) {
    return (frame - start) / (peakStart - start);
  }
  return (end - frame) / (end - peakEnd);
}

/** Helper to calculate vertical offset during fade in/out */
function getCalloutY(frame: number, start: number, peakStart: number, peakEnd: number, end: number): number {
  if (frame < start || frame > end) return 20;
  if (frame >= peakStart && frame <= peakEnd) return 0;
  if (frame < peakStart) {
    const p = (frame - start) / (peakStart - start);
    return (1 - p) * 20;
  }
  const p = (end - frame) / (end - peakEnd);
  return (1 - p) * -20;
}

export const SakidoLandingPage: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pinnedRef = useRef<HTMLDivElement | null>(null);

  const [targetFrame, setTargetFrame] = useState<number>(0);
  const [displayFrame, setDisplayFrame] = useState<number>(0);
  const [preloadProgress, setPreloadProgress] = useState<number>(0);

  // Smooth lerp animation loop for frame transitions
  useEffect(() => {
    let animId: number;
    const updateLoop = () => {
      setDisplayFrame((prev) => {
        const diff = targetFrame - prev;
        if (Math.abs(diff) < 0.01) return targetFrame;
        return prev + diff * 0.18;
      });
      animId = requestAnimationFrame(updateLoop);
    };
    animId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(animId);
  }, [targetFrame]);

  // Bind GSAP ScrollTrigger to pin canvas & map smooth scroll progress across 240 frames
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: container,
        start: 'top top',
        end: '+=5000', // ~5000px pinned scroll space for smooth frame pacing
        pin: pinnedRef.current,
        scrub: 1, // Smooth scrub momentum
        onUpdate: (self) => {
          const frame = Math.min(239, self.progress * 239);
          setTargetFrame(frame);
        },
      });
    }, container);

    return () => ctx.revert();
  }, []);

  // Compute hero opacity (Frame 0 to 22)
  const heroOpacity = Math.max(0, 1 - displayFrame / 22);
  const heroY = (1 - heroOpacity) * -20;

  return (
    <div className="bg-black text-white min-h-screen font-sans selection:bg-white selection:text-black">
      {/* 1. Header (fixed) */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-zinc-900 px-6 sm:px-12 py-4 flex items-center justify-between">
        <span className="text-lg sm:text-xl font-bold tracking-tight text-white select-none">
          Sakido
        </span>
        <span className="text-xs sm:text-sm text-zinc-400 font-normal tracking-wide select-none pointer-events-none">
          Notes · Calendar · Tasks · Chat
        </span>
      </header>

      {/* Subtle Preloading Progress Line */}
      {preloadProgress < 100 && (
        <div className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-zinc-900 pointer-events-none transition-opacity duration-500">
          <div
            className="h-full bg-white transition-all duration-200"
            style={{ width: `${preloadProgress}%` }}
          />
        </div>
      )}

      {/* Main Pinned Scroll Section */}
      <div ref={scrollContainerRef} className="relative w-full bg-black">
        <div
          ref={pinnedRef}
          className="h-screen w-full relative overflow-hidden flex flex-col justify-between items-center py-16 px-6 sm:px-12"
        >
          {/* Full Screen Canvas background for 240-frame sequence */}
          <div className="absolute inset-0 z-10 w-full h-full">
            <FrameCanvas
              currentFrame={displayFrame}
              totalFrames={240}
              onPreloadProgress={setPreloadProgress}
              className="w-full h-full"
            />
          </div>

          {/* 2. Hero Header Text (Frame 0 - 22) */}
          <div
            className="z-20 text-center max-w-3xl pointer-events-none transition-all duration-300 relative mt-16 sm:mt-24 px-4"
            style={{
              opacity: heroOpacity,
              transform: `translateY(${heroY}px)`,
            }}
          >
            <h1 className="text-6xl sm:text-8xl md:text-9xl font-bold tracking-tighter text-white">
              Sakido
            </h1>
            <p className="mt-6 text-lg sm:text-2xl text-zinc-300 font-normal tracking-tight leading-relaxed max-w-2xl mx-auto">
              Notes, calendar, tasks, saved links, and chat — one app instead of five.
            </p>
          </div>

          {/* 3. Scroll-pinned feature callouts (Generous negative space, no cards/shadows/gradients) */}
          <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center p-6 sm:p-12">
            {FEATURE_CALLOUTS.map((item) => {
              const opacity = getCalloutOpacity(
                displayFrame,
                item.startFrame,
                item.peakStart,
                item.peakEnd,
                item.endFrame
              );
              const translateY = getCalloutY(
                displayFrame,
                item.startFrame,
                item.peakStart,
                item.peakEnd,
                item.endFrame
              );

              if (opacity <= 0.001) return null;

              return (
                <div
                  key={item.id}
                  className="absolute text-center max-w-xl px-6 transition-all duration-300"
                  style={{
                    opacity,
                    transform: `translateY(${translateY}px)`,
                  }}
                >
                  <h2 className="text-4xl sm:text-6xl font-bold tracking-tight text-white mb-3">
                    {item.title}
                  </h2>
                  <p className="text-lg sm:text-2xl text-zinc-300 font-normal tracking-tight leading-snug">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Hero Bottom Scroll Hint */}
          <div
            className="z-20 text-center text-xs text-zinc-500 font-medium tracking-widest uppercase pointer-events-none transition-opacity duration-300 mb-4"
            style={{ opacity: heroOpacity }}
          >
            Scroll to unpack
          </div>
        </div>
      </div>

      {/* 5. Closing Section */}
      <section className="relative z-30 bg-black py-28 sm:py-40 px-6 text-center border-t border-zinc-900">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-5xl sm:text-7xl font-bold tracking-tighter text-white leading-none">
            Everything school. One app.
          </h2>

          <div className="pt-6">
            <button
              className="inline-block px-8 py-3.5 rounded-full bg-white text-black font-semibold text-sm transition-opacity opacity-90 cursor-default select-none pointer-events-none"
              tabIndex={-1}
            >
              Get Started
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};


