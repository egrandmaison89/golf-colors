import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trophy, Users, UserCircle, Settings, X, Menu } from 'lucide-react';
import { AuthModal } from './AuthModal';
import { AccountModal } from './AccountModal';
import { supabase } from '../lib/supabase';

interface Profile {
  team_name: string;
  team_color: string;
  website_url: string;
}

export function Navigation() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    // Get initial auth state
    supabase.auth.getUser().then(userData => {
      setUser(userData);
      if (userData.data.user) {
        fetchProfile(userData.data.user.id);
      }
    });

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (!error && data) {
      setProfile(data);
    } else {
      // Only log actual errors, not "no rows returned"
      if (error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }
      setProfile(null);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  return (
    <>
      <nav className="bg-white shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Link to="/" className="flex items-center space-x-2">
                <img src="/logo.svg" alt="Colors Cup Logo" className="w-8 h-8" />
                <span className="text-xl font-bold bg-gradient-to-r from-red-500 via-green-500 to-blue-500 bg-clip-text text-transparent">Colors Cup</span>
              </Link>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <NavLinks user={user} />
              {user?.user ? (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowAccountModal(true)}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                  >
                    <Settings className="h-5 w-5" />
                    <span className="font-semibold">{profile?.team_name}</span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    <UserCircle className="h-5 w-5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl"
                >
                  <UserCircle className="h-5 w-5" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
            
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-gray-600" />
              ) : (
                <Menu className="h-6 w-6 text-gray-600" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-100">
              <div className="space-y-4">
                <NavLinks user={user} mobile />
                <div className="pt-4 border-t border-gray-100">
                  {user?.user ? (
                    <div className="space-y-4">
                      <button
                        onClick={() => {
                          setShowAccountModal(true);
                          setIsMobileMenuOpen(false);
                        }}
                        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 w-full"
                      >
                        <Settings className="h-5 w-5" />
                        <span><span className="font-semibold">{profile?.team_name}</span></span>
                      </button>
                      <button
                        onClick={() => {
                          handleSignOut();
                          setIsMobileMenuOpen(false);
                        }}
                        className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl w-full"
                      >
                        <UserCircle className="h-5 w-5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setShowAuthModal(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl w-full"
                    >
                      <UserCircle className="h-5 w-5" />
                      <span>Sign In</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
      
      {user?.user && (
        <AccountModal
          isOpen={showAccountModal}
          onClose={() => setShowAccountModal(false)}
          userId={user.user.id}
        />
      )}
    </>
  );
}

function NavLinks({ user, mobile = false }: { user: any; mobile?: boolean }) {
  const location = useLocation();
  return (
    <>
      <NavLink 
        href="/tournaments" 
        icon={<Trophy className="h-5 w-5 text-yellow-500" />} 
        text="Tournaments"
        mobile={mobile}
        active={location.pathname.startsWith('/tournaments')}
      />
      {user?.user && (
        <NavLink 
          href="/my-results" 
          icon={<Users className="h-5 w-5 text-blue-500" />} 
          text="My Results"
          mobile={mobile}
          active={location.pathname.startsWith('/my-results')}
        />
      )}
    </>
  );
}

function NavLink({ 
  href, 
  icon, 
  text,
  mobile = false,
  active = false
}: { 
  href: string; 
  icon: React.ReactNode; 
  text: string;
  mobile?: boolean;
  active?: boolean;
}) {
  return (
    <Link
      to={href}
      className={`flex items-center space-x-2 text-gray-600 hover:text-green-600 transition-colors ${
        mobile ? 'w-full px-4 py-2 hover:bg-gray-50' : ''
      } ${active ? 'font-bold underline text-green-700' : ''}`}
    >
      {icon}
      <span>{text}</span>
    </Link>
  );
}