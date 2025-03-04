import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

export async function signUpWithEmail(email: string, password: string, teamName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        team_name: teamName,
        team_color: 'Blue'
      },
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  });
  
  if (!error && data.user) {
    // Create profile after successful signup
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        team_name: teamName,
        team_color: 'Blue'
      });
    
    if (profileError) {
      console.error('Error creating profile:', profileError);
      return { error: profileError };
    }
  }
  
  return { data, error };
}

export async function checkEmailConfirmation() {
  const { data: { session }, error } = await supabase.auth.getSession();
  console.log('Current session:', session);
  console.log('Email confirmation status:', session?.user?.email_confirmed_at);
  return { session, error };
}