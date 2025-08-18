import React from 'react';

interface VelvetHourLogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export const VelvetHourLogo: React.FC<VelvetHourLogoProps> = ({ 
  className = "", 
  size = 'medium' 
}) => {
  const sizeClasses = {
    small: 'h-16',
    medium: 'h-24', 
    large: 'h-30'
  };

  return (
    <div className="relative">
      <img 
        src="/images/velvet-hour-logo.png" 
        alt="Velvet Hour"
        className={`${sizeClasses[size]} ${className} object-contain filter dark:drop-shadow-[0_0_0.3rem_rgba(255,255,255,0.8)] dark:bg-white/10 dark:backdrop-blur-sm dark:rounded-lg dark:p-2`}
        onError={(e) => {
          // Fallback if image doesn't exist yet
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const fallback = document.createElement('div');
          fallback.className = 'flex items-center justify-center bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-bold text-sm px-3 py-1 rounded';
          fallback.textContent = 'VH';
          target.parentNode?.insertBefore(fallback, target);
        }}
      />
    </div>
  );
};
