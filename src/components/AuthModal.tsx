import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X } from 'lucide-react';
import { sendPasswordResetEmail } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailSent(false);
    setLoading(true);

    try {
      if (isSignUp) {
        console.log('Starting signup process...');
        const { error: signUpError, data: { user } } = await supabase.auth.signUp({
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

        console.log('Signup response:', { user, error: signUpError });

        if (signUpError) throw signUpError;

        if (user) {
          console.log('Creating profile for user:', user.id);
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              team_name: teamName,
              team_color: 'Blue'
            });

          if (profileError) throw profileError;
          
          console.log('Profile created successfully');
          setEmailSent(true);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        onClose();
      }
    } catch (err) {
      console.error('Error during signup:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function testEmailSettings() {
    console.log('Testing email settings...');
    const { data, error } = await supabase.auth.admin.listUsers();
    console.log('Auth settings:', data, error);
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResetEmailSent(false);
    try {
      const { error } = await sendPasswordResetEmail(email);
      if (error) throw error;
      setResetEmailSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {showForgotPassword ? 'Reset Password' : isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>

          {showForgotPassword ? (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              {error && (
                <p className="text-red-600 text-sm">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Please wait...' : 'Send Password Reset Email'}
              </button>
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(false); setResetEmailSent(false); setError(null); }}
                  className="text-green-600 hover:text-green-700 text-sm"
                >
                  Back to Sign In
                </button>
              </div>
              {resetEmailSent && (
                <div className="mt-4 p-4 bg-blue-50 text-blue-700 rounded-lg">
                  <p className="text-sm font-medium mb-1">
                    Password reset email sent!
                  </p>
                  <p className="text-sm">
                    Please check your inbox (and spam folder) for the reset link.
                  </p>
                </div>
              )}
            </form>
          ) : (
            <>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            )}

            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>

                <button
                  type="button"
                  onClick={testEmailSettings}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Test Email Settings
                </button>
          </form>

          {emailSent && isSignUp && (
            <div className="mt-4 p-4 bg-blue-50 text-blue-700 rounded-lg">
                  <p className="text-sm font-medium mb-1">
                    Welcome to the Colors Cup!
                  </p>
              <p className="text-sm">
                    We've sent a confirmation email to {email}. Please check your inbox (and spam folder) to verify your account.
              </p>
            </div>
          )}

          <div className="mt-4 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-green-600 hover:text-green-700 text-sm"
            >
              {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
            </button>
          </div>

              <button
                type="button"
                onClick={() => { setShowForgotPassword(true); setError(null); setResetEmailSent(false); }}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Forgot Password?
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}