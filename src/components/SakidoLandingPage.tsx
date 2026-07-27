import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FrameCanvas } from './FrameCanvas';

gsap.registerPlugin(ScrollTrigger);

/**
 * =========================================================================
 * FEATURE CALLOUT FRAME RANGES (0 to 239)
 * 6 Main Product Sections with expanded duration for parts 1 to 6.
 * =========================================================================
 */
const FEATURE_CALLOUTS = [
  {
    id: 'notes',
    category: '01 / ORGANIZER',
    title: 'Notes',
    text: 'Write notes by course and semester.',
    align: 'left',
    startFrame: 22,
    peakStart: 30,
    peakEnd: 52,
    endFrame: 58,
  },
  {
    id: 'calendar',
    category: '02 / SCHEDULE',
    title: 'Calendar',
    text: 'See your classes and deadlines. Connect Google Calendar if you want.',
    align: 'right',
    startFrame: 58,
    peakStart: 66,
    peakEnd: 88,
    endFrame: 94,
  },
  {
    id: 'tasks-grades',
    category: '03 / ACADEMICS',
    title: 'Tasks & grades',
    text: 'Track assignments and calculate your grade.',
    align: 'left',
    startFrame: 94,
    peakStart: 102,
    peakEnd: 124,
    endFrame: 130,
  },
  {
    id: 'knowledge-inbox',
    category: '04 / KNOWLEDGE',
    title: 'Knowledge Inbox',
    text: "Save a link — a video, article, or PDF — so you don't lose it. Share a YouTube link and it plays right on the page.",
    align: 'right',
    startFrame: 130,
    peakStart: 138,
    peakEnd: 160,
    endFrame: 166,
  },
  {
    id: 'chat',
    category: '05 / COMMUNITY',
    title: 'Chat',
    text: 'Message people at your university, or join the global chat.',
    align: 'left',
    startFrame: 166,
    peakStart: 174,
    peakEnd: 196,
    endFrame: 202,
  },
  {
    id: 'dashboard',
    category: '06 / OVERVIEW',
    title: 'Dashboard',
    text: "Opens to today's classes and what's due next.",
    align: 'right',
    startFrame: 202,
    peakStart: 210,
    peakEnd: 232,
    endFrame: 239,
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
  if (frame < start || frame > end) return 24;
  if (frame >= peakStart && frame <= peakEnd) return 0;
  if (frame < peakStart) {
    const p = (frame - start) / (peakStart - start);
    return (1 - p) * 24;
  }
  const p = (end - frame) / (end - peakEnd);
  return (1 - p) * -24;
}

export const SakidoLandingPage: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pinnedRef = useRef<HTMLDivElement | null>(null);

  const [targetFrame, setTargetFrame] = useState<number>(0);
  const [displayFrame, setDisplayFrame] = useState<number>(0);
  const [preloadProgress, setPreloadProgress] = useState<number>(0);

  // GSAP Ticker for buttery smooth frame interpolation
  useEffect(() => {
    const updateFrame = () => {
      setDisplayFrame((prev) => {
        const diff = targetFrame - prev;
        if (Math.abs(diff) < 0.01) return targetFrame;
        return prev + diff * 0.22;
      });
    };

    gsap.ticker.add(updateFrame);
    return () => gsap.ticker.remove(updateFrame);
  }, [targetFrame]);

  // GSAP ScrollTrigger pinning & scroll mapping
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: container,
        start: 'top top',
        end: '+=6000', // Pinned scroll track length
        pin: pinnedRef.current,
        scrub: 0.8,
        onUpdate: (self) => {
          const frame = Math.min(239, self.progress * 239);
          setTargetFrame(frame);
        },
      });
    }, container);

    return () => ctx.revert();
  }, []);

  // Compute hero title opacity (Frame 0 to 20)
  const heroOpacity = Math.max(0, 1 - displayFrame / 20);
  const heroY = (1 - heroOpacity) * -24;

  return (
    <div className="bg-black text-white min-h-screen font-sans selection:bg-white selection:text-black">
      {/* Subtle Preloading Progress Line */}
      {preloadProgress < 100 && (
        <div className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-zinc-900 pointer-events-none transition-opacity duration-500">
          <div
            className="h-full bg-white transition-all duration-200"
            style={{ width: `${preloadProgress}%` }}
          />
        </div>
      )}

      {/* Main GSAP Pinned Scroll Track */}
      <div ref={scrollContainerRef} className="relative w-full bg-black">
        <div
          ref={pinnedRef}
          className="h-screen w-full relative overflow-hidden flex flex-col justify-between items-center py-12 px-6 sm:px-12"
        >
          {/* Canvas sequence background */}
          <div className="absolute inset-0 z-10 w-full h-full">
            <FrameCanvas
              currentFrame={displayFrame}
              totalFrames={240}
              onPreloadProgress={setPreloadProgress}
              className="w-full h-full"
            />
          </div>

          {/* Hero Header Title (Frame 0 - 20) */}
          <div
            className="z-20 text-center max-w-3xl pointer-events-none transition-all duration-300 relative mt-20 sm:mt-28 px-4"
            style={{
              opacity: heroOpacity,
              transform: `translateY(${heroY}px)`,
            }}
          >
            <h1 className="text-6xl sm:text-8xl md:text-9xl font-extrabold tracking-tighter text-white">
              Sakido
            </h1>
            <p className="mt-6 text-lg sm:text-2xl text-zinc-300 font-normal tracking-tight leading-relaxed max-w-2xl mx-auto">
              Notes, calendar, tasks, saved links, and chat — one app instead of five.
            </p>
          </div>

          {/* Feature callouts positioned strictly Left and Right */}
          <div className="absolute inset-0 z-20 pointer-events-none p-6 sm:p-12 md:p-16">
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

              const isLeft = item.align === 'left';

              return (
                <div
                  key={item.id}
                  className={`absolute top-1/2 -translate-y-1/2 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg transition-all duration-300 ${
                    isLeft
                      ? 'left-8 sm:left-14 md:left-20 lg:left-28 text-left'
                      : 'right-8 sm:right-14 md:right-20 lg:right-28 text-right'
                  }`}
                  style={{
                    opacity,
                    transform: `translateY(calc(-50% + ${translateY}px))`,
                  }}
                >
                  <span className="text-xs uppercase tracking-[0.25em] text-zinc-400 font-semibold mb-2 block">
                    {item.category}
                  </span>
                  <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-3 leading-tight">
                    {item.title}
                  </h2>
                  <p className="text-base sm:text-xl lg:text-2xl text-zinc-300 font-normal tracking-tight leading-snug">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Hero Bottom Scroll Hint */}
          <div
            className="z-20 text-center text-xs text-zinc-500 font-medium tracking-[0.2em] uppercase pointer-events-none transition-opacity duration-300 mb-6"
            style={{ opacity: heroOpacity }}
          >
            Scroll to unpack
          </div>
        </div>
      </div>

      {/* Closing CTA Section */}
      <section className="relative z-30 bg-black py-28 sm:py-40 px-6 text-center border-t border-zinc-900">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-5xl sm:text-7xl font-extrabold tracking-tighter text-white leading-none">
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



