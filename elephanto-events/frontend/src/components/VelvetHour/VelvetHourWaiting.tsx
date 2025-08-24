import React from 'react';
import { VelvetHourWaitingProps } from '@/types/velvet-hour';

export const VelvetHourWaiting: React.FC<VelvetHourWaitingProps> = ({
  onJoin,
  participantCount,
  hasJoined,
  isConnected,
  config
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 flex items-center justify-center px-4">
      <div className="text-center text-white max-w-lg mx-auto">
        {/* Animated circular button with rotating rings */}
        <div className="relative mb-8 flex items-center justify-center" style={{height: '320px'}}>
          {/* Rotating outer rings - positioned behind the button */}
          <div className="absolute w-80 h-80 rounded-full border-4 border-cyan-400/30 animate-spin" style={{animationDuration: '8s'}}></div>
          <div className="absolute w-72 h-72 rounded-full border-4 border-green-400/40 animate-spin" style={{animationDuration: '6s', animationDirection: 'reverse'}}></div>
          <div className="absolute w-64 h-64 rounded-full border-4 border-white/20 animate-spin" style={{animationDuration: '4s'}}></div>
          
          {/* Main center logo/button - positioned to avoid ring overlap */}
          <div
            className={`
              absolute w-56 h-56 rounded-full flex items-center justify-center
              bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600
              shadow-2xl shadow-blue-500/30
              ${hasJoined ? 'opacity-90' : 'cursor-pointer hover:from-cyan-300 hover:via-blue-400 hover:to-purple-500 transition-all duration-300 transform hover:scale-105'}
            `}
            style={{zIndex: 10}}
            onClick={!hasJoined ? onJoin : undefined}
          >
            <div className="text-center text-white" style={{zIndex: 20}}>
              <div className="text-2xl font-bold mb-2">
                {hasJoined ? 'IN THE' : 'JOIN'}
              </div>
              <div className="text-xl font-semibold">
                {hasJoined ? 'WAITING' : 'VELVET'}
              </div>
              <div className="text-2xl font-bold">
                {hasJoined ? 'ROOM' : 'HOUR'}
              </div>
            </div>
          </div>
        </div>

        {/* Status message */}
        <div className="mb-6">
          {hasJoined ? (
            <div>
              <h1 className="text-2xl font-bold mb-3">
                You're In! 🎉
              </h1>
              <p className="text-lg text-white/80 mb-2">
                Waiting for the organizer to start the next round...
              </p>
              {participantCount > 0 && (
                <p className="text-sm text-white/60">
                  {participantCount} participants in the waiting room
                </p>
              )}
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold mb-3">
                Ready to Meet Someone Amazing?
              </h1>
              <p className="text-lg text-white/80">
                Join the waiting room for Velvet Hour - an exclusive matchmaking experience
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
              <span>Wait in the lounge until the organizer starts a round</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <span>You'll be matched with another attendee for {config?.roundDuration || 10} minutes</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <span>Find them using your match number and color</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <span>Chat, share feedback, and enjoy {config?.totalRounds || 4} rounds total</span>
            </div>
          </div>
        </div>

        {!hasJoined && (
          <p className="mt-6 text-xs text-white/50">
            Make sure you're marked as attending this event to participate
          </p>
        )}
        
        {/* Connection status */}
        <div className="mt-4 flex items-center justify-center space-x-2">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="text-xs text-white/60">{isConnected ? 'Connected' : 'Connecting...'}</span>
        </div>
      </div>
    </div>
  );
};