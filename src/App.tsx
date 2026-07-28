import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { SakidoLandingPage } from './components/SakidoLandingPage';
import { SakidoDashboard } from './components/dashboard/SakidoDashboard';
import { getSupabaseClient } from './lib/supabaseClient';

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
        if (data.session.provider_token) {
          try { localStorage.setItem('sakido_provider_token', data.session.provider_token); } catch {}
        }
        if (data.session.provider_refresh_token) {
          try { localStorage.setItem('sakido_provider_refresh_token', data.session.provider_refresh_token); } catch {}
        }
        setCurrentUser({
          id: u.id,
          email: u.email,
          name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0],
          avatarUrl: u.user_metadata?.avatar_url || u.user_metadata?.picture,
        });
      }
      setIsAuthLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user;
        if (session?.provider_token) {
          try { localStorage.setItem('sakido_provider_token', session.provider_token); } catch {}
        }
        if (session?.provider_refresh_token) {
          try { localStorage.setItem('sakido_provider_refresh_token', session.provider_refresh_token); } catch {}
        }
        setCurrentUser({
          id: u.id,
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
            <SakidoDashboard
              currentUser={currentUser}
              onBackToLanding={() => navigate('/')}
              onSignOut={handleSignOut}
            />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}


