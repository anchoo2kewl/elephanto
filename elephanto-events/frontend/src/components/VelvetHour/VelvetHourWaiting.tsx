import React from 'react';
import { VelvetHourWaitingProps } from '@/types/velvet-hour';

export const VelvetHourWaiting: React.FC<VelvetHourWaitingProps> = ({
  onJoin,
  participantCount,
  hasJoined
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center text-white max-w-lg mx-auto">
        {/* Animated circular button with concentric rings */}
        <div className="relative mb-8 flex items-center justify-center">
          {/* Outer animated ring */}
          <div className="absolute w-80 h-80 rounded-full border-4 border-cyan-400/30 animate-pulse"></div>
          <div className="absolute w-72 h-72 rounded-full border-4 border-green-400/30 animate-pulse" style={{animationDelay: '0.5s'}}></div>
          <div className="absolute w-64 h-64 rounded-full border-4 border-white/20 animate-pulse" style={{animationDelay: '1s'}}></div>
          
          {/* Main button */}
          <button
            onClick={onJoin}
            disabled={hasJoined}
            className={`
              relative w-56 h-56 rounded-full flex items-center justify-center
              bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600
              hover:from-cyan-300 hover:via-blue-400 hover:to-purple-500
              transition-all duration-300 transform hover:scale-105
              shadow-2xl shadow-blue-500/30
              ${hasJoined ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="text-center">
              <div className="text-2xl font-bold mb-2">
                {hasJoined ? 'JOINED' : 'CONNECT'}
              </div>
              <div className="text-xl font-semibold">
                {hasJoined ? 'WAITING' : 'WITH YOUR'}
              </div>
              <div className="text-2xl font-bold">
                {hasJoined ? '...' : 'MATCH'}
              </div>
            </div>
          </button>
        </div>

        {/* Status message */}
        <div className="mb-6">
          {hasJoined ? (
            <div>
              <h1 className="text-2xl font-bold mb-3">
                You're In! 🎉
              </h1>
              <p className="text-lg text-white/80 mb-2">
                Waiting for the next round to begin...
              </p>
              {participantCount > 0 && (
                <p className="text-sm text-white/60">
                  {participantCount} participants joined
                </p>
              )}
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold mb-3">
                Ready to Meet Someone Amazing?
              </h1>
              <p className="text-lg text-white/80">
                Tap the button to join Velvet Hour and connect with other attendees
              </p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <h2 className="text-lg font-semibold mb-3">How it Works:</h2>
          <div className="space-y-2 text-sm text-white/90">
            <div className="flex items-center space-x-3">
              <span className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <span>You'll be matched with another attendee</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <span>Find them using your match number and color</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <span>Chat for 10 minutes and get to know each other</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <span>Share feedback and repeat for 4 rounds total</span>
            </div>
          </div>
        </div>

        {!hasJoined && (
          <p className="mt-6 text-xs text-white/50">
            Make sure you're marked as attending this event to participate
          </p>
        )}
      </div>
    </div>
  );
};