import React from 'react';
import { VelvetHourWaitingProps } from '@/types/velvet-hour';
import { VelvetHourTimeline } from './VelvetHourTimeline';

export const VelvetHourWaiting: React.FC<VelvetHourWaitingProps> = ({
  onJoin,
  participantCount,
  hasJoined,
  isConnected,
  config,
  isInActiveRound,
  currentRound,
  timeLeft,
  partnerName,
  matchNumber,
  matchColor
}) => {
  // Helper function to format time (unused but keeping for potential future use)
  // const formatTime = (seconds: number) => {
  //   const mins = Math.floor(seconds / 60);
  //   const secs = seconds % 60;
  //   return `${mins}:${secs.toString().padStart(2, '0')}`;
  // };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 flex items-center justify-center px-4">
      <div className="text-center text-white max-w-lg mx-auto">
        {/* Timeline showing progress through rounds */}
        {hasJoined && currentRound && config?.totalRounds && (
          <VelvetHourTimeline 
            currentRound={currentRound} 
            totalRounds={config.totalRounds}
            showOnlyDuringRounds={false}
          />
        )}

        {/* Timer or Join/Waiting state */}
        <div className="mb-8 relative">
          {hasJoined && timeLeft && timeLeft > 0 ? (
            // Show timer with same styling as matched users
            <div className="relative w-64 h-64 mx-auto">
              {(() => {
                const minutes = Math.floor(timeLeft / 60);
                const seconds = timeLeft % 60;
                const roundDuration = (config?.roundDuration || 10) * 60; // Convert to seconds
                const progress = ((roundDuration - timeLeft) / roundDuration) * 100;
                const isUrgent = timeLeft <= 60;
                const isWarning = timeLeft <= 180;
                
                return (
                  <>
                    {/* Background circle with gradient */}
                    <div className={`
                      w-full h-full rounded-full flex items-center justify-center
                      bg-gradient-to-br shadow-2xl relative
                      ${isUrgent 
                        ? 'from-red-500 to-red-700 animate-pulse' 
                        : isWarning 
                          ? 'from-yellow-500 to-orange-600' 
                          : 'from-blue-500 to-blue-700'
                      }
                    `}>
                      <div className="text-center text-white z-10">
                        <div className="text-lg font-semibold mb-1">ROUND {currentRound}</div>
                        <div className={`
                          text-5xl font-mono font-bold mb-2
                          ${isUrgent ? 'animate-pulse' : ''}
                        `}>
                          {minutes}:{seconds.toString().padStart(2, '0')}
                        </div>
                        <div className="text-sm opacity-80">
                          {isUrgent ? 'FINAL MINUTE!' : isWarning ? 'WRAPPING UP' : 'TIME LEFT'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress ring overlay */}
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="47"
                        fill="transparent"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth="4"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="47"
                        fill="transparent"
                        stroke={isUrgent ? "#fecaca" : isWarning ? "#fed7aa" : "#bfdbfe"}
                        strokeWidth="4"
                        strokeDasharray={`${2 * Math.PI * 47}`}
                        strokeDashoffset={`${2 * Math.PI * 47 * (1 - progress / 100)}`}
                        className="transition-all duration-1000 ease-linear"
                        strokeLinecap="round"
                      />
                    </svg>
                  </>
                );
              })()}
            </div>
          ) : (
            // Show animated rings for waiting/join state
            <div className="relative flex items-center justify-center" style={{height: '320px'}}>
              {/* Rotating outer rings */}
              <div className="absolute w-80 h-80 rounded-full border-4 border-cyan-400/30 animate-spin" style={{animationDuration: '8s'}}></div>
              <div className="absolute w-72 h-72 rounded-full border-4 border-green-400/40 animate-spin" style={{animationDuration: '6s', animationDirection: 'reverse'}}></div>
              <div className="absolute w-64 h-64 rounded-full border-4 border-white/20 animate-spin" style={{animationDuration: '4s'}}></div>
              
              {/* Main center button */}
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
                  {hasJoined ? (
                    // Show waiting room state
                    <div>
                      <div className="text-2xl font-bold mb-2">IN THE</div>
                      <div className="text-xl font-semibold">WAITING</div>
                      <div className="text-2xl font-bold">ROOM</div>
                    </div>
                  ) : (
                    // Show join button
                    <div>
                      <div className="text-2xl font-bold mb-2">JOIN</div>
                      <div className="text-xl font-semibold">VELVET</div>
                      <div className="text-2xl font-bold">HOUR</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status message */}
        <div className="mb-6">
          {hasJoined ? (
            <div>
              {partnerName ? (
                // User is matched with someone - show large partner name
                <div>
                  <h1 className="text-4xl font-bold mb-2 text-white">
                    {partnerName}
                  </h1>
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold
                      ${matchColor === 'red' ? 'bg-red-500' :
                        matchColor === 'blue' ? 'bg-blue-500' :
                        matchColor === 'green' ? 'bg-green-500' :
                        matchColor === 'purple' ? 'bg-purple-500' :
                        matchColor === 'orange' ? 'bg-orange-500' :
                        matchColor === 'yellow' ? 'bg-yellow-500' :
                        matchColor === 'pink' ? 'bg-pink-500' :
                        'bg-cyan-500'
                      }`}>
                      {matchNumber}
                    </div>
                    <span className="text-lg text-white/80 capitalize">{matchColor} Room</span>
                  </div>
                </div>
              ) : timeLeft && timeLeft > 0 && isInActiveRound ? (
                // User is in active round but not matched
                <div>
                  <h1 className="text-2xl font-bold mb-3">
                    No Match This Round 😌
                  </h1>
                  <p className="text-lg text-white/80 mb-2">
                    You didn't get paired this round, but don't worry!
                  </p>
                  <p className="text-sm text-white/60">
                    Relax and enjoy the break. You'll be back in the next round!
                  </p>
                </div>
              ) : (
                // Regular waiting state
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