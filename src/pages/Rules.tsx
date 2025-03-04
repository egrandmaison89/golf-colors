import React from 'react';
import { Trophy, DollarSign, Users, AlertCircle, Flag, Calculator, Award } from 'lucide-react';

export function Rules() {
  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">How Colors Cup Works</h1>
        <p className="text-xl text-gray-600">
          Your complete guide to playing, scoring, and winning in the Colors Cup
        </p>
      </div>

      <section className="space-y-8">
        {/* Game Overview */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-start space-x-4">
            <Trophy className="h-6 w-6 text-green-600 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Game Overview</h2>
              <ul className="space-y-3 text-gray-600">
                <li>• Colors Cup brings fantasy golf to life with real PGA tournaments</li>
                <li>• Create your team of 3 golfers for each tournament</li>
                <li>• Compete against other teams for cash prizes</li>
                <li>• Win by having the lowest combined team score</li>
                <li>• Earn bonus rewards for drafting tournament winners</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Team Formation Rules */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-start space-x-4">
            <Users className="h-6 w-6 text-blue-500 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Team Formation Rules</h2>
              <ul className="space-y-3 text-gray-600">
                <li>• Draft exactly 3 golfers for your team</li>
                <li>• Each golfer can only be selected by one team</li>
                <li>• Teams must be finalized before tournament start</li>
                <li>• No changes allowed once tournament begins</li>
                <li>• All 3 golfers' scores count towards team total</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Scoring System */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-start space-x-4">
            <Calculator className="h-6 w-6 text-purple-500 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Scoring System</h2>
              <ul className="space-y-3 text-gray-600">
                <li className="font-medium text-gray-800">Active Players:</li>
                <li className="pl-4">• Score is their actual tournament score relative to par</li>
                <li className="pl-4">• Example: -4 means four strokes under par</li>
                
                <li className="font-medium text-gray-800 mt-2">Players Who Miss Cut:</li>
                <li className="pl-4">• Score = (Total Strokes × 2) - (Par × 4)</li>
                <li className="pl-4">• Example: Player with 138 strokes on Par 70 course</li>
                <li className="pl-4">• Calculation: (138 × 2) - (70 × 4) = 276 - 280 = -4</li>
                
                <li className="font-medium text-gray-800 mt-2">Withdrawn Players:</li>
                <li className="pl-4">• Automatically receive the highest score among all players plus one stroke</li>
                <li className="pl-4">• This ensures withdrawn players don't give teams an advantage</li>
                
                <li className="font-medium text-gray-800 mt-2">Team Score:</li>
                <li className="pl-4">• Sum of all three golfers' scores</li>
                <li className="pl-4">• Lowest combined score wins the tournament</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Prize Structure */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-start space-x-4">
            <DollarSign className="h-6 w-6 text-green-500 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Prize Structure</h2>
              <ul className="space-y-3 text-gray-600">
                <li className="font-medium text-gray-800">Base Payouts:</li>
                <li className="pl-4">• Losing teams pay $1 per stroke difference to the winner</li>
                <li className="pl-4">• Example: If Team A finishes 5 strokes behind, they owe $5</li>
                
                <li className="font-medium text-gray-800 mt-2">Tournament Winner Bonus:</li>
                <li className="pl-4">• Teams receive a bonus for drafting the tournament winner:</li>
                <li className="pl-4">• $10 if winner was team's lowest ranked player</li>
                <li className="pl-4">• $20 if winner was team's middle ranked player</li>
                <li className="pl-4">• $30 if winner was team's highest ranked player</li>
                
                <li className="font-medium text-gray-800 mt-2">Bonus Payment Structure:</li>
                <li className="pl-4">• Last place team pays first $10 of bonus</li>
                <li className="pl-4">• Second-to-last team pays next $10</li>
                <li className="pl-4">• Third-to-last team pays final $10</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Example Scenario */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-start space-x-4">
            <Award className="h-6 w-6 text-yellow-500 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Example Scenario</h2>
              <p className="text-gray-600 mb-4">Here's how payouts work with 4 teams:</p>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <p className="font-medium text-gray-800">Final Scores:</p>
                <ul className="space-y-2 text-gray-600">
                  <li>• Team A: -4 (3rd place)</li>
                  <li>• Team B: -10 (1st place, has tournament winner)</li>
                  <li>• Team C: +5 (4th place)</li>
                  <li>• Team D: -1 (2nd place)</li>
                </ul>

                <p className="font-medium text-gray-800 mt-4">Payout Calculation:</p>
                <ul className="space-y-2 text-gray-600">
                  <li>• Team B wins $30 from stroke differences</li>
                  <li>• Team B gets $20 bonus (tournament winner was their 2nd pick)</li>
                  <li>• Team C (last place) pays $15 + $10 bonus</li>
                  <li>• Team D (2nd place) pays $9 + $10 bonus</li>
                  <li>• Team A (3rd place) pays $6</li>
                </ul>

                <p className="font-medium text-gray-800 mt-4">Final Results:</p>
                <ul className="space-y-2 text-gray-600">
                  <li>• Team B: Wins $50 total ($30 from strokes + $20 bonus)</li>
                  <li>• Team A: Loses $6</li>
                  <li>• Team D: Loses $19 ($9 + $10 bonus)</li>
                  <li>• Team C: Loses $25 ($15 + $10 bonus)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}