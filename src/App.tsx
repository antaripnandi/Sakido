import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { SakidoLandingPage } from './components/SakidoLandingPage';
import { LegalPage } from './components/legal/LegalPage';
import { getSupabaseClient } from './lib/supabaseClient';
import { clearProviderToken, invalidateGeneration } from './lib/googleTokenStore';
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
      // Routes to the correct per-service token column based on sakido_pending_connector.
      if (event === 'SIGNED_IN' && session?.provider_refresh_token) {
        const pending = localStorage.getItem('sakido_pending_connector');

        // Map pending service to token column
        const tokenCol =
          pending === 'googleCalendar' ? 'calendar_refresh_token' :
          pending === 'googleDrive'    ? 'drive_refresh_token'    :
          pending === 'gmail'          ? 'gmail_refresh_token'    :
          null;

        if (!tokenCol) {
          // Normal sign-in (not a connector flow) — don't touch token columns
          console.log('[auth] SIGNED_IN without pending connector, skipping token write');
          return;
        }

        // Write only the token column — omit flag columns entirely. Postgres
        // upsert only touches columns in the payload, so existing flags are
        // preserved on update, and the migration's NOT NULL DEFAULT false
        // makes a first INSERT safe. verifyOAuthCallback owns the flags.
        supabase.from('google_tokens').upsert({
          user_id: session.user.id,
          [tokenCol]: session.provider_refresh_token, // write only this service's column
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' }).then(({ error: upsertError }) => {
          if (upsertError) console.warn('[auth] token upsert failed:', upsertError.message);
          else console.log('[auth] token saved to', tokenCol, 'for user', session.user.id);
        });
      } else if (event === 'SIGNED_IN' && !session?.provider_refresh_token) {
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
    // Purge cached Google access tokens + bump the generation guard so a
    // different user on the same tab can never hit the previous user's cached
    // token (or an in-flight refresh resolving after this sign-out)
    clearProviderToken();
    invalidateGeneration();
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


