import React from 'react';

export const DocumentIcon: React.FC = () => {
  return (
    <div className="flex justify-center">
      <svg
        width="60"
        height="60"
        viewBox="0 0 100 100"
        className="text-white opacity-80"
        fill="currentColor"
      >
        {/* Document background */}
        <path 
          d="M15 10 L15 90 L85 90 L85 25 L70 10 Z" 
          fill="white" 
          stroke="rgba(255,255,255,0.6)" 
          strokeWidth="1"
        />
        
        {/* Folded corner */}
        <path 
          d="M70 10 L70 25 L85 25 Z" 
          fill="rgba(200,200,200,0.3)" 
          stroke="rgba(255,255,255,0.6)" 
          strokeWidth="1"
        />
        
        {/* Document lines */}
        <rect x="25" y="35" width="40" height="2" fill="rgba(150,150,150,0.7)" />
        <rect x="25" y="45" width="25" height="2" fill="rgba(150,150,150,0.7)" />
        <rect x="25" y="55" width="35" height="2" fill="rgba(150,150,150,0.7)" />
        <rect x="25" y="65" width="30" height="2" fill="rgba(150,150,150,0.7)" />
        
        {/* Letter 'W' overlay */}
        <g transform="translate(60, 70)">
          <path 
            d="M 0 0 L 2 10 L 4 5 L 6 10 L 8 0" 
            stroke="rgba(0,0,0,0.8)" 
            strokeWidth="1.5" 
            fill="none"
          />
        </g>
      </svg>
    </div>
  );
};