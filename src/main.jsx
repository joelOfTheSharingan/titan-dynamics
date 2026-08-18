import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './LoginPage';
import App from './App';
import { supabase } from './lib/supabase';

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

let root;
if (!container._reactRoot) {
  root = ReactDOM.createRoot(container);
  container._reactRoot = root;
} else {
  root = container._reactRoot;
}

// 1. Move the check here so our main routing layout can see it
const isTestingAlone = window.location.port === '5173' || window.location.port === '5174';

root.render(
  <HashRouter>
    <Routes>
      {isTestingAlone ? (
        // 🚨 SANDBOX MODE: No login route exists. Everything goes directly to the main App!
        <>
          <Route path="/" element={<App />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      ) : (
        // 🔒 PRODUCTION MODE: Normal authentication flow
        <>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedApp />} />
        </>
      )}
    </Routes>
  </HashRouter>
);

function ProtectedApp() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;

  return user ? <App /> : <Navigate to="/login" replace />;
}
