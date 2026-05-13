// src/shared/auth.js

import { supabase } from "../lib/supabase.js";

// ─────────────────────────────
// REQUIRE LOGIN
// ─────────────────────────────

export async function requireAuth() {

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {

    const loginUrl =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
        ? "http://localhost:5173/"
        : "https://joelofthesharingan.github.io/home/login.html";

    window.location.href = loginUrl;
    return null;
  }

  return user;
}

// ─────────────────────────────
// GET CURRENT USER
// ─────────────────────────────

export async function getUser() {

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

// ─────────────────────────────
// GOOGLE LOGIN
// ─────────────────────────────

export async function googleLogin() {

  const redirectUrl =

    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"

      ? "http://localhost:5173/"
      : "https://joelofthesharingan.github.io/titan-dynamics/";

  await supabase.auth.signInWithOAuth({

    provider: "google",

    options: {
      redirectTo: redirectUrl,
    },
  });
}

// ─────────────────────────────
// LOGOUT
// ─────────────────────────────

export async function googleLogin() {
  const redirectUrl = "http://localhost:3000/home/";

  console.log("LOGIN REDIRECT FIXED TO:", redirectUrl);

  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl,
      flowType: "pkce",
      queryParams: {
        prompt: "select_account"
      }
    }
  });
}