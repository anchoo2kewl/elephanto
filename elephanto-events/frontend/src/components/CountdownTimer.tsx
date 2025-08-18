import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: string; // YYYY-MM-DD format
  className?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ 
  targetDate, 
  className = "" 
}) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = new Date(`${targetDate}T18:30:00`).getTime(); // 6:30 PM on target date
      const now = new Date().getTime();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className={`text-center ${className}`}>
      <div className="flex justify-center space-x-4">
        <div className="text-center">
          <div className="text-2xl sm:text-4xl font-bold text-yellow-600 dark:text-yellow-400">
            {timeLeft.days}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Days</div>
        </div>
        <div className="text-center">
          <div className="text-2xl sm:text-4xl font-bold text-yellow-600 dark:text-yellow-400">
            {timeLeft.hours}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Hours</div>
        </div>
        <div className="text-center">
          <div className="text-2xl sm:text-4xl font-bold text-yellow-600 dark:text-yellow-400">
            {timeLeft.minutes}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Minutes</div>
        </div>
        <div className="text-center">
          <div className="text-2xl sm:text-4xl font-bold text-yellow-600 dark:text-yellow-400">
            {timeLeft.seconds}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Seconds</div>
        </div>
      </div>
    </div>
  );
};