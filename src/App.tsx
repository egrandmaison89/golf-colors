import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Tournaments } from './pages/Tournaments';
import { LeagueOverview } from './pages/LeagueOverview';
import TournamentDetail from './pages/TournamentDetail';
import { MyResults } from './pages/MyResults';
import { Leagues } from './pages/Leagues';
import { LeagueDetail } from './pages/LeagueDetail';
import { Rules } from './pages/Rules';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { LeagueProvider } from './contexts/LeagueContext';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <LeagueProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tournaments" element={<Tournaments />} />
            <Route
              path="/my-results"
              element={
                <RequireAuth>
                  <MyResults />
                </RequireAuth>
              }
            />
            <Route path="/league" element={<LeagueOverview />} />
            <Route
              path="/leagues"
              element={
                <RequireAuth>
                  <Leagues />
                </RequireAuth>
              }
            />
            <Route
              path="/leagues/:leagueId"
              element={
                <RequireAuth>
                  <LeagueDetail />
                </RequireAuth>
              }
            />
            <Route path="/rules" element={<Rules />} />
            <Route path="/tournament/:tournamentId" element={<TournamentDetail tournamentId={undefined} />} />
            <Route path="*" element={<Navigate to="/tournaments" replace />} />
          </Routes>
        </Layout>
      </LeagueProvider>
    </BrowserRouter>
  );
}

export default App;
