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
      // Make everything visible statically
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
          // Snappier on mobile to keep animation from lagging behind touch
          scrub: isMobile ? 0.5 : 1.0,
          onUpdate: (self) => {
            const progress = self.progress;

            // Drive canvas frame
            frameRef.current = frameObjRef.current.value;

            // Update React section state only on boundary crossings (for aria-hidden)
            const newSection = Math.min(
              TOTAL_SECTIONS - 1,
              Math.max(0, Math.round(progress * (TOTAL_SECTIONS - 1)))
            );
            if (newSection !== currentSectionRef.current) {
              currentSectionRef.current = newSection;
              setCurrentSection(newSection);
            }

            // --- Direct DOM writes — no React re-renders ---

            // Hero: fade + slide up as scroll leaves section 0
            if (heroRef.current) {
              const heroOpacity = clamp(1 - progress * 8, 0, 1);
              const heroY = progress * -120;
              heroRef.current.style.opacity = String(heroOpacity);
              heroRef.current.style.transform = `translateY(${heroY}px)`;
            }

// Feature callouts: each eases in from below, out above, linked to progress
            const sectionWidth = 1 / (TOTAL_SECTIONS - 1);
            calloutRefs.current.forEach((el, i) => {
              if (!el) return;
              const sectionIndex = FEATURE_CALLOUTS[i].sectionIndex;
              const center = sectionIndex * sectionWidth;
              const t = (progress - center) / sectionWidth; // -1..0..1

              const opacity = clamp(1 - Math.abs(t) * 2.5, 0, 1);
              // On mobile: opacity-only (avoids composite-layer jank from translateY)
              const translateY = isMobile ? -50 : -50 + t * -60;

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

  // Lenis smooth scroll — already guards prefers-reduced-motion
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

          {/* Canvas vignette overlay — darkens subtly as hero exits (scroll-driven) */}
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
              className={`absolute inset-0 flex flex-col justify-between items-center pt-24 sm:pt-32 pb-12 px-6 sm:px-12 landing-callout ${
                currentSection === 0 ? 'pointer-events-auto' : 'pointer-events-none'
              }`}
              style={{ opacity: 1, transform: 'translateY(0)' }}
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
            {FEATURE_CALLOUTS.map((item, i) => {
              const isCurrent = currentSection === item.sectionIndex;
              const isLeft = item.align === 'left';

              return (
                <div
                  key={item.id}
                  ref={(el) => { calloutRefs.current[i] = el; }}
                  aria-hidden={!isCurrent}
                  className={`landing-callout absolute top-1/2 p-5 sm:p-8 md:p-10 max-w-[calc(100vw-2.5rem)] sm:max-w-md lg:max-w-lg ${
                    isCurrent ? 'pointer-events-auto' : 'pointer-events-none'
                  } ${
                    isLeft
                      ? 'left-5 sm:left-12 md:left-16 lg:left-24 text-left'
                      : 'right-5 sm:right-12 md:right-16 lg:right-24 text-left sm:text-right'
                  } bg-black/55 sm:bg-transparent backdrop-blur-lg sm:backdrop-blur-none rounded-2xl sm:rounded-none border border-white/15 sm:border-none shadow-2xl sm:shadow-none`}
                  style={{ opacity: 0, transform: 'translateY(calc(-50% + 80px))' }}
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

      {/* Final CTA Section — fades in via IntersectionObserver */}
      <section
        ref={ctaRef}
        className="cta-section relative z-30 min-h-screen bg-black flex flex-col items-center justify-center px-6 py-24 border-t border-zinc-900 text-center"
      >
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
