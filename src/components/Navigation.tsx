import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Trophy, Users, UserCircle, Settings, X, Menu, Bell } from 'lucide-react';
import { AuthModal } from './AuthModal';
import { AccountModal } from './AccountModal';
import { supabase } from '../lib/supabase';

interface Profile {
  team_name: string;
  team_color: string;
  website_url: string;
}

type NotificationType = 'incoming' | 'response';
interface SideBetNotification {
  id: string;
  description: string;
  amount: number;
  odds: string;
  proposer: { team_name: string } | null;
  proposer_id: string;
  opponent_id: string | null;
  status: string;
  created_at: string;
  type: NotificationType;
  responseStatus?: string;
  responderTeamName?: string;
}

export function Navigation() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<SideBetNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const navigate = useNavigate();

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

  // Fetch notifications on mount and whenever user changes
  useEffect(() => {
    async function fetchNotifications() {
      if (!user?.user) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      const userId = user.user.id;
      // Fetch incoming side bets
      const { data, error } = await supabase
        .from('side_bets')
        .select('id, description, amount, odds, proposer:proposer_id(team_name), proposer_id, opponent_id, status, created_at')
        .or(`opponent_id.eq.${userId},opponent_id.is.null`)
        .eq('status', 'proposed')
        .order('created_at', { ascending: false });
      if (error) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const incoming = (data || []).filter((bet: any) => bet.opponent_id === userId || (bet.opponent_id === null && bet.proposer_id !== userId)).map((bet: any) => ({
        id: bet.id,
        description: bet.description,
        amount: bet.amount,
        odds: bet.odds,
        proposer: bet.proposer,
        proposer_id: bet.proposer_id,
        opponent_id: bet.opponent_id,
        status: bet.status,
        created_at: bet.created_at,
        type: 'incoming' as NotificationType
      }));
      // Fetch responses to user's proposals
      const { data: responses } = await supabase
        .from('side_bets')
        .select('id, description, amount, odds, proposer:proposer_id(team_name), proposer_id, opponent:opponent_id(team_name), opponent_id, status, created_at')
        .eq('proposer_id', userId)
        .not('status', 'eq', 'proposed')
        .order('created_at', { ascending: false });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const responseNotifications = (responses || []).map((bet: any) => ({
        id: bet.id,
        description: bet.description,
        amount: bet.amount,
        odds: bet.odds,
        proposer: bet.proposer,
        proposer_id: bet.proposer_id,
        opponent_id: bet.opponent_id,
        status: bet.status,
        created_at: bet.created_at,
        type: 'response' as NotificationType,
        responseStatus: bet.status,
        responderTeamName: bet.opponent?.team_name || 'Opponent',
      }));
      const allNotifications = [...incoming, ...responseNotifications].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setNotifications(allNotifications);
      // Unread logic
      const lastViewedKey = `notifications_last_viewed_${userId}`;
      const lastViewed = localStorage.getItem(lastViewedKey);
      let unread = 0;
      if (lastViewed) {
        const lastViewedDate = new Date(lastViewed);
        unread = allNotifications.filter(n => new Date(n.created_at) > lastViewedDate).length;
      } else {
        unread = allNotifications.length;
      }
      setUnreadCount(unread);
    }
    fetchNotifications();
  }, [user]);

  // Real-time subscription for side bet notifications (already updates notifications)
  useEffect(() => {
    if (!user?.user) return;
    const userId = user.user.id;
    // Incoming bets
    const channel = supabase
      .channel('side-bet-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'side_bets',
      }, (payload) => {
        const bet = payload.new;
        if (
          bet.status === 'proposed' &&
          (bet.opponent_id === userId || (bet.opponent_id === null && bet.proposer_id !== userId))
        ) {
          setNotifications((prev) => [
            {
              id: bet.id,
              description: bet.description,
              amount: bet.amount,
              odds: bet.odds,
              proposer: bet.proposer,
              proposer_id: bet.proposer_id,
              opponent_id: bet.opponent_id,
              status: bet.status,
              created_at: bet.created_at,
              type: 'incoming' as NotificationType
            },
            ...prev,
          ]);
        }
      })
      // Responses to user's proposals
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'side_bets',
      }, (payload) => {
        const bet = payload.new;
        const old = payload.old;
        if (
          bet.proposer_id === userId &&
          old.status === 'proposed' &&
          bet.status !== 'proposed'
        ) {
          setNotifications((prev) => [
            {
              id: bet.id,
              description: bet.description,
              amount: bet.amount,
              odds: bet.odds,
              proposer: bet.proposer,
              proposer_id: bet.proposer_id,
              opponent_id: bet.opponent_id,
              status: bet.status,
              created_at: bet.created_at,
              type: 'response' as NotificationType,
              responseStatus: bet.status,
              responderTeamName: bet.opponent?.team_name || 'Opponent',
            },
            ...prev,
          ]);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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
      if (error && error.code !== 'PGRST116') {
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

  // Helper to get last viewed timestamp for current user
  function getLastViewed() {
    if (!user?.user) return null;
    const lastViewedKey = `notifications_last_viewed_${user.user.id}`;
    const lastViewed = localStorage.getItem(lastViewedKey);
    return lastViewed ? new Date(lastViewed) : null;
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
                  {/* Notification Bell */}
                  <button
                    onClick={() => {
                      setShowNotifications(true);
                      if (user?.user) {
                        const lastViewedKey = `notifications_last_viewed_${user.user.id}`;
                        localStorage.setItem(lastViewedKey, new Date().toISOString());
                        setUnreadCount(0);
                      }
                    }}
                    className="relative flex items-center justify-center p-2 rounded-full hover:bg-gray-100 focus:outline-none"
                    aria-label="Notifications"
                  >
                    <Bell className="h-6 w-6 text-gray-600" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full transform translate-x-1/2 -translate-y-1/2">
                        {unreadCount}
                      </span>
                    )}
                  </button>
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
                      {/* Notification Bell in mobile menu */}
                      <button
                        onClick={() => {
                          setShowNotifications(true);
                          if (user?.user) {
                            const lastViewedKey = `notifications_last_viewed_${user.user.id}`;
                            localStorage.setItem(lastViewedKey, new Date().toISOString());
                            setUnreadCount(0);
                          }
                        }}
                        className="relative flex items-center space-x-2 text-gray-600 hover:text-gray-900 w-full"
                        aria-label="Notifications"
                      >
                        <Bell className="h-5 w-5" />
                        <span>Notifications</span>
                        {/* TODO: Add badge for unread notifications */}
                      </button>
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
      
      {/* Notifications Modal placeholder */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Notifications</h2>
              <button onClick={() => setShowNotifications(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Only All tab for notifications */}
            {notifications.length === 0 ? (
              <div className="text-gray-500">No notifications yet.</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {notifications.map((notif) => {
                  const lastViewed = getLastViewed();
                  const isUnread = lastViewed ? new Date(notif.created_at) > lastViewed : true;
                  return (
                    <li
                      key={notif.id + notif.type + (notif.responseStatus || '')}
                      className={`py-4 cursor-pointer rounded transition-colors ${isUnread ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'} mb-2`}
                      onClick={() => {
                        setShowNotifications(false);
                        navigate(`/side-bets?betId=${notif.id}`);
                        setTimeout(() => {
                          const el = document.getElementById(`side-bet-${notif.id}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 500);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {isUnread && <span className="w-2 h-2 rounded-full bg-blue-500 inline-block flex-shrink-0" title="New" />}
                        <span className="font-semibold text-gray-900">
                          {notif.type === 'incoming'
                            ? `New Side Bet proposed by ${notif.proposer?.team_name || 'Unknown'}`
                            : `Your Side Bet was ${notif.responseStatus} by ${notif.responderTeamName}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1 gap-2">
                        <span className="text-gray-700 text-sm">
                          {notif.description} (${notif.amount}, Odds: {notif.odds})
                        </span>
                        <span className="text-xs text-gray-400 whitespace-nowrap text-right ml-4">
                          {notif.type === 'incoming'
                            ? `Proposed ${new Date(notif.created_at).toLocaleString()}`
                            : `Updated ${new Date(notif.created_at).toLocaleString()}`}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
      
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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