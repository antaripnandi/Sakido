import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FrameCanvas } from './FrameCanvas';
import Lenis from 'lenis';
import { AuthModal } from './auth/AuthModal';
import { Footer } from './landing/Footer';
import { SpecularButton } from './ui/SpecularButton';
import { getSupabaseClient } from '../lib/supabaseClient';
import { User } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const TOTAL_SECTIONS = 7;

const FEATURE_CALLOUTS = [
  { id: 'notes', sectionIndex: 1, category: '01 / ORGANIZER', title: 'Notes', text: 'Write notes by course and semester.', align: 'left' as const },
  { id: 'calendar', sectionIndex: 2, category: '02 / SCHEDULE', title: 'Calendar', text: 'See your classes and deadlines. Connect Google Calendar if you want.', align: 'right' as const },
  { id: 'tasks-grades', sectionIndex: 3, category: '03 / ACADEMICS', title: 'Tasks & grades', text: 'Track assignments and calculate your grade.', align: 'left' as const },
  { id: 'knowledge-inbox', sectionIndex: 4, category: '04 / KNOWLEDGE', title: 'Knowledge Inbox', text: "Save a link — a video, article, or PDF — so you don't lose it. Share a YouTube link and it plays right on the page.", align: 'right' as const },
  { id: 'chat', sectionIndex: 5, category: '05 / COMMUNITY', title: 'Chat', text: 'Message people at your university, or join the global chat.', align: 'left' as const },
  { id: 'dashboard', sectionIndex: 6, category: '06 / OVERVIEW', title: 'Dashboard', text: "Opens to today's classes and what's due next.", align: 'right' as const },
];

interface SakidoLandingPageProps {
  onOpenDashboard?: () => void;
}

