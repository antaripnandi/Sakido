import React, { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { Observer } from 'gsap/Observer';
import { FrameCanvas } from './FrameCanvas';
import { AuthModal } from './auth/AuthModal';
import { getSupabaseClient } from '../lib/supabaseClient';
import { User } from 'lucide-react';

gsap.registerPlugin(ScrollToPlugin, Observer);

/**
 * =========================================================================
 * LETHARGY INERTIA DETECTION ENGINE
 *
 * Differentiates between intentional user-initiated scroll flicks and residual
 * trackpad momentum inertia decay to prevent double-scrolling without getting stuck.
 * =========================================================================
 */
class LethargyEngine {
  private deltas: number[] = [];
  private lastTime: number = Date.now();
  private isDecelerating: boolean = false;

  public check(deltaY: number): boolean {
    const now = Date.now();
    const absDelta = Math.abs(deltaY);

    // If user paused for 200ms+, reset inertia tracking state
    if (now - this.lastTime > 200) {
      this.deltas = [];
      this.isDecelerating = false;
    }
    this.lastTime = now;

    // Ignore tiny noise / jitter deltas
    if (absDelta < 6) {
      return false;
    }

    // Maintain rolling history of last 6 deltas
    this.deltas.push(absDelta);
    if (this.deltas.length > 6) {
      this.deltas.shift();
    }

    const sum = this.deltas.reduce((a, b) => a + b, 0);
    const avg = sum / this.deltas.length;

    // Trackpad momentum decay check: if current delta is lower than rolling average, it's inertia decay!
    if (absDelta < avg * 0.85) {
      this.isDecelerating = true;
      return false;
    }

    // If we were previously decelerating and current delta is still not a new spike, ignore
    if (this.isDecelerating && absDelta <= avg * 1.1) {
      return false;
    }

    // Fresh user scroll flick detected!
    this.isDecelerating = false;
    return true;
  }

  public reset() {
    this.deltas = [];
    this.isDecelerating = false;
  }
}

/**
 * =========================================================================
 * FRAME MAP — 240 frames across 7 main sections + 1 solid black CTA section
 * =========================================================================
 */

const SECTION_FRAMES = [0, 40, 80, 120, 160, 200, 239];
const TOTAL_SECTIONS = 8; // 7 frame sections + 1 solid black CTA section
const FRAME_ANIM_DURATION = 0.75; // Smooth frame transition duration

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

  const currentSectionRef = useRef(0);
  const isAnimating = useRef(false);
  const lethargyRef = useRef(new LethargyEngine());

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
   * Transition strictly to target section index.
   */
  const goToSection = useCallback(
    (targetIndex: number) => {
      const clamped = Math.max(0, Math.min(TOTAL_SECTIONS - 1, targetIndex));
      if (clamped === currentSectionRef.current || isAnimating.current) return;

      isAnimating.current = true;

      if (frameAnimRef.current) {
        frameAnimRef.current.kill();
      }

      currentSectionRef.current = clamped;
      setCurrentSection(clamped);

      const targetFrame = clamped < SECTION_FRAMES.length ? SECTION_FRAMES[clamped] : 239;

      frameAnimRef.current = gsap.to(frameObjRef.current, {
        value: targetFrame,
        duration: FRAME_ANIM_DURATION,
        ease: 'power2.inOut',
        onUpdate: () => {
          setDisplayFrame(frameObjRef.current.value);
        },
        onComplete: () => {
          isAnimating.current = false;
          lethargyRef.current.reset();
        },
      });
    },
    []
  );

  // GSAP Observer + Lethargy Inertia Filter
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const observer = Observer.create({
      type: 'wheel,touch,pointer',
      preventDefault: true,
      wheelSpeed: -1,
      onWheel: (e) => {
        if (isAnimating.current) return;

        // Check if current wheel event represents a fresh user flick vs trackpad momentum
        const isIntentional = lethargyRef.current.check(e.deltaY);
        if (!isIntentional) return;

        if (e.deltaY > 0) {
          const next = currentSectionRef.current + 1;
          if (next < TOTAL_SECTIONS) {
            goToSection(next);
          }
        } else if (e.deltaY < 0) {
          const prev = currentSectionRef.current - 1;
          if (prev >= 0) {
            goToSection(prev);
          }
        }
      },
      onUp: () => {
        // Touch gesture swipe up -> next section
        if (isAnimating.current) return;
        const next = currentSectionRef.current + 1;
        if (next < TOTAL_SECTIONS) {
          goToSection(next);
        }
      },
      onDown: () => {
        // Touch gesture swipe down -> prev section
        if (isAnimating.current) return;
        const prev = currentSectionRef.current - 1;
        if (prev >= 0) {
          goToSection(prev);
        }
      },
      tolerance: 10,
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnimating.current) return;

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

      {/* Full-screen Canvas Background */}
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
          className={`absolute inset-0 flex flex-col justify-between items-center pt-24 sm:pt-32 pb-12 px-6 sm:px-12 transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) ${
            currentSection === 0
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 -translate-y-24 pointer-events-none'
          }`}
        >
          <div className="text-center max-w-3xl">
            <h1 className="font-display text-6xl sm:text-8xl md:text-9xl font-extrabold tracking-tight text-white drop-shadow-md">
              Sakido
            </h1>
            <p className="mt-6 text-lg sm:text-2xl text-zinc-300 font-sans font-normal tracking-tight leading-relaxed max-w-2xl mx-auto">
              Notes, calendar, tasks, saved links, and chat — one app instead of five.
            </p>
          </div>

          <div className="text-center text-xs text-zinc-500 font-mono tracking-[0.2em] uppercase mb-6">
            Scroll to unpack
          </div>
        </div>

        {/* Feature Callouts (Sections 1–6) */}
        {FEATURE_CALLOUTS.map((item) => {
          const isCurrent = currentSection === item.sectionIndex;
          const isPassed = currentSection > item.sectionIndex;

          const isLeft = item.align === 'left';

          let transformStyle = 'translateY(calc(-50% + 80px))';
          let opacityStyle = 0;

          if (isCurrent) {
            transformStyle = 'translateY(-50%)';
            opacityStyle = 1;
          } else if (isPassed) {
            transformStyle = 'translateY(calc(-50% - 80px))';
            opacityStyle = 0;
          }

          return (
            <div
              key={item.id}
              className={`absolute top-1/2 p-4 sm:p-8 md:p-12 max-w-sm sm:max-w-md lg:max-w-lg transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) ${
                isCurrent ? 'pointer-events-auto' : 'pointer-events-none'
              } ${
                isLeft
                  ? 'left-6 sm:left-12 md:left-16 lg:left-24 text-left'
                  : 'right-6 sm:right-12 md:right-16 lg:right-24 text-right'
              }`}
              style={{
                opacity: opacityStyle,
                transform: transformStyle,
              }}
            >
              <span className="text-xs uppercase tracking-[0.2em] text-zinc-400 font-mono font-semibold mb-2 block">
                {item.category}
              </span>
              <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-3 leading-[1.1] drop-shadow-md">
                {item.title}
              </h2>
              <p className="text-sm sm:text-lg md:text-xl font-sans text-zinc-300 font-normal tracking-tight leading-relaxed">
                {item.text}
              </p>
            </div>
          );
        })}
      </div>

      {/* ====== SECTION 7: FINAL CTA (Older style with Syne Title) ====== */}
      <div
        className={`fixed inset-0 z-40 bg-black flex flex-col items-center justify-center px-6 py-12 transition-transform duration-700 cubic-bezier(0.16, 1, 0.3, 1) ${
          currentSection === 7 ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none'
        }`}
      >
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="font-display text-5xl sm:text-7xl font-extrabold tracking-tight text-white leading-none">
            Everything school. One app.
          </h2>

          <div className="pt-6">
            <button
              onClick={() => {
                if (currentUser && onOpenDashboard) {
                  onOpenDashboard();
                } else {
                  setIsAuthOpen(true);
                }
              }}
              className="inline-block px-8 py-3.5 rounded-full bg-white hover:bg-zinc-200 text-black font-semibold text-sm transition-all hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
            >
              {currentUser ? 'Open Dashboard' : 'Get Started'}
            </button>
          </div>
        </div>
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
