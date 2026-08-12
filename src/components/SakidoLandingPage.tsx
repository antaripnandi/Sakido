import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FrameCanvas } from './FrameCanvas';
import Lenis from 'lenis';
import { AuthModal } from './auth/AuthModal';
import { Footer } from './landing/Footer';
import { SakidoLogo } from './common/SakidoLogo';
import { getSupabaseClient } from '../lib/supabaseClient';
import { User } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const TOTAL_SECTIONS = 7;

const FEATURE_CALLOUTS = [
  { id: 'notes', sectionIndex: 1, category: '01 / ORGANIZER', title: 'Notes', text: 'Write notes by course and semester.', align: 'left' as const },
  { id: 'calendar', sectionIndex: 2, category: '02 / SCHEDULE', title: 'Calendar', text: 'See your classes and deadlines. Connect Google Calendar if you want.', align: 'right' as const },
  { id: 'tasks-grades', sectionIndex: 3, category: '03 / ACADEMICS', title: 'Tasks & grades', text: 'Track assignments and calculate your grade.', align: 'left' as const },
  { id: 'knowledge-inbox', sectionIndex: 4, category: '04 / KNOWLEDGE', title: 'Knowledge Inbox', text: "Save a link — a video, article, or PDF — so you don't lose it. Share a YouTube link and it plays right on the page.", align: 'right' as const },
  { id: 'flashcards', sectionIndex: 5, category: '05 / RECALL', title: 'Flashcards', text: 'Spaced repetition flashcards with SM-2 algorithm to master exams.', align: 'left' as const },
  { id: 'dashboard', sectionIndex: 6, category: '06 / OVERVIEW', title: 'Dashboard', text: "Opens to today's classes and what's due next.", align: 'right' as const },
];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface SakidoLandingPageProps {
  onOpenDashboard?: () => void;
}

