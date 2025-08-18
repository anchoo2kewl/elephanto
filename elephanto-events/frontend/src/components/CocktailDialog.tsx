import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { COCKTAIL_OPTIONS } from '@/constants/survey';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface CocktailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (preference: string) => void;
  currentPreference?: string;
}

// Using shared constants from survey.ts

export const CocktailDialog: React.FC<CocktailDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  currentPreference,
}) => {
  const [selectedPreference, setSelectedPreference] = useState<string>(currentPreference || '');

  // ESC key support
  useEscapeKey(onClose, isOpen);

  useEffect(() => {
    setSelectedPreference(currentPreference || '');
  }, [currentPreference]);

  const handleSave = () => {
    if (selectedPreference) {
      onSave(selectedPreference);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Select Your Drink Preference
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Choose your preferred beverage for the event
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Options */}
        <div className="p-6 space-y-3">
          {COCKTAIL_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`block p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                selectedPreference === option.value
                  ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center">
                <input
                  type="radio"
                  name="cocktail-preference"
                  value={option.value}
                  checked={selectedPreference === option.value}
                  onChange={(e) => setSelectedPreference(e.target.value)}
                  className="sr-only"
                />
                <div className="flex items-center flex-1">
                  <div className="text-2xl mr-4">{option.emoji}</div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {option.label}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {option.description}
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPreference === option.value
                        ? 'border-yellow-500 bg-yellow-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {selectedPreference === option.value && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedPreference}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              selectedPreference
                ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            Save Preference
          </button>
        </div>
      </div>
    </div>
  );
};