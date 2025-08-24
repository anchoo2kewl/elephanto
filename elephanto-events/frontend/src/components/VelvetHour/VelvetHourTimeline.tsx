import React from 'react';

interface VelvetHourTimelineProps {
  currentRound: number;
  totalRounds: number;
  showOnlyDuringRounds?: boolean;
}

export const VelvetHourTimeline: React.FC<VelvetHourTimelineProps> = ({
  currentRound,
  totalRounds,
  showOnlyDuringRounds = false
}) => {
  // If showOnlyDuringRounds is true, only show completed and current round, hide future ones
  return (
    <div className="mb-6">
      <div className="flex justify-center items-center space-x-2 mb-2">
        {Array.from({ length: totalRounds }, (_, i) => {
          const roundNumber = i + 1;
          const isCompleted = roundNumber < currentRound;
          const isCurrent = roundNumber === currentRound;
          const isFuture = roundNumber > currentRound;
          
          // If showOnlyDuringRounds is true, don't show future rounds during active rounds
          if (showOnlyDuringRounds && isFuture) {
            return null;
          }
          
          return (
            <div
              key={i}
              className={`
                w-3 h-3 rounded-full transition-all duration-300
                ${isCompleted ? 'bg-green-400 shadow-lg shadow-green-400/50' : 
                  isCurrent ? 'bg-blue-400 shadow-lg shadow-blue-400/50 animate-pulse' :
                  'bg-white/30'}
              `}
            />
          );
        })}
      </div>
      <p className="text-sm text-white/70">
        Round {currentRound} of {totalRounds}
      </p>
    </div>
  );
};