export const SakidoLandingPage: React.FC<SakidoLandingPageProps> = ({ onOpenDashboard }) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email?: string; name?: string; avatarUrl?: string } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef<HTMLDivElement>(null);
  const frameObjRef = useRef({ value: 0 });
  const frameRef = useRef<number>(0);
  const currentSectionRef = useRef(0);

  // Refs for scroll-progress-driven DOM writes (no React re-renders on scroll)
  const heroRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const calloutRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ctaRef = useRef<HTMLElement>(null);

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

  // GSAP ScrollTrigger + scroll-progress-driven animations
  useEffect(() => {
    if (!containerRef.current || !pinnedRef.current) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth <= 768;

    // Reduced-motion: skip all pinning/animation — page is a normal static scroll
    if (prefersReducedMotion) {
      if (heroRef.current) {
        heroRef.current.style.opacity = '1';
        heroRef.current.style.transform = 'translateY(0)';
      }
      calloutRefs.current.forEach((el) => {
        if (el) {
          el.style.opacity = '1';
          el.style.transform = 'translateY(-50%)';
        }
      });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.to(frameObjRef.current, {
        value: 239,
        ease: 'none',
        scrollTrigger: {
          trigger: containerRef.current,
          pin: pinnedRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: isMobile ? 0.5 : 1.2,
          onUpdate: (self) => {
            const progress = self.progress;

            frameRef.current = frameObjRef.current.value;

            const newSection = Math.min(
              TOTAL_SECTIONS - 1,
              Math.max(0, Math.round(progress * (TOTAL_SECTIONS - 1)))
            );
            if (newSection !== currentSectionRef.current) {
              currentSectionRef.current = newSection;
              setCurrentSection(newSection);
            }

            if (heroRef.current) {
              const heroOpacity = clamp(1 - progress * 8, 0, 1);
              const heroY = progress * -120;
              heroRef.current.style.opacity = String(heroOpacity);
              heroRef.current.style.transform = `translateY(${heroY}px)`;
            }

            const sectionWidth = 1 / (TOTAL_SECTIONS - 1);
            calloutRefs.current.forEach((el, i) => {
              if (!el) return;
              const sectionIndex = FEATURE_CALLOUTS[i].sectionIndex;
              const center = sectionIndex * sectionWidth;
              const t = (progress - center) / sectionWidth;

              const opacity = Math.pow(clamp(1 - Math.abs(t) * 2.2, 0, 1), 1.2);
              const translateY = isMobile ? -50 : -50 + t * -40;

              el.style.opacity = String(opacity);
              el.style.transform = `translateY(${translateY}%)`;
            });
          },
        },
      });
    }, containerRef);

    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);

    return () => {
      clearTimeout(timer);
      ctx.revert();
    };
  }, []);

  // Lenis smooth scroll
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      lerp: 0.09,
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

  // CTA section — IntersectionObserver fade-in
  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('in-view');
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Hide side scrollbar on landing page
  useEffect(() => {
    document.body.classList.add('landing-page-active');
    return () => {
      document.body.classList.remove('landing-page-active');
    };
  }, []);

  return (
    <div className="bg-black text-white font-sans selection:bg-white selection:text-black overflow-x-hidden relative no-scrollbar">
      {/* Native Scroll Container */}
      <div ref={containerRef} className="h-[700dvh] relative w-full">
        {/* Pinned Viewport Container */}
        <div ref={pinnedRef} className="h-[100dvh] w-full overflow-hidden relative">
          {/* Header Action Bar */}
          <div className="fixed top-5 left-6 right-6 z-50 flex items-center justify-between pointer-events-auto">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2.5 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-xl p-1.5 -m-1.5 bg-black/40 backdrop-blur-md border border-white/10 hover:border-white/20 transition-all"
              title="Sakido Home"
            >
              <SakidoLogo size="w-7 h-7" showText textClassName="font-display text-lg font-bold text-white tracking-tight group-hover:text-zinc-200 transition-colors" forceInvert />
            </button>

            <div className="flex items-center gap-3">
              {currentUser ? (
                <button
                  onClick={() => {
                    if (onOpenDashboard) onOpenDashboard();
                  }}
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
          </div>

          {/* Canvas Background Layer */}
          <div className="absolute inset-0 z-10 w-full h-full pointer-events-none">
            <FrameCanvas frameRef={frameRef} totalFrames={240} className="w-full h-full" />
          </div>

          {/* Canvas vignette overlay */}
          <div
            ref={overlayRef}
            className="absolute inset-0 z-[15] bg-black pointer-events-none"
            style={{ opacity: 0 }}
            aria-hidden="true"
          />

          {/* UI Content Overlays */}
          <div className="absolute inset-0 z-20 pointer-events-none" aria-live="polite">
            {/* Hero Section */}
            <div
              ref={heroRef}
              aria-hidden={currentSection !== 0}
              className={`absolute inset-0 flex flex-col justify-between items-center pt-24 sm:pt-32 pb-12 px-6 sm:px-12 landing-callout ${currentSection === 0 ? 'pointer-events-auto' : 'pointer-events-none'
                }`}
              style={{ opacity: 1, transform: 'translateY(0)' }}
            >
              <div className="text-center max-w-3xl">
                <h1 className="font-display text-6xl sm:text-8xl md:text-9xl font-extrabold tracking-tight text-white drop-shadow-md">
                  Sakido
                </h1>
                <p className="mt-6 text-lg sm:text-2xl text-zinc-300 font-sans font-normal tracking-tight leading-relaxed max-w-2xl mx-auto">
                  Notes, calendar, tasks, flashcards, and saved links — one app instead of five.
                </p>
              </div>
              <div className="text-center text-xs text-zinc-500 font-mono tracking-[0.2em] uppercase mb-6">
                Scroll to unpack
              </div>
            </div>

            {/* Feature Callouts */}
            {FEATURE_CALLOUTS.map((item, i) => {
              const isLeft = item.align === 'left';
              const isActive = currentSection === item.sectionIndex;
              return (
                <div
                  key={item.id}
                  ref={(el) => { calloutRefs.current[i] = el; }}
                  aria-hidden={!isActive}
                  className={`absolute top-1/2 -translate-y-1/2 w-full px-6 sm:px-16 md:px-24 flex ${
                    isLeft ? 'justify-start' : 'justify-end'
                  } landing-callout ${isActive ? 'pointer-events-auto' : 'pointer-events-none'}`}
                  style={{ opacity: 0 }}
                >
                  <div className={`max-w-md sm:max-w-lg space-y-2.5 ${isLeft ? 'text-left' : 'text-left sm:text-right'}`}>
                    <span className="text-[11px] sm:text-xs font-mono text-zinc-400 tracking-[0.25em] uppercase font-bold block">
                      {item.category}
                    </span>
                    <h2 className="font-display text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-none drop-shadow-xl">
                      {item.title}
                    </h2>
                    <p className="text-sm sm:text-lg text-zinc-200/90 font-sans font-normal leading-relaxed text-balance drop-shadow-md">
                      {item.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <section
        ref={ctaRef}
        className="relative z-30 min-h-screen bg-black flex flex-col items-center justify-center px-6 py-24 border-t border-zinc-900 text-center transition-opacity duration-700 opacity-0 [.in-view&]:opacity-100"
      >
        <div className="max-w-3xl mx-auto space-y-8 flex flex-col items-center">
          <h2 className="font-display text-5xl sm:text-7xl md:text-8xl font-extrabold tracking-tight text-white leading-none">
            Everything school.<br className="hidden sm:inline" /> One app.
          </h2>
          <p className="text-zinc-400 text-base sm:text-xl font-sans max-w-xl mx-auto font-normal leading-relaxed">
            Notes, calendar, tasks, flashcards, and saved links — all unified in one essentialist academic platform.
          </p>
          <div className="pt-4 flex justify-center">
            <button
              onClick={() => (currentUser && onOpenDashboard ? onOpenDashboard() : setIsAuthOpen(true))}
              className="px-8 py-3.5 rounded-full bg-white hover:bg-zinc-200 text-black font-bold text-sm transition-all shadow-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {currentUser ? 'Go to Workspace →' : 'Get Started →'}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
};
