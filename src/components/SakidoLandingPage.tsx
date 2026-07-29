import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { Observer } from 'gsap/Observer';
import { FrameCanvas } from './FrameCanvas';
import { AuthModal } from './auth/AuthModal';
import { getSupabaseClient } from '../lib/supabaseClient';
import { User } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, Observer);

/**
 * =========================================================================
 * FEATURE CALLOUTS
 * 6 Main Product Sections
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
  },
  {
    id: 'calendar',
    step: 2,
    category: '02 / SCHEDULE',
    title: 'Calendar',
    text: 'See your classes and deadlines. Connect Google Calendar if you want.',
    align: 'right',
  },
  {
    id: 'tasks-grades',
    step: 3,
    category: '03 / ACADEMICS',
    title: 'Tasks & grades',
    text: 'Track assignments and calculate your grade.',
    align: 'left',
  },
  {
    id: 'knowledge-inbox',
    step: 4,
    category: '04 / KNOWLEDGE',
    title: 'Knowledge Inbox',
    text: "Save a link — a video, article, or PDF — so you don't lose it. Share a YouTube link and it plays right on the page.",
    align: 'right',
  },
  {
    id: 'chat',
    step: 5,
    category: '05 / COMMUNITY',
    title: 'Chat',
    text: 'Message people at your university, or join the global chat.',
    align: 'left',
  },
  {
    id: 'dashboard',
    step: 6,
    category: '06 / OVERVIEW',
    title: 'Dashboard',
    text: "Opens to today's classes and what's due next.",
    align: 'right',
  },
];

interface SakidoLandingPageProps {
  onOpenDashboard?: () => void;
}

export const SakidoLandingPage: React.FC<SakidoLandingPageProps> = ({ onOpenDashboard }) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const [targetFrame, setTargetFrame] = useState<number>(0);
  const [displayFrame, setDisplayFrame] = useState<number>(0);
  const [preloadProgress, setPreloadProgress] = useState<number>(0);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{ email?: string; name?: string; avatarUrl?: string } | null>(null);

  // Sync Supabase Auth session on mount and upon auth change
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

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

  // Overall scroll progress -> 3D Canvas Frame synchronization
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const st = ScrollTrigger.create({
      trigger: container,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        const frame = Math.min(239, Math.max(0, self.progress * 239));
        setTargetFrame(frame);
      },
    });

    return () => {
      st.kill();
    };
  }, []);

  // Apple-style GSAP Observer + ScrollToPlugin section snapping with isSnapping lock & momentum cooldown
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let observerInstance: Observer | null = null;
    let cleanupKeydown: (() => void) | undefined;

    const setupSnapping = () => {
      if (observerInstance) {
        observerInstance.kill();
        observerInstance = null;
      }
      if (cleanupKeydown) {
        cleanupKeydown();
        cleanupKeydown = undefined;
      }

      // Requirement 1: Disable snapping if reduced motion is preferred
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }

      const sections = gsap.utils.toArray<HTMLElement>('.snap-section');
      if (!sections.length) return;

      let currentIndex = 0;
      let isSnapping = false; // THE CRITICAL FIX: prevents overlapping snaps
      let lastSnapEndTime = 0;
      const INERTIA_COOLDOWN_MS = 450; // Buffer after snap completes to ignore trackpad inertia

      // Keep currentIndex in sync with initial or restored scroll position
      const currentScrollY = window.scrollY;
      const viewportHeight = window.innerHeight;
      if (viewportHeight > 0) {
        currentIndex = Math.min(
          sections.length - 1,
          Math.max(0, Math.round(currentScrollY / viewportHeight))
        );
      }

      const goToSection = (i: number) => {
        const targetIndex = Math.min(sections.length - 1, Math.max(0, i));
        if (isSnapping || targetIndex === currentIndex) return;
        isSnapping = true;
        currentIndex = targetIndex;

        gsap.to(window, {
          scrollTo: { y: sections[targetIndex], autoKill: false },
          duration: 0.8,
          ease: 'power2.inOut',
          onComplete: () => {
            isSnapping = false;
            lastSnapEndTime = Date.now();
          },
        });
      };

      // 1. Observer for Wheel, Touch, and Pointer gestures with trackpad inertia protection
      observerInstance = Observer.create({
        target: window,
        type: 'wheel,touch,pointer',
        wheelSpeed: -1,
        tolerance: 20,
        preventDefault: true,
        onUp: () => {
          const now = Date.now();
          if (
            !isSnapping &&
            now - lastSnapEndTime > INERTIA_COOLDOWN_MS &&
            currentIndex < sections.length - 1
          ) {
            goToSection(currentIndex + 1);
          }
        },
        onDown: () => {
          const now = Date.now();
          if (!isSnapping && now - lastSnapEndTime > INERTIA_COOLDOWN_MS && currentIndex > 0) {
            goToSection(currentIndex - 1);
          }
        },
      });

      // 2. Keyboard Navigation handling (Page Down, Page Up, Arrow keys, Space)
      const handleKeyDown = (e: KeyboardEvent) => {
        if (isSnapping) return;

        // Ignore keyboard scroll triggers if focused on an input/textarea
        const activeElem = document.activeElement;
        if (
          activeElem &&
          (activeElem.tagName === 'INPUT' ||
            activeElem.tagName === 'TEXTAREA' ||
            (activeElem as HTMLElement).isContentEditable)
        ) {
          return;
        }

        if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
          if (currentIndex < sections.length - 1) {
            e.preventDefault();
            goToSection(currentIndex + 1);
          }
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
          if (currentIndex > 0) {
            e.preventDefault();
            goToSection(currentIndex - 1);
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      cleanupKeydown = () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    };

    setupSnapping();

    const handleMotionChange = () => {
      setupSnapping();
    };

    mediaQuery.addEventListener('change', handleMotionChange);

    return () => {
      if (observerInstance) {
        observerInstance.kill();
      }
      if (cleanupKeydown) {
        cleanupKeydown();
      }
      mediaQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  return (
    <div className="bg-black text-white min-h-screen font-sans selection:bg-white selection:text-black">
      {/* Top Floating Buttons */}
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

      {/* Fixed Background 3D Canvas */}
      <div className="fixed inset-0 z-10 w-full h-full pointer-events-none">
        <FrameCanvas
          currentFrame={displayFrame}
          totalFrames={240}
          onPreloadProgress={setPreloadProgress}
          className="w-full h-full"
        />
      </div>

      {/* Main Snap Section Scroll Track */}
      <div ref={scrollContainerRef} className="relative z-20 w-full bg-transparent">
        {/* Section 0: Hero */}
        <section className="snap-section h-[100dvh] w-full relative flex flex-col justify-between items-center pt-16 sm:pt-24 pb-12 px-6 sm:px-12 pointer-events-none">
          <div className="mt-8 sm:mt-12 md:mt-16 text-center max-w-3xl pointer-events-auto transition-all duration-300 relative px-4">
            <h1 className="text-6xl sm:text-8xl md:text-9xl font-extrabold tracking-tighter text-white">
              Sakido
            </h1>
            <p className="mt-6 text-lg sm:text-2xl text-zinc-300 font-normal tracking-tight leading-relaxed max-w-2xl mx-auto">
              Notes, calendar, tasks, saved links, and chat — one app instead of five.
            </p>
          </div>

          <div className="text-center text-xs text-zinc-500 font-medium tracking-[0.2em] uppercase pointer-events-none transition-opacity duration-300 mb-6">
            Scroll to unpack
          </div>
        </section>

        {/* Feature Callout Sections (1 through 6) */}
        {FEATURE_CALLOUTS.map((item) => {
          const isLeft = item.align === 'left';
          return (
            <section
              key={item.id}
              id={item.id}
              className="snap-section h-[100dvh] w-full relative flex items-center p-6 sm:p-12 md:p-16 pointer-events-none"
            >
              <div
                className={`w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg pointer-events-auto transition-all duration-300 ${
                  isLeft
                    ? 'mr-auto text-left pl-4 sm:pl-10 md:pl-16 lg:pl-24'
                    : 'ml-auto text-right pr-4 sm:pr-10 md:pr-16 lg:pr-24'
                }`}
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
            </section>
          );
        })}

        {/* Section 7: Closing CTA Section */}
        <section className="snap-section h-[100dvh] w-full relative flex items-center justify-center bg-black/80 backdrop-blur-sm py-28 sm:py-40 px-6 text-center border-t border-zinc-900 pointer-events-auto">
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
      </div>

      {/* Auth Modal Flow */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onGoToDashboard={onOpenDashboard}
      />
    </div>
  );
};




