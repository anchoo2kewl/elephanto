import React from 'react';
import { VelvetHourRoundProps } from '@/types/velvet-hour';

export const VelvetHourRound: React.FC<VelvetHourRoundProps> = ({
  match,
  timeLeft,
  currentRound,
  totalRounds,
  currentUserId
}) => {
  const partnerName = match.user1Id === currentUserId ? match.user2Name : match.user1Name;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // Calculate progress percentage (assuming 10 minute rounds)
  const totalRoundTime = 10 * 60; // 10 minutes in seconds
  const progress = ((totalRoundTime - timeLeft) / totalRoundTime) * 100;
  const isUrgent = timeLeft <= 60; // Last minute
  const isWarning = timeLeft <= 180; // Last 3 minutes

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center text-white max-w-lg mx-auto">
        {/* Round indicator */}
        <div className="mb-6">
          <div className="flex justify-center items-center space-x-2 mb-2">
            {Array.from({ length: totalRounds }, (_, i) => (
              <div
                key={i}
                className={`
                  w-3 h-3 rounded-full
                  ${i < currentRound ? 'bg-green-400' : 'bg-white/30'}
                `}
              />
            ))}
          </div>
          <p className="text-sm text-white/70">
            Round {currentRound} of {totalRounds}
          </p>
        </div>

        {/* Timer - large and prominent */}
        <div className="mb-8">
          <div className={`
            w-64 h-64 mx-auto rounded-full flex items-center justify-center
            bg-gradient-to-br border-8 shadow-2xl
            ${isUrgent 
              ? 'from-red-500 to-red-700 border-red-300 animate-pulse' 
              : isWarning 
                ? 'from-yellow-500 to-orange-600 border-yellow-300' 
                : 'from-blue-500 to-blue-700 border-blue-300'
            }
          `}>
            <div className="text-center">
              <div className={`
                text-6xl font-mono font-bold mb-2
                ${isUrgent ? 'animate-pulse' : ''}
              `}>
                {minutes}:{seconds.toString().padStart(2, '0')}
              </div>
              <div className="text-sm opacity-80">
                {isUrgent ? 'FINAL MINUTE!' : isWarning ? 'WRAPPING UP' : 'TIME LEFT'}
              </div>
            </div>
          </div>

          {/* Progress ring */}
          <div className="relative w-72 h-72 mx-auto -mt-68 pointer-events-none">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="transparent"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="2"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="transparent"
                stroke={isUrgent ? "#ef4444" : isWarning ? "#f59e0b" : "#3b82f6"}
                strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                className="transition-all duration-1000 ease-linear"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Partner info and conversation prompts */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-4">
            Chat with {partnerName || 'Your Match'}!
          </h1>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-lg font-semibold mb-3">Conversation Starters:</h2>
            <div className="space-y-2 text-sm text-white/90 text-left">
              <p>• What brought you to this event tonight?</p>
              <p>• What's been the highlight of your week?</p>
              <p>• If you could have dinner with anyone, who would it be?</p>
              <p>• What's a skill you'd love to learn?</p>
              <p>• What's your favorite way to unwind?</p>
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div className={`
          rounded-xl p-4 border-2
          ${isUrgent 
            ? 'bg-red-500/20 border-red-400/50' 
            : isWarning 
              ? 'bg-yellow-500/20 border-yellow-400/50' 
              : 'bg-blue-500/20 border-blue-400/50'
          }
        `}>
          <p className="font-medium">
            {isUrgent 
              ? '⏰ Time to wrap up your conversation!'
              : isWarning 
                ? '⚠️ A few minutes remaining'
                : '💬 Enjoy your conversation!'
            }
          </p>
          {!isUrgent && !isWarning && (
            <p className="text-xs text-white/70 mt-1">
              You'll be asked for feedback when time is up
            </p>
          )}
        </div>

        {/* Emergency info */}
        <div className="mt-6 text-xs text-white/40">
          <p>Need help? Find an event organizer</p>
        </div>
      </div>
    </div>
  );
};