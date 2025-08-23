import React from 'react';
import { VelvetHourMatchProps } from '@/types/velvet-hour';

const getColorClasses = (color: string) => {
  const colorMap: Record<string, string> = {
    red: 'from-red-500 to-red-700 border-red-300',
    blue: 'from-blue-500 to-blue-700 border-blue-300',
    green: 'from-green-500 to-green-700 border-green-300',
    purple: 'from-purple-500 to-purple-700 border-purple-300',
    orange: 'from-orange-500 to-orange-700 border-orange-300',
    yellow: 'from-yellow-500 to-yellow-700 border-yellow-300',
    pink: 'from-pink-500 to-pink-700 border-pink-300',
    cyan: 'from-cyan-500 to-cyan-700 border-cyan-300',
    indigo: 'from-indigo-500 to-indigo-700 border-indigo-300',
    teal: 'from-teal-500 to-teal-700 border-teal-300',
    lime: 'from-lime-500 to-lime-700 border-lime-300',
    rose: 'from-rose-500 to-rose-700 border-rose-300',
    amber: 'from-amber-500 to-amber-700 border-amber-300',
    emerald: 'from-emerald-500 to-emerald-700 border-emerald-300',
    violet: 'from-violet-500 to-violet-700 border-violet-300',
    sky: 'from-sky-500 to-sky-700 border-sky-300',
  };
  
  return colorMap[color] || 'from-gray-500 to-gray-700 border-gray-300';
};

export const VelvetHourMatch: React.FC<VelvetHourMatchProps> = ({
  match,
  onConfirmMatch,
  currentUserId
}) => {
  const partnerName = match.user1Id === currentUserId ? match.user2Name : match.user1Name;
  const userConfirmed = 
    (match.user1Id === currentUserId && match.confirmedUser1) ||
    (match.user2Id === currentUserId && match.confirmedUser2);
  const partnerConfirmed = 
    (match.user1Id === currentUserId && match.confirmedUser2) ||
    (match.user2Id === currentUserId && match.confirmedUser1);

  const colorClasses = getColorClasses(match.matchColor);

  const handleConfirm = () => {
    if (!userConfirmed) {
      onConfirmMatch(match.id);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center text-white max-w-lg mx-auto">
        {/* Large match number with colored background */}
        <div 
          className={`
            w-72 h-72 mx-auto mb-8 rounded-full
            bg-gradient-to-br ${colorClasses}
            flex items-center justify-center
            border-8 shadow-2xl
            animate-pulse
          `}
        >
          <div className="text-8xl font-bold text-white drop-shadow-2xl">
            {match.matchNumber}
          </div>
        </div>

        {/* Match instructions */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">
            Find Your Match!
          </h1>
          <p className="text-xl mb-2">
            Look for someone with number
          </p>
          <div className="text-4xl font-bold text-cyan-300 mb-4">
            {match.matchNumber}
          </div>
          <p className="text-lg text-white/80">
            They'll have the same color background as you
          </p>
        </div>

        {/* Partner information */}
        {partnerName && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 mb-6">
            <p className="text-sm text-white/70 mb-1">Your match is:</p>
            <p className="text-2xl font-bold">{partnerName}</p>
          </div>
        )}

        {/* Confirmation status */}
        <div className="mb-8">
          {userConfirmed && partnerConfirmed ? (
            <div className="bg-green-500/20 rounded-xl p-6 border border-green-400/30">
              <div className="text-green-300 text-2xl mb-2">✓ Both Confirmed!</div>
              <p className="text-white/80">Starting your 10-minute chat...</p>
            </div>
          ) : userConfirmed ? (
            <div className="bg-yellow-500/20 rounded-xl p-6 border border-yellow-400/30">
              <div className="text-yellow-300 text-xl mb-2">✓ You're confirmed!</div>
              <p className="text-white/80">Waiting for {partnerName || 'your match'} to confirm...</p>
            </div>
          ) : (
            <button
              onClick={handleConfirm}
              className="
                w-full py-4 px-8 rounded-xl
                bg-gradient-to-r from-green-500 to-green-600
                hover:from-green-400 hover:to-green-500
                text-white font-bold text-xl
                transition-all duration-200 transform hover:scale-105
                shadow-lg shadow-green-500/30
                border border-green-400/50
              "
            >
              Found Them! 🎉
            </button>
          )}
        </div>

        {/* Status indicators */}
        <div className="flex justify-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className={`
              w-3 h-3 rounded-full 
              ${userConfirmed ? 'bg-green-400' : 'bg-gray-400'}
            `}></div>
            <span className={userConfirmed ? 'text-green-300' : 'text-gray-400'}>
              You
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`
              w-3 h-3 rounded-full 
              ${partnerConfirmed ? 'bg-green-400' : 'bg-gray-400'}
            `}></div>
            <span className={partnerConfirmed ? 'text-green-300' : 'text-gray-400'}>
              {partnerName || 'Partner'}
            </span>
          </div>
        </div>

        {/* Help text */}
        <div className="mt-8 text-xs text-white/50">
          <p>Can't find your match? Look around the venue for someone</p>
          <p>holding their phone with the same number and color.</p>
        </div>
      </div>
    </div>
  );
};