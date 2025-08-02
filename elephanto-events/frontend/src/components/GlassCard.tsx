import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'subtle';
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  variant = 'default' 
}) => {
  const baseClasses = 'rounded-2xl border border-white/20 dark:border-white/10';
  
  const variantClasses = {
    default: 'bg-white/40 dark:bg-gray-900/40 backdrop-blur-md shadow-lg',
    elevated: 'bg-white/50 dark:bg-gray-900/50 backdrop-blur-lg shadow-xl border-white/40 dark:border-gray-700/40',
    subtle: 'bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm shadow-md',
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
};