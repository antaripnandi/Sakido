import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { FrameCanvas } from './FrameCanvas';
import { AuthModal } from './auth/AuthModal';
import { getSupabaseClient } from '../lib/supabaseClient';
import { User, ChevronLeft, Check } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

/**
 * =========================================================================
 * FEATURE CALLOUT FRAME RANGES (0 to 239)
 * 6 Main Product Sections perfectly synchronized across 240 frames.
 * =========================================================================
 */
const FEATURE_CALLOUTS = [
  {
    id: 'notes',
    step: 1,
    category: '01 / ORGANIZER',
    title: 'Notes',
    text: 'Write notes by course and semester.',
    align: 'left',
    startFrame: 20,
    peakStart: 28,
    peakEnd: 50,
    endFrame: 56,
  },
  {
    id: 'calendar',
    step: 2,
    category: '02 / SCHEDULE',
    title: 'Calendar',
    text: 'See your classes and deadlines. Connect Google Calendar if you want.',
    align: 'right',
    startFrame: 56,
    peakStart: 64,
    peakEnd: 86,
    endFrame: 92,
  },
  {
    id: 'tasks-grades',
    step: 3,
    category: '03 / ACADEMICS',
    title: 'Tasks & grades',
    text: 'Track assignments and calculate your grade.',
    align: 'left',
    startFrame: 92,
    peakStart: 100,
    peakEnd: 122,
    endFrame: 128,
  },
  {
    id: 'knowledge-inbox',
    step: 4,
    category: '04 / KNOWLEDGE',
    title: 'Knowledge Inbox',
    text: "Save a link — a video, article, or PDF — so you don't lose it. Share a YouTube link and it plays right on the page.",
    align: 'right',
    offsetY: 140,
    startFrame: 128,
    peakStart: 136,
    peakEnd: 158,
    endFrame: 164,
  },
  {
    id: 'chat',
    step: 5,
    category: '05 / COMMUNITY',
    title: 'Chat',
    text: 'Message people at your university, or join the global chat.',
    align: 'left',
    startFrame: 164,
    peakStart: 172,
    peakEnd: 194,
    endFrame: 200,
  },
  {
    id: 'dashboard',
    step: 6,
    category: '06 / OVERVIEW',
    title: 'Dashboard',
    text: "Opens to today's classes and what's due next.",
    align: 'right',
    startFrame: 200,
    peakStart: 208,
    peakEnd: 232,
    endFrame: 239,
  },
];

/** Smoothstep interpolation helper (0 -> 1 -> 0 with smooth ease derivatives) */
function smoothstep(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * (3 - 2 * clamped);
}

/** Helper to calculate opacity for callout at a given frame index */
function getCalloutOpacity(frame: number, start: number, peakStart: number, peakEnd: number, end: number): number {
  if (frame < start || frame > end) return 0;
  if (frame >= peakStart && frame <= peakEnd) return 1;
  if (frame < peakStart) {
    return smoothstep((frame - start) / (peakStart - start));
  }
  return smoothstep((end - frame) / (end - peakEnd));
}

/** Helper to calculate vertical offset during fade in/out */
function getCalloutY(frame: number, start: number, peakStart: number, peakEnd: number, end: number): number {
  if (frame < start || frame > end) return 20;
  if (frame >= peakStart && frame <= peakEnd) return 0;
  if (frame < peakStart) {
    const p = smoothstep((frame - start) / (peakStart - start));
    return (1 - p) * 20;
  }
  const p = smoothstep((end - frame) / (end - peakEnd));
  return (1 - p) * -20;
}

interface SakidoLandingPageProps {
  onOpenDashboard?: () => void;
}

