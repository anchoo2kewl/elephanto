import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { GlassCard } from './GlassCard';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <GlassCard variant="subtle" className="p-2">
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg transition-all duration-300 hover:bg-white/20 dark:hover:bg-white/10"
        aria-label="Toggle theme"
      >
        {theme === 'light' ? (
          <Moon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        ) : (
          <Sun className="h-5 w-5 text-yellow-400" />
        )}
      </button>
    </GlassCard>
  );
};