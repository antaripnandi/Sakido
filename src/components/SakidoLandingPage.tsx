import React, { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { Observer } from 'gsap/Observer';
import { FrameCanvas } from './FrameCanvas';
import { AuthModal } from './auth/AuthModal';
import { getSupabaseClient } from '../lib/supabaseClient';
import { User, ArrowRight, Sparkles } from 'lucide-react';

gsap.registerPlugin(ScrollToPlugin, Observer);

/**
 * =========================================================================
 * FRAME MAP — 240 frames across 7 main sections + 1 solid black CTA section
 *
 * Each frame section snaps to a specific "rest frame" representing that feature:
 *  Section 0 — Hero "Sakido"           → Frame 0   (bag closed, front view)
 *  Section 1 — Notes                   → Frame 40  (straps unbuckled, flap opening)
 *  Section 2 — Calendar                → Frame 80  (bag opening wider, laptop visible)
 *  Section 3 — Tasks & Grades          → Frame 120 (items emerging from backpack)
 *  Section 4 — Knowledge Inbox         → Frame 160 (items fully spread out)
 *  Section 5 — Chat                    → Frame 200 (items settled into layout)
 *  Section 6 — Dashboard               → Frame 239 (final frame state)
 *  Section 7 — Final CTA               → Frame 239 + Solid black background cover
 * =========================================================================
 */

const SECTION_FRAMES = [0, 40, 80, 120, 160, 200, 239];
const TOTAL_SECTIONS = 8; // 7 frame sections + 1 solid black CTA section
const COOLDOWN_MS = 600; // Cooldown timer to prevent spam-scrolling and glitches
const FRAME_ANIM_DURATION = 0.65; // Snappy, clean transition between frame checkpoints

const FEATURE_CALLOUTS = [
  {
    id: 'notes',
    sectionIndex: 1,
    category: '01 / ORGANIZER',
    title: 'Notes',
    text: 'Write notes by course and semester.',
    align: 'left' as const,
  },
  {
    id: 'calendar',
    sectionIndex: 2,
    category: '02 / SCHEDULE',
    title: 'Calendar',
    text: 'See your classes and deadlines. Connect Google Calendar if you want.',
    align: 'right' as const,
  },
  {
    id: 'tasks-grades',
    sectionIndex: 3,
    category: '03 / ACADEMICS',
    title: 'Tasks & grades',
    text: 'Track assignments and calculate your grade.',
    align: 'left' as const,
  },
  {
    id: 'knowledge-inbox',
    sectionIndex: 4,
    category: '04 / KNOWLEDGE',
    title: 'Knowledge Inbox',
    text: "Save a link — a video, article, or PDF — so you don't lose it. Share a YouTube link and it plays right on the page.",
    align: 'right' as const,
  },
  {
    id: 'chat',
    sectionIndex: 5,
    category: '05 / COMMUNITY',
    title: 'Chat',
    text: 'Message people at your university, or join the global chat.',
    align: 'left' as const,
  },
  {
    id: 'dashboard',
    sectionIndex: 6,
    category: '06 / OVERVIEW',
    title: 'Dashboard',
    text: "Opens to today's classes and what's due next.",
    align: 'right' as const,
  },
];

interface SakidoLandingPageProps {
  onOpenDashboard?: () => void;
}

export const SakidoLandingPage: React.FC<SakidoLandingPageProps> = ({ onOpenDashboard }) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [displayFrame, setDisplayFrame] = useState(0);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email?: string; name?: string; avatarUrl?: string } | null>(null);

  // Refs for animation state & cooldown locking
  const currentSectionRef = useRef(0);
  const isCoolingDown = useRef(false);
  const frameAnimRef = useRef<gsap.core.Tween | null>(null);
  const frameObjRef = useRef({ value: 0 });

  // Sync Supabase Auth session
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

  /**
   * Transition to a specific section index.
   * Smoothly animates canvas frames or reveals the final CTA section.
   */
  const goToSection = useCallback(
    (targetIndex: number) => {
      const clamped = Math.max(0, Math.min(TOTAL_SECTIONS - 1, targetIndex));
      if (clamped === currentSectionRef.current) return;

      if (frameAnimRef.current) {
        frameAnimRef.current.kill();
      }

      currentSectionRef.current = clamped;
      setCurrentSection(clamped);

      // If transitioning to Section 7 (CTA), hold frame at 239
      const targetFrame = clamped < SECTION_FRAMES.length ? SECTION_FRAMES[clamped] : 239;

      frameAnimRef.current = gsap.to(frameObjRef.current, {
        value: targetFrame,
        duration: FRAME_ANIM_DURATION,
        ease: 'power2.inOut',
        onUpdate: () => {
          setDisplayFrame(frameObjRef.current.value);
        },
      });

      // Activate cooldown lock to prevent spam-scrolling
      isCoolingDown.current = true;
      setTimeout(() => {
        isCoolingDown.current = false;
      }, COOLDOWN_MS);
    },
    []
  );

  // Intercept wheel/touch/pointer gestures using GSAP Observer
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const observer = Observer.create({
      type: 'wheel,touch,pointer',
      preventDefault: true,
      wheelSpeed: -1,
      onUp: () => {
        if (isCoolingDown.current) return;
        const next = currentSectionRef.current + 1;
        if (next < TOTAL_SECTIONS) {
          goToSection(next);
        }
      },
      onDown: () => {
        if (isCoolingDown.current) return;
        const prev = currentSectionRef.current - 1;
        if (prev >= 0) {
          goToSection(prev);
        }
      },
      tolerance: 12, // Sensitivity threshold in px to ignore stray micro-touches
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCoolingDown.current) return;

      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        const next = currentSectionRef.current + 1;
        if (next < TOTAL_SECTIONS) goToSection(next);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        const prev = currentSectionRef.current - 1;
        if (prev >= 0) goToSection(prev);
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToSection(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        goToSection(TOTAL_SECTIONS - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      observer.kill();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [goToSection]);

  // Compute Hero title opacity
  const heroOpacity = currentSection === 0 ? 1 : Math.max(0, 1 - (displayFrame / SECTION_FRAMES[1]));
  const heroY = (1 - heroOpacity) * -24;

  // Compute callout visibility per section
  const getCalloutOpacity = (sectionIndex: number): number => {
    if (currentSection === sectionIndex) return 1;
    if (currentSection === 7) return 0; // Hide callouts when final CTA is up

    const targetFrame = SECTION_FRAMES[sectionIndex];
    const dist = Math.abs(displayFrame - targetFrame);
    const range = 25;
    if (dist > range) return 0;
    return 1 - dist / range;
  };

  const getCalloutY = (sectionIndex: number): number => {
    const targetFrame = SECTION_FRAMES[sectionIndex];
    const diff = displayFrame - targetFrame;
    if (Math.abs(diff) > 25) return diff > 0 ? -20 : 20;
    return (diff / 25) * -20;
  };

  return (
    <div className="bg-black text-white min-h-screen font-sans selection:bg-white selection:text-black overflow-hidden relative">
      {/* Top Floating User / Action Bar */}
      <div className="fixed top-5 right-6 z-50 flex items-center gap-3">
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

      {/* Section indicator dots (8 sections total) */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2.5">
        {Array.from({ length: TOTAL_SECTIONS }).map((_, i) => (
          <button
            key={i}
            onClick={() => goToSection(i)}
            className={`w-2 h-2 rounded-full transition-all duration-500 cursor-pointer ${
              currentSection === i
                ? 'bg-white scale-125 shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                : 'bg-zinc-600 hover:bg-zinc-400 scale-100'
            }`}
            aria-label={`Go to section ${i + 1}`}
          />
        ))}
      </div>

      {/* Full-screen Canvas Background (Frames 0 to 239) */}
      <div className="fixed inset-0 z-10 w-full h-full pointer-events-none">
        <FrameCanvas
          currentFrame={displayFrame}
          totalFrames={240}
          onPreloadProgress={setPreloadProgress}
          className="w-full h-full"
        />
      </div>

      {/* ====== CONTENT OVERLAYS FOR FRAMES (Sections 0 to 6) ====== */}
      <div className="fixed inset-0 z-20 pointer-events-none">
        {/* Hero Title (Section 0) */}
        <div
          className="absolute inset-0 flex flex-col justify-between items-center pt-24 sm:pt-32 pb-12 px-6 sm:px-12 transition-all duration-300"
          style={{
            opacity: heroOpacity,
            transform: `translateY(${heroY}px)`,
            pointerEvents: currentSection === 0 ? 'auto' : 'none',
          }}
        >
          <div className="text-center max-w-3xl">
            <h1 className="text-6xl sm:text-8xl md:text-9xl font-extrabold tracking-tighter text-white drop-shadow-sm">
              Sakido
            </h1>
            <p className="mt-6 text-lg sm:text-2xl text-zinc-300 font-normal tracking-tight leading-relaxed max-w-2xl mx-auto">
              Notes, calendar, tasks, saved links, and chat — one app instead of five.
            </p>
          </div>

          <div className="text-center text-xs text-zinc-500 font-medium tracking-[0.2em] uppercase mb-6 animate-pulse">
            Scroll to unpack
          </div>
        </div>

        {/* Feature Callouts (Sections 1–6) */}
        {FEATURE_CALLOUTS.map((item) => {
          const opacity = getCalloutOpacity(item.sectionIndex);
          const translateY = getCalloutY(item.sectionIndex);
          const isLeft = item.align === 'left';

          if (opacity <= 0.01) return null;

          return (
            <div
              key={item.id}
              className={`absolute top-1/2 p-6 sm:p-12 md:p-16 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg transition-none pointer-events-auto ${
                isLeft
                  ? 'left-8 sm:left-14 md:left-20 lg:left-28 text-left'
                  : 'right-12 sm:right-20 md:right-28 lg:right-36 text-right'
              }`}
              style={{
                opacity,
                transform: `translateY(calc(-50% + ${translateY}px))`,
              }}
            >
              <span className="text-xs uppercase tracking-[0.25em] text-zinc-400 font-semibold mb-2 block">
                {item.category}
              </span>
              <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-3 leading-tight drop-shadow-sm">
                {item.title}
              </h2>
              <p className="text-base sm:text-xl lg:text-2xl text-zinc-300 font-normal tracking-tight leading-snug">
                {item.text}
              </p>
            </div>
          );
        })}
      </div>

      {/* ====== SECTION 7: FINAL CTA (Solid Black Background, Separated from Frames) ====== */}
      <div
        className={`fixed inset-0 z-40 bg-black flex flex-col items-center justify-between px-6 py-16 transition-transform duration-700 cubic-bezier(0.16, 1, 0.3, 1) ${
          currentSection === 7 ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none'
        }`}
      >
        <div className="w-full max-w-5xl flex justify-between items-center text-xs text-zinc-500 font-mono">
          <span>SAKIDO ACADEMIC SUITE</span>
          <span>READY WHEN YOU ARE</span>
        </div>

        <div className="text-center max-w-3xl my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
            <span>Simplify your entire academic life today</span>
          </div>
          
          <h2 className="text-5xl sm:text-7xl md:text-8xl font-extrabold tracking-tight text-white leading-none mb-6">
            One app instead of five.
          </h2>
          
          <p className="text-lg sm:text-2xl text-zinc-400 font-normal tracking-tight leading-relaxed max-w-xl mx-auto mb-10">
            Ditch the browser tabs and disconnected tools. Bring your classes, deadlines, links, and study partners into a single workspace.
          </p>

          <button
            onClick={() => {
              if (currentUser && onOpenDashboard) {
                onOpenDashboard();
              } else {
                setIsAuthOpen(true);
              }
            }}
            className="group px-8 py-4 rounded-full bg-white text-black font-semibold text-base hover:bg-zinc-200 transition-all duration-200 shadow-[0_0_30px_rgba(255,255,255,0.15)] flex items-center gap-3 mx-auto cursor-pointer"
          >
            <span>{currentUser ? 'Open Your Dashboard' : 'Get Started Now'}</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
          </button>
        </div>

        <div className="w-full max-w-5xl flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-zinc-600 font-mono border-t border-zinc-900/80 pt-6">
          <p>© {new Date().getFullYear()} Sakido. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <button onClick={() => goToSection(0)} className="hover:text-zinc-400 transition-colors cursor-pointer">
              Back to top ↑
            </button>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onGoToDashboard={onOpenDashboard}
      />
    </div>
  );
};
