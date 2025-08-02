import React from 'react';

export const TorontoSkylineSVG: React.FC = () => {
  return (
    <div className="flex justify-center">
      <svg
        width="400"
        height="140"
        viewBox="0 0 400 140"
        className="drop-shadow-lg"
      >
        {/* Toronto Skyline */}

        {/* Left side buildings */}
        <rect x="20" y="80" width="15" height="40" fill="#6B7280" />
        <rect x="22" y="85" width="2" height="2" fill="#9CA3AF" />
        <rect x="25" y="85" width="2" height="2" fill="#9CA3AF" />
        <rect x="28" y="85" width="2" height="2" fill="#9CA3AF" />
        <rect x="22" y="90" width="2" height="2" fill="#9CA3AF" />
        <rect x="25" y="90" width="2" height="2" fill="#9CA3AF" />
        <rect x="28" y="90" width="2" height="2" fill="#9CA3AF" />

        <rect x="45" y="70" width="12" height="50" fill="#4B5563" />
        <rect x="47" y="75" width="2" height="2" fill="#9CA3AF" />
        <rect x="50" y="75" width="2" height="2" fill="#9CA3AF" />
        <rect x="53" y="75" width="2" height="2" fill="#9CA3AF" />
        <rect x="47" y="80" width="2" height="2" fill="#9CA3AF" />
        <rect x="50" y="80" width="2" height="2" fill="#9CA3AF" />
        <rect x="53" y="80" width="2" height="2" fill="#9CA3AF" />

        <rect x="65" y="85" width="10" height="35" fill="#6B7280" />
        <rect x="67" y="90" width="2" height="2" fill="#9CA3AF" />
        <rect x="70" y="90" width="2" height="2" fill="#9CA3AF" />
        <rect x="67" y="95" width="2" height="2" fill="#9CA3AF" />
        <rect x="70" y="95" width="2" height="2" fill="#9CA3AF" />

        <rect x="85" y="75" width="18" height="45" fill="#374151" />
        <rect x="87" y="80" width="2" height="2" fill="#9CA3AF" />
        <rect x="90" y="80" width="2" height="2" fill="#9CA3AF" />
        <rect x="93" y="80" width="2" height="2" fill="#9CA3AF" />
        <rect x="96" y="80" width="2" height="2" fill="#9CA3AF" />
        <rect x="99" y="80" width="2" height="2" fill="#9CA3AF" />

        {/* Rogers Centre - now placed between the building and CN Tower */}
        <ellipse cx="150" cy="110" rx="20" ry="8" fill="#D1D5DB" />
        <ellipse cx="150" cy="110" rx="16" ry="6" fill="none" stroke="#9CA3AF" strokeWidth="0.5" />
        <ellipse cx="150" cy="110" rx="12" ry="4" fill="none" stroke="#9CA3AF" strokeWidth="0.5" />
        <ellipse cx="150" cy="110" rx="6" ry="2" fill="#6B7280" />

        {/* CN Tower */}
        <rect x="198" y="20" width="4" height="100" fill="#4B5563" />
        <ellipse cx="200" cy="50" rx="8" ry="3" fill="#6B7280" />
        <ellipse cx="200" cy="60" rx="6" ry="2" fill="#6B7280" />
        <rect x="199" y="10" width="2" height="15" fill="#374151" />
        <circle cx="200" cy="8" r="1" fill="#EF4444" />

        {/* Right side buildings */}
        <rect x="220" y="65" width="16" height="55" fill="#4B5563" />
        <rect x="222" y="70" width="2" height="2" fill="#9CA3AF" />
        <rect x="225" y="70" width="2" height="2" fill="#9CA3AF" />
        <rect x="228" y="70" width="2" height="2" fill="#9CA3AF" />
        <rect x="231" y="70" width="2" height="2" fill="#9CA3AF" />

        <rect x="245" y="55" width="14" height="65" fill="#6B7280" />
        <rect x="247" y="60" width="2" height="2" fill="#9CA3AF" />
        <rect x="250" y="60" width="2" height="2" fill="#9CA3AF" />
        <rect x="253" y="60" width="2" height="2" fill="#9CA3AF" />
        <rect x="256" y="60" width="2" height="2" fill="#9CA3AF" />

        <rect x="270" y="40" width="20" height="80" fill="#374151" />
        <rect x="272" y="45" width="2" height="2" fill="#9CA3AF" />
        <rect x="275" y="45" width="2" height="2" fill="#9CA3AF" />
        <rect x="278" y="45" width="2" height="2" fill="#9CA3AF" />
        <rect x="281" y="45" width="2" height="2" fill="#9CA3AF" />
        <rect x="284" y="45" width="2" height="2" fill="#9CA3AF" />
        <rect x="287" y="45" width="2" height="2" fill="#9CA3AF" />

        <rect x="300" y="70" width="12" height="50" fill="#6B7280" />
        <rect x="302" y="75" width="2" height="2" fill="#9CA3AF" />
        <rect x="305" y="75" width="2" height="2" fill="#9CA3AF" />
        <rect x="308" y="75" width="2" height="2" fill="#9CA3AF" />

        <rect x="320" y="80" width="15" height="40" fill="#4B5563" />
        <rect x="322" y="85" width="2" height="2" fill="#9CA3AF" />
        <rect x="325" y="85" width="2" height="2" fill="#9CA3AF" />
        <rect x="328" y="85" width="2" height="2" fill="#9CA3AF" />
        <rect x="331" y="85" width="2" height="2" fill="#9CA3AF" />

        {/* Reflections */}
        <g opacity="0.3">
          <rect x="20" y="130" width="15" height="20" fill="#6B7280" transform="scale(1,-1) translate(0,-260)" />
          <rect x="45" y="130" width="12" height="25" fill="#4B5563" transform="scale(1,-1) translate(0,-260)" />
          <ellipse cx="150" cy="135" rx="20" ry="5" fill="#D1D5DB" transform="scale(1,-1) translate(0,-270)" />
          <rect x="198" y="130" width="4" height="50" fill="#4B5563" transform="scale(1,-1) translate(0,-260)" />
          <rect x="220" y="130" width="16" height="27" fill="#4B5563" transform="scale(1,-1) translate(0,-260)" />
          <rect x="245" y="130" width="14" height="32" fill="#6B7280" transform="scale(1,-1) translate(0,-260)" />
          <rect x="270" y="130" width="20" height="40" fill="#374151" transform="scale(1,-1) translate(0,-260)" />
        </g>

        <line x1="0" y1="125" x2="400" y2="125" stroke="#94A3B8" strokeWidth="2" opacity="0.7" />
      </svg>
    </div>
  );
};