export const SakidoLandingPage: React.FC<SakidoLandingPageProps> = ({ onOpenDashboard }) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pinnedRef = useRef<HTMLDivElement | null>(null);

  const [targetFrame, setTargetFrame] = useState<number>(0);
  const [displayFrame, setDisplayFrame] = useState<number>(0);
  const [preloadProgress, setPreloadProgress] = useState<number>(0);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{ email?: string; name?: string; avatarUrl?: string } | null>(null);

  // Sync Supabase Auth session on mount and upon auth change
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Check initial active session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const u = data.session.user;
        setCurrentUser({
          email: u.email,
          name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0],
          avatarUrl: u.user_metadata?.avatar_url || u.user_metadata?.picture,
        });
      }
    });

    // Subscribe to session changes (login, logout, OAuth callback)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user;
        setCurrentUser({
          email: u.email,
          name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0],
          avatarUrl: u.user_metadata?.avatar_url || u.user_metadata?.picture,
        });
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const lenisRef = useRef<Lenis | null>(null);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);
  const currentSectionRef = useRef<number>(0);
  const isAnimatingRef = useRef<boolean>(false);
  const [activeSectionIdx, setActiveSectionIdx] = useState<number>(0);

  const SECTION_PROGRESS = [0, 0.146, 0.314, 0.464, 0.615, 0.766, 0.920, 1.0];
  const SECTION_FRAMES = [0, 35, 75, 111, 147, 183, 220, 239];
  const SECTION_NAMES = [
    'Hero',
    'Notes',
    'Calendar',
    'Tasks & Grades',
    'Knowledge Inbox',
    'Chat',
    'Dashboard',
    'Get Started',
  ];

  const animateToSection = (newIndex: number) => {
    const clampedIndex = Math.max(0, Math.min(SECTION_PROGRESS.length - 1, newIndex));
    if (clampedIndex === currentSectionRef.current && isAnimatingRef.current) return;

    isAnimatingRef.current = true;
    currentSectionRef.current = clampedIndex;
    setActiveSectionIdx(clampedIndex);

    const targetProgress = SECTION_PROGRESS[clampedIndex];
    const targetFr = SECTION_FRAMES[clampedIndex];

    const st = scrollTriggerRef.current;
    if (st) {
      const targetY = st.start + targetProgress * (st.end - st.start);
      if (lenisRef.current) {
        lenisRef.current.scrollTo(targetY, {
          duration: 0.8,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          onComplete: () => {
            setTargetFrame(targetFr);
            setTimeout(() => {
              isAnimatingRef.current = false;
            }, 100);
          },
        });
      } else {
        window.scrollTo({ top: targetY, behavior: 'smooth' });
        setTargetFrame(targetFr);
        setTimeout(() => {
          isAnimatingRef.current = false;
        }, 800);
      }
    } else {
      setTargetFrame(targetFr);
      setTimeout(() => {
        isAnimatingRef.current = false;
      }, 200);
    }
  };

  // Initialize Lenis smooth scroll engine (tuned for responsiveness & touch safety)
  useEffect(() => {
    const isTouchDevice =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768);

    const lenis = new Lenis({
      duration: isTouchDevice ? 0.4 : 0.7,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: isTouchDevice ? 0.7 : 1.0,
      wheelMultiplier: 0.95,
    });

    lenisRef.current = lenis;
    lenis.on('scroll', ScrollTrigger.update);

    const updateLenis = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateLenis);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(updateLenis);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // GSAP Ticker for fluid frame interpolation
  useEffect(() => {
    const updateFrame = () => {
      setDisplayFrame((prev) => {
        const diff = targetFrame - prev;
        if (Math.abs(diff) < 0.005) return targetFrame;
        return prev + diff * 0.45;
      });
    };

    gsap.ticker.add(updateFrame);
    return () => gsap.ticker.remove(updateFrame);
  }, [targetFrame]);

  // GSAP ScrollTrigger pinning setup
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const isMobile = window.innerWidth < 768;

    const ctx = gsap.context(() => {
      const st = ScrollTrigger.create({
        trigger: container,
        start: 'top top',
        end: isMobile ? '+=4200' : '+=5400',
        pin: pinnedRef.current,
        anticipatePin: 1,
        scrub: 0.15,
        preventOverlaps: true,
        fastScrollEnd: true,
        onUpdate: (self) => {
          const frame = Math.min(239, Math.max(0, self.progress * 239));
          setTargetFrame(frame);

          if (!isAnimatingRef.current) {
            let closestIdx = 0;
            let minDiff = 999;
            SECTION_PROGRESS.forEach((p, idx) => {
              const diff = Math.abs(self.progress - p);
              if (diff < minDiff) {
                minDiff = diff;
                closestIdx = idx;
              }
            });
            currentSectionRef.current = closestIdx;
            setActiveSectionIdx(closestIdx);
          }
        },
      });
      scrollTriggerRef.current = st;
    }, container);

    return () => ctx.revert();
  }, []);

  // Intercept scroll/touch/keys for 1-scroll-intent-per-section step locking
  useEffect(() => {
    let touchStartY = 0;
    let touchStartTime = 0;

    const isInsidePinnedSection = () => {
      const container = scrollContainerRef.current;
      if (!container) return false;
      const rect = container.getBoundingClientRect();
      return rect.top <= 20 && rect.bottom >= window.innerHeight - 20;
    };

    const handleWheel = (e: WheelEvent) => {
      if (!isInsidePinnedSection()) return;

      e.preventDefault();
      if (isAnimatingRef.current) return;

      if (Math.abs(e.deltaY) > 8) {
        if (e.deltaY > 0 && currentSectionRef.current < SECTION_PROGRESS.length - 1) {
          animateToSection(currentSectionRef.current + 1);
        } else if (e.deltaY < 0 && currentSectionRef.current > 0) {
          animateToSection(currentSectionRef.current - 1);
        }
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isInsidePinnedSection()) return;

      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchStartY - touchEndY;
      const deltaTime = Date.now() - touchStartTime;

      if (Math.abs(deltaY) > 25 && deltaTime < 600) {
        if (isAnimatingRef.current) return;

        if (deltaY > 0 && currentSectionRef.current < SECTION_PROGRESS.length - 1) {
          animateToSection(currentSectionRef.current + 1);
        } else if (deltaY < 0 && currentSectionRef.current > 0) {
          animateToSection(currentSectionRef.current - 1);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isInsidePinnedSection()) return;

      if (['ArrowDown', 'PageDown', 'Space'].includes(e.key)) {
        if (currentSectionRef.current < SECTION_PROGRESS.length - 1) {
          e.preventDefault();
          if (!isAnimatingRef.current) {
            animateToSection(currentSectionRef.current + 1);
          }
        }
      } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
        if (currentSectionRef.current > 0) {
          e.preventDefault();
          if (!isAnimatingRef.current) {
            animateToSection(currentSectionRef.current - 1);
          }
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Compute hero title opacity (Frame 0 to 20)
  const heroOpacity = Math.max(0, 1 - displayFrame / 18);
  const heroY = (1 - heroOpacity) * -24;

  // Active section indicator index (1-6, or 0 if hero)
  const activeSection = FEATURE_CALLOUTS.find(
    (c) => displayFrame >= c.startFrame && displayFrame <= c.endFrame
  )?.step || 0;

  return (
    <div className="bg-black text-white min-h-screen font-sans selection:bg-white selection:text-black">
      {/* Top Floating Buttons (No background bar) */}
      <div className="fixed top-5 right-6 z-40 flex items-center gap-3">
        {currentUser ? (
          <button
            onClick={() => setIsAuthOpen(true)}
            className="group px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 hover:border-zinc-600 text-xs text-zinc-200 flex items-center gap-2.5 transition-all shadow-md backdrop-blur-md cursor-pointer hover:bg-zinc-800"
            title={currentUser.name || currentUser.email}
          >
            <div className="w-6 h-6 rounded-full bg-black border border-[#444748] flex items-center justify-center text-white overflow-hidden shrink-0 shadow-inner">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name || 'User Profile'}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="w-3.5 h-3.5 text-zinc-300" />
              )}
            </div>
            <span className="font-mono text-xs text-zinc-200 group-hover:text-white transition-colors">
              {currentUser.name || currentUser.email}
            </span>
          </button>
        ) : (
          <button
            onClick={() => setIsAuthOpen(true)}
            className="px-4 py-2 rounded-full bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors shadow-md cursor-pointer"
          >
            Get Started
          </button>
        )}
      </div>

      {/* Floating Dot Navigation Bar */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden sm:flex flex-col items-center gap-3">
        {SECTION_NAMES.map((name, idx) => {
          const isActive = activeSectionIdx === idx;
          return (
            <button
              key={`dot-${idx}`}
              onClick={() => animateToSection(idx)}
              className="group relative flex items-center justify-center p-1.5 cursor-pointer focus:outline-none"
              title={name}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-white scale-125 ring-4 ring-white/20'
                    : 'bg-zinc-600 hover:bg-zinc-400'
                }`}
              />
              <span className="absolute right-8 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
                {name}
              </span>
            </button>
          );
        })}
      </div>

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
              const extraY = item.offsetY || 0;

              return (
                <div
                  key={item.id}
                  className={`absolute top-1/2 -translate-y-1/2 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg transition-all duration-300 ${
                    isLeft
                      ? 'left-8 sm:left-14 md:left-20 lg:left-28 text-left'
                      : 'right-12 sm:right-20 md:right-28 lg:right-36 text-right'
                  }`}
                  style={{
                    opacity,
                    transform: `translateY(calc(-50% + ${translateY + extraY}px))`,
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
              onClick={() => setIsAuthOpen(true)}
              className="inline-block px-8 py-3.5 rounded-full bg-white hover:bg-zinc-200 text-black font-semibold text-sm transition-all hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* Auth Modal Flow */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onGoToDashboard={onOpenDashboard}
      />
    </div>
  );
};




