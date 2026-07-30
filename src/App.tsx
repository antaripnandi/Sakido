import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { SakidoLandingPage } from './components/SakidoLandingPage';
import { LegalPage } from './components/legal/LegalPage';
import { getSupabaseClient } from './lib/supabaseClient';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

const SakidoDashboard = lazy(() =>
  import('./components/dashboard/SakidoDashboard').then((module) => ({
    default: module.SakidoDashboard,
  }))
);

function AppContent() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<{
    email?: string;
    name?: string;
    avatarUrl?: string;
    id?: string;
  } | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setIsAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const u = data.session.user;
        setCurrentUser({
          id: u.id,
          email: u.email,
          name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0],
          avatarUrl: u.user_metadata?.avatar_url || u.user_metadata?.picture,
        });
      }
      setIsAuthLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const u = session.user;
        setCurrentUser({
          id: u.id,
          email: u.email,
          name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0],
          avatarUrl: u.user_metadata?.avatar_url || u.user_metadata?.picture,
        });
      } else {
        setCurrentUser(null);
      }

      // Capture provider_refresh_token at the ONLY moment Supabase exposes it —
      // the SIGNED_IN event fired immediately after the OAuth redirect lands.
      // getSession() called anywhere later will return null for this field.
      // Guard: only write when it's actually present (won't overwrite on normal session restores).
      if (event === 'SIGNED_IN' && session?.provider_refresh_token) {
        supabase.from('google_tokens').upsert({
          user_id: session.user.id,
          refresh_token: session.provider_refresh_token,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' }).then(({ error }) => {
          if (error) console.warn('[auth] google_tokens upsert failed:', error.message);
          else console.log('[auth] provider_refresh_token saved for user', session.user.id);
        });
      } else if (event === 'SIGNED_IN' && !session?.provider_refresh_token) {
        // Log when SIGNED_IN fires without a refresh token — signals regression or missing prompt:consent
        console.log('[auth] SIGNED_IN fired without provider_refresh_token — normal session restore or missing access_type:offline');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Handle return URL restoration after OAuth redirect
  useEffect(() => {
    if (!currentUser) return;

    const savedReturnUrl = localStorage.getItem('sakido_auth_return_url');
    if (savedReturnUrl) {
      localStorage.removeItem('sakido_auth_return_url');
      navigate(savedReturnUrl, { replace: true });
    } else if (window.location.pathname === '/' && (window.location.hash.includes('access_token') || window.location.search.includes('code'))) {
      navigate('/dashboard/connectors', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    navigate('/');
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center font-mono text-xs">
        Loading Sakido...
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <SakidoLandingPage
            onOpenDashboard={() => navigate('/dashboard')}
          />
        }
      />
      <Route
        path="/dashboard/*"
        element={
          currentUser ? (
            <Suspense
              fallback={
                <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center font-mono text-xs">
                  Loading Workspace...
                </div>
              }
            >
              <SakidoDashboard
                currentUser={currentUser}
                onBackToLanding={() => navigate('/')}
                onSignOut={handleSignOut}
              />
            </Suspense>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      {/* Legal & Compliance Routes (For Google Console & OAuth) */}
      <Route path="/privacy" element={<LegalPage initialTab="privacy" />} />
      <Route path="/terms" element={<LegalPage initialTab="terms" />} />
      <Route path="/terms-of-service" element={<LegalPage initialTab="terms" />} />
      <Route path="/cookie-policy" element={<LegalPage initialTab="cookies" />} />
      <Route path="/cookies" element={<LegalPage initialTab="cookies" />} />
      <Route path="/contact" element={<LegalPage initialTab="contact" />} />
      <Route path="/legal" element={<LegalPage initialTab="privacy" />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
      <Analytics />
      <SpeedInsights />
    </BrowserRouter>
  );
}