export const SakidoLandingPage: React.FC<SakidoLandingPageProps> = ({ onOpenDashboard }) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email?: string; name?: string; avatarUrl?: string } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef<HTMLDivElement>(null);
  const frameObjRef = useRef({ value: 0 }); // Target object for GSAP tweening
  const frameRef = useRef<number>(0); // Driven by ScrollTrigger onUpdate, read by FrameCanvas
  const currentSectionRef = useRef(0);

  // Sync Supabase Auth Session
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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

    return () => subscription.unsubscribe();
  }, []);

  // GSAP ScrollTrigger Architecture Setup
  useEffect(() => {
    if (!containerRef.current || !pinnedRef.current) return;

    const ctx = gsap.context(() => {
      gsap.to(frameObjRef.current, {
        value: 239,
        ease: 'none',
        scrollTrigger: {
          trigger: containerRef.current,
          pin: pinnedRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.0, // Smooth 1.0s catchup scrub for slow, steady playback on any scroll speed
          onUpdate: (self) => {
            frameRef.current = frameObjRef.current.value;
            const newSection = Math.min(
              TOTAL_SECTIONS - 1,
              Math.max(0, Math.round(self.progress * (TOTAL_SECTIONS - 1)))
            );
            if (newSection !== currentSectionRef.current) {
              currentSectionRef.current = newSection;
              setCurrentSection(newSection);
            }
          },
        },
      });
    }, containerRef);

    // Refresh ScrollTrigger after layout stabilizes
    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);

    return () => {
      clearTimeout(timer);
      ctx.revert();
    };
  }, []);

  // Initialize Lenis smooth scroll with lerp damping & GSAP ticker sync
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      lerp: 0.09, // Damping lerp factor (0.09 for fluid, instant-catchup damping)
      smoothWheel: true,
    });

    lenis.on('scroll', ScrollTrigger.update);

    const updateLenis = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateLenis);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(updateLenis);
      lenis.destroy();
    };
  }, []);

  // Hide side scrollbar on front landing page
  useEffect(() => {
    document.body.classList.add('landing-page-active');
    return () => {
      document.body.classList.remove('landing-page-active');
    };
  }, []);

  return (
    <div className="bg-black text-white font-sans selection:bg-white selection:text-black overflow-x-hidden relative no-scrollbar">
      {/* Native Scroll Container (700dvh for 6 scroll intervals) */}
      <div ref={containerRef} className="h-[700dvh] relative w-full">
        {/* Pinned Viewport Container (Pinned by GSAP ScrollTrigger) */}
        <div ref={pinnedRef} className="h-[100dvh] w-full overflow-hidden relative">
          {/* Header Action Bar */}
          <div className="fixed top-5 right-6 z-50 flex items-center gap-3">
            {currentUser ? (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="group px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 hover:border-zinc-600 text-xs text-zinc-200 flex items-center gap-2.5 transition-all shadow-md backdrop-blur-md cursor-pointer hover:bg-zinc-800"
              >
                <div className="w-6 h-6 rounded-full bg-black border border-[#444748] flex items-center justify-center text-white overflow-hidden shrink-0 shadow-inner">
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt="User Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
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

          {/* Canvas Background Layer */}
          <div className="absolute inset-0 z-10 w-full h-full pointer-events-none">
            <FrameCanvas frameRef={frameRef} totalFrames={240} className="w-full h-full" />
          </div>

          {/* UI Content Overlays */}
          <div className="absolute inset-0 z-20 pointer-events-none" aria-live="polite">
            {/* Hero Section */}
            <div
              aria-hidden={currentSection !== 0}
              className={`absolute inset-0 flex flex-col justify-between items-center pt-24 sm:pt-32 pb-12 px-6 sm:px-12 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
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

            {/* Feature Callouts */}
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
                  aria-hidden={!isCurrent}
                  className={`absolute top-1/2 p-5 sm:p-8 md:p-10 max-w-[calc(100vw-2.5rem)] sm:max-w-md lg:max-w-lg transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isCurrent ? 'pointer-events-auto' : 'pointer-events-none'
                  } ${
                    isLeft
                      ? 'left-5 sm:left-12 md:left-16 lg:left-24 text-left'
                      : 'right-5 sm:right-12 md:right-16 lg:right-24 text-left sm:text-right'
                  } bg-black/55 sm:bg-transparent backdrop-blur-lg sm:backdrop-blur-none rounded-2xl sm:rounded-none border border-white/15 sm:border-none shadow-2xl sm:shadow-none`}
                  style={{ opacity: opacityStyle, transform: transformStyle }}
                >
                  <span className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-white font-mono font-bold mb-1.5 block">
                    {item.category}
                  </span>
                  <h2 className="font-display text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-2 leading-tight drop-shadow-md">
                    {item.title}
                  </h2>
                  <p className="text-xs sm:text-base md:text-lg font-sans text-zinc-200/90 font-normal tracking-normal leading-relaxed text-balance">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Separated Final CTA Section (Below 3D Frame Sequence) */}
      <section className="relative z-30 min-h-screen bg-black flex flex-col items-center justify-center px-6 py-24 border-t border-zinc-900 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="font-display text-5xl sm:text-7xl md:text-8xl font-extrabold tracking-tight text-white leading-none">
            Everything school.<br className="hidden sm:inline" /> One app.
          </h2>
          <p className="text-zinc-400 text-base sm:text-xl font-sans max-w-xl mx-auto font-normal leading-relaxed">
            Notes, calendar, tasks, saved links, and university chat — all unified in one essentialist academic platform.
          </p>
          <div className="pt-4 flex justify-center">
            <SpecularButton
              size="lg"
              radius={24}
              tint="#ffffff"
              tintOpacity={0.08}
              blur={10}
              textColor="#ffffff"
              lineColor="#ffffff"
              baseColor="#525252"
              intensity={1.2}
              shineSize={12}
              shineFade={40}
              thickness={1.5}
              speed={0.35}
              followMouse
              proximity={250}
              autoAnimate={false}
              onClick={() => (currentUser && onOpenDashboard ? onOpenDashboard() : setIsAuthOpen(true))}
            >
              {currentUser ? 'Open Dashboard' : 'Get Started'}
            </SpecularButton>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer onOpenGetStarted={() => setIsAuthOpen(true)} />

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onGoToDashboard={onOpenDashboard} />
    </div>
  );
};
