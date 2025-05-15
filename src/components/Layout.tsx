import React from 'react';
import { Link } from 'react-router-dom';
import { Navigation } from './Navigation';
import { Trophy, Users, Book } from 'lucide-react';
import { LeaderboardFooter } from './LeaderboardFooter';

interface LayoutProps {
  children: React.ReactNode;
}

const ENABLE_LEAGUES = import.meta.env.VITE_ENABLE_LEAGUES === 'true';

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      <div className="container mx-auto px-4" style={{ marginBottom: '60px' }}>
        <div className="mt-10">
            <LeaderboardFooter />
        </div>  
      </div>

      <footer className="bg-gradient-to-br from-green-900 via-blue-900 to-red-900 text-white py-16 mt-auto">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <div className="flex items-center space-x-2 mb-6">
                <img src="/logo.svg" alt="Colors Cup Logo" className="w-8 h-8" />
                <span className="text-xl font-bold bg-gradient-to-r from-red-500 via-green-500 to-blue-500 bg-clip-text text-transparent">
                  Colors Cup
                </span>
              </div>
              <p className="text-gray-300 mb-4">
                Experience fantasy golf like never before. Draft your dream team and compete for real prizes.
              </p>
              <p className="text-sm text-gray-400">
                © {new Date().getFullYear()} Colors Cup. All rights reserved.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">Quick Links</h3>
              <div className="space-y-3">
                <Link 
                  to="/tournaments" 
                  className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
                >
                  <Trophy className="h-5 w-5" />
                  <span>Tournaments</span>
                </Link>
                {ENABLE_LEAGUES && (
                  <Link 
                    to="/league" 
                    className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
                  >
                    <Users className="h-5 w-5" />
                    <span>League Overview</span>
                  </Link>
                )}
                <Link 
                  to="/rules" 
                  className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
                >
                  <Book className="h-5 w-5" />
                  <span>Rules & Scoring</span>
                </Link>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">About Colors Cup</h3>
              <div className="space-y-4 text-gray-300">
                <p>
                  Colors Cup brings a new level of excitement to PGA Tour events. 
                  Draft your team, compete with friends, and win real prizes.
                </p>
                <p>
                  Join us for the 2025 season and experience golf in a whole new way.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-12">
          </div>
        </div>
      </footer>
    </div>
  );
}