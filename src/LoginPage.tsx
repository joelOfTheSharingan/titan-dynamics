import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { useNavigate, Navigate } from 'react-router-dom'; // 🚨 1. Make sure 'Navigate' is imported here!
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [needsName, setNeedsName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [nameError, setNameError] = useState('');

  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const isLocal =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  const LOGIN_URL = isLocal
    ? 'http://localhost:3000/home/login.html'
    : 'https://github.io';

  // ─────────────────────────────
  // AUTH INIT
  // ─────────────────────────────
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const {
        data: { user },
        error
      } = await supabase.auth.getUser();

      if (!mounted) return;

      setUser(user ?? null);
      setCheckingAuth(false);

      if (user) {
        await handleUserRow(user);
      }
    };

    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        const currentUser = session?.user ?? null;

        setUser(currentUser);
        setCheckingAuth(false);

        if (currentUser) {
          await handleUserRow(currentUser);
        }
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // ─────────────────────────────
  // CHECK USER IN DB
  // ─────────────────────────────
  const handleUserRow = async (user: User) => {
    try {
      const { data: existing, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('DB error:', error);
        return;
      }

      if (existing) {
        navigate('/'); 
      } else {
        setPendingUser(user);
        setNeedsName(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ─────────────────────────────
  // SAVE NAME (FIRST TIME USER)
  // ─────────────────────────────
  const handleNameSubmit = async () => {
    if (!nameInput.trim()) {
      setNameError('Please enter your name.');
      return;
    }

    if (!pendingUser) {
      setNameError('No authenticated user found.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('users').insert([
      {
        auth_id: pendingUser.id,
        email: pendingUser.email,
        username: nameInput.trim(),
        role: 'user',
      },
    ]);

    if (error) {
      console.error(error);
      setNameError('Failed to save user.');
      setLoading(false);
      return;
    }

    navigate('/'); 
  };

  // ─────────────────────────────
  // NOT AUTHENTICATED SCREEN
  // ─────────────────────────────
  if (!checkingAuth && !user && !needsName) {
    return (
      <div className="login-root">
        <div className="login-card">
          <div className="login-wordmark">Titan Dynamics</div>
          <div className="login-sub">Access Required</div>

          <div style={{ marginTop: 20, color: '#ff6b6b' }}>
            ❌ Not authenticated
          </div>

          <p className="login-intro">
            You need to sign in to access this system.
          </p>

          <a
            href={LOGIN_URL}
            className="login-btn"
            style={{
              display: 'inline-block',
              textAlign: 'center',
              textDecoration: 'none',
            }}
          >
            Go to Login Page
          </a>

          <div className="login-footer">
            Authorized Personnel Only
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────
  // FIRST TIME NAME SCREEN
  // ─────────────────────────────
  if (needsName) {
    return (
      <div className="login-root">
        <div className="login-card">
          <div className="login-wordmark">Titan Dynamics</div>
          <div className="login-sub">First Time Setup</div>

          <input
            className="login-name-input"
            type="text"
            placeholder="Full Name"
            value={nameInput}
            onChange={(e) => {
              setNameInput(e.target.value);
              setNameError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            autoFocus
          />

          {nameError && (
            <div className="login-error">{nameError}</div>
          )}

          <button
            className="login-btn"
            onClick={handleNameSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>

          <div className="login-footer">
            Authorized Personnel Only
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────
  // LOADING STATE
  // ─────────────────────────────
  return (
    <div className="login-root">
      <div className="login-card">
        <div className="login-wordmark">Titan Dynamics</div>
        <div className="login-sub">Checking session...</div>

        <div className="login-spinner" />

        <div className="login-footer">
          Loading authentication state
        </div>
      </div>
    </div>
  );
}
