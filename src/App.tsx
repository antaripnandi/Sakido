import React, { useState, useEffect } from 'react';
import { SakidoLandingPage } from './components/SakidoLandingPage';
import { SakidoDashboard } from './components/dashboard/SakidoDashboard';
import { getSupabaseClient } from './lib/supabaseClient';

export default function App() {
  const [viewMode, setViewMode] = useState<'dashboard' | 'landing'>('landing');
  const [currentUser, setCurrentUser] = useState<{
    email?: string;
    name?: string;
    avatarUrl?: string;
    id?: string;
  } | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

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
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
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
        setViewMode('landing');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setViewMode('landing');
  };

  // Guard: Dashboard is ONLY accessible when user is logged in
  if (viewMode === 'dashboard' && currentUser) {
    return (
      <SakidoDashboard
        currentUser={currentUser}
        onBackToLanding={() => setViewMode('landing')}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <SakidoLandingPage
      onOpenDashboard={() => setViewMode('dashboard')}
    />
  );
}

