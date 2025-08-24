import React from 'react';
import { VelvetHourRoundProps } from '@/types/velvet-hour';
import { VelvetHourTimeline } from './VelvetHourTimeline';
import { VelvetHourTimer } from './VelvetHourTimer';

export const VelvetHourRound: React.FC<VelvetHourRoundProps> = ({
  match,
  timeLeft,
  currentRound,
  totalRounds,
  currentUserId,
  roundDuration = 10 // Default to 10 minutes if not provided
}) => {
  const partnerName = match.user1Id === currentUserId ? match.user2Name : match.user1Name;
  
  // Calculate total round time in seconds
  const totalRoundTime = roundDuration * 60; // Convert minutes to seconds
  const isUrgent = timeLeft <= 60; // Last minute
  const isWarning = timeLeft <= 180; // Last 3 minutes

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
      <div className="text-center text-white max-w-lg mx-auto">
        {/* Timeline showing progress through rounds */}
        <VelvetHourTimeline 
          currentRound={currentRound} 
          totalRounds={totalRounds}
          showOnlyDuringRounds={true}
        />

        {/* Timer with integrated progress ring */}
        <VelvetHourTimer 
          timeLeft={timeLeft}
          totalTime={totalRoundTime}
          title="TIME LEFT"
        />

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