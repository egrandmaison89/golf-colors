import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const TEAM_COLORS = ['Red', 'Blue', 'Green', 'Yellow'] as const;
type TeamColor = typeof TEAM_COLORS[number];

interface Profile {
  team_name: string;
  team_color: TeamColor;
  website_url: string;
}

export function AccountModal({ isOpen, onClose, userId }: AccountModalProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamColor, setTeamColor] = useState<TeamColor>('Blue');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      fetchProfile();
    }
  }, [isOpen, userId]);

  async function fetchProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('team_name, team_color, website_url')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setProfile(data);
      setTeamName(data.team_name || '');
      setTeamColor(data.team_color || 'Blue');
      setWebsiteUrl(data.website_url || '');
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          team_name: teamName,
          team_color: teamColor,
          website_url: websiteUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

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
            Account Settings
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Team Color
              </label>
              <div className="grid grid-cols-4 gap-2">
                {TEAM_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setTeamColor(color)}
                    className={`relative p-2 rounded-lg border-2 transition-all ${
                      teamColor === color
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-transparent hover:border-gray-200'
                    }`}
                  >
                    <div 
                      className={`w-full h-8 rounded shadow-inner`}
                      style={{ 
                        backgroundColor: color.toLowerCase(),
                        opacity: teamColor === color ? 1 : 0.7
                      }}
                    />
                    {teamColor === color && (
                      <div className="absolute inset-0 rounded-lg ring-2 ring-offset-2 ring-gray-900" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Venmo Link
              </label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}

            {success && (
              <p className="text-green-600 text-sm">Settings updated successfully!</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}