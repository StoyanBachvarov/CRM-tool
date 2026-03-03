import { requireSupabase, supabase } from './supabaseClient';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function mapAuthError(error, action) {
  const message = error?.message || 'Authentication failed.';
  const normalized = message.toLowerCase();

  if (action === 'signup') {
    if (normalized.includes('email rate limit exceeded')) {
      return new Error('Too many sign-up attempts right now. Wait a minute and try again. For local testing, disable email confirmations in Supabase Auth settings.');
    }

    if (normalized.includes('email address') && normalized.includes('invalid')) {
      return new Error('This email cannot receive confirmation in the current Supabase setup. For local testing, disable email confirmations or configure SMTP in Supabase Auth settings.');
    }

    if (normalized.includes('user already registered')) {
      return new Error('This email is already registered. Try logging in instead.');
    }
  }

  return error;
}

export async function getCurrentUser() {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    if (error.message?.toLowerCase().includes('auth session missing')) {
      return null;
    }
    throw error;
  }
  return data.user;
}

export async function signIn(email, password) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email: normalizeEmail(email),
    password
  });
  if (error) {
    throw error;
  }
  return data;
}

export async function signUp(email, password, fullName) {
  const client = requireSupabase();
  const normalizedEmail = normalizeEmail(email);

  const { data, error } = await client.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        full_name: fullName || normalizedEmail
      }
    }
  });

  if (error) {
    throw mapAuthError(error, 'signup');
  }

  return data;
}

export async function signOut() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) {
    throw error;
  }
}

export function onAuthStateChange(handler) {
  if (!supabase) {
    return { unsubscribe: () => {} };
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    handler(session?.user || null);
  });
  return data.subscription;
}
