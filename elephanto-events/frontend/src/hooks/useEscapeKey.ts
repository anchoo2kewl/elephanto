import { useEffect } from 'react';

/**
 * Custom hook to handle ESC key press events
 * @param callback - Function to call when ESC is pressed
 * @param isEnabled - Whether the hook should be active (default: true)
 */
export const useEscapeKey = (callback: () => void, isEnabled: boolean = true) => {
  useEffect(() => {
    if (!isEnabled) return;

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        callback();
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleEscapeKey);

    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [callback, isEnabled]);
};