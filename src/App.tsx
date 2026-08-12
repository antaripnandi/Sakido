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

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Sakido UI Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
          <h2 className="font-display text-2xl font-bold mb-2">Something went wrong in Workspace</h2>
          <p className="text-xs text-zinc-400 font-mono mb-4 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred in the workspace component.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = '/dashboard';
            }}
            className="px-4 py-2 rounded-full bg-white text-black text-xs font-bold hover:bg-zinc-200 cursor-pointer"
          >
            Reload Workspace
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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

      if (event === 'SIGNED_IN' && session?.provider_refresh_token) {
        const pending = localStorage.getItem('sakido_pending_connector');

        const tokenCol =
          pending === 'googleCalendar' ? 'calendar_refresh_token' :
          pending === 'googleDrive'    ? 'drive_refresh_token'    :
          pending === 'gmail'          ? 'gmail_refresh_token'    :
          null;

        if (!tokenCol) {
          console.log('[auth] SIGNED_IN without pending connector, skipping token write');
          return;
        }

        supabase.from('google_tokens').upsert({
          user_id: session.user.id,
          [tokenCol]: session.provider_refresh_token,
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
          <ErrorBoundary>
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
          </ErrorBoundary>
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


