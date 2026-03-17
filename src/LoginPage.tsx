import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [needsName, setNeedsName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [nameError, setNameError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) await handleUserRow(session.user);
    };
    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await handleUserRow(session.user);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
  setLoading(true);

  const redirect =
  window.location.hostname === "localhost"
    ? "http://localhost:5173"
    : "https://joelofthesharingan.github.io/titan-dynamics";

await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: redirect
  }
});
};

  const handleUserRow = async (user: any) => {
    try {
      // Check if row with this email exists
      const { data: existing, error: selectError } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (selectError) {
        console.error('Error checking user row:', selectError);
        return;
      }

      if (existing) {
        // Row found — log it and go to dashboard
        console.log('Existing user data:', existing);
        navigate('/app');
      } else {
        // No row — ask for name before inserting
        setPendingUser(user);
        setNeedsName(true);
        setLoading(false);
      }
    } catch (err) {
      console.error('Error handling user row:', err);
      setLoading(false);
    }
  };

  const handleNameSubmit = async () => {
    if (!nameInput.trim()) {
      setNameError('Please enter your name.');
      return;
    }
    setLoading(true);
    setNameError('');

    const { error } = await supabase.from('users').insert([{
      email: pendingUser.email,
      name: nameInput.trim(),
    }]);

    if (error) {
      console.error('Error inserting user:', error);
      setNameError('Failed to save. Please try again.');
      setLoading(false);
      return;
    }

    console.log('New user inserted:', { email: pendingUser.email, name: nameInput.trim() });
    navigate('/app');
  };

  // ── name prompt screen ──
  if (needsName) {
    return (
      <div className="login-root">
        <div className="login-card">
          <div className="login-wordmark">Titan Dynamics</div>
          <div className="login-sub">Workforce Operations System</div>

          <div className="login-label">First Time Setup</div>

          <p className="login-intro">
            Welcome. Enter your full name to complete registration.
          </p>

          <input
            className="login-name-input"
            type="text"
            placeholder="Full Name"
            value={nameInput}
            onChange={e => { setNameInput(e.target.value); setNameError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
            autoFocus
          />

          {nameError && <div className="login-error">{nameError}</div>}

          <button
            className="login-btn"
            onClick={handleNameSubmit}
            disabled={loading}
          >
            {loading
              ? <><span className="login-spinner" /> Saving…</>
              : 'Continue'}
          </button>

          <div className="login-footer">Authorized Personnel Only</div>
        </div>
      </div>
    );
  }

  // ── main login screen ──
  return (
    <div className="login-root">
      <div className="login-card">
        <div className="login-wordmark">Titan Dynamics</div>
        <div className="login-sub">Workforce Operations System</div>

        <div className="login-label">Secure Access</div>

        <button className="login-btn" onClick={handleGoogleLogin} disabled={loading}>
          {loading ? (
            <><span className="login-spinner" /> Connecting…</>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </>
          )}
        </button>

        <div className="login-footer">Authorized Personnel Only</div>
      </div>
    </div>
  );
}