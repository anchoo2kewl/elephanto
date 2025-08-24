import React from 'react';

interface VelvetHourTimerProps {
  timeLeft: number;
  totalTime: number;
  title?: string;
  subtitle?: string;
}

export const VelvetHourTimer: React.FC<VelvetHourTimerProps> = ({
  timeLeft,
  totalTime,
  title = "TIME LEFT",
  subtitle
}) => {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // Calculate progress percentage
  const progress = ((totalTime - timeLeft) / totalTime) * 100;
  const isUrgent = timeLeft <= 60; // Last minute
  const isWarning = timeLeft <= 180; // Last 3 minutes

  return (
    <div className="mb-8 relative">
      <div className="relative w-64 h-64 mx-auto">
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
            <div className={`
              text-6xl font-mono font-bold mb-2
              ${isUrgent ? 'animate-pulse' : ''}
            `}>
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
            <div className="text-sm opacity-80">
              {subtitle || (isUrgent ? 'FINAL MINUTE!' : isWarning ? 'WRAPPING UP' : title)}
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
      </div>
    </div>
  );
};