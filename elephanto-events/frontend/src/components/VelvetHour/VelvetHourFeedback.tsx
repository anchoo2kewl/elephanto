import React, { useState } from 'react';
import { VelvetHourFeedbackProps, FEEDBACK_REASONS } from '@/types/velvet-hour';

export const VelvetHourFeedback: React.FC<VelvetHourFeedbackProps> = ({
  match,
  onSubmitFeedback,
  currentUserId
}) => {
  const [wantToConnect, setWantToConnect] = useState<boolean | null>(null);
  const [feedbackReason, setFeedbackReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const partnerName = match.user1Id === currentUserId ? match.user2Name : match.user1Name;

  const handleSubmit = async () => {
    if (wantToConnect === null || !feedbackReason) return;

    setIsSubmitting(true);
    try {
      await onSubmitFeedback(match.id, wantToConnect, feedbackReason);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = wantToConnect !== null && feedbackReason;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center text-white max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="text-4xl mb-4">✨</div>
          <h1 className="text-2xl font-bold mb-2">
            How was your chat with {partnerName || 'your match'}?
          </h1>
          <p className="text-white/80">
            Your feedback helps us create better connections
          </p>
        </div>

        {/* Question 1: Want to connect */}
        <div className="mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-lg font-semibold mb-4">
              Would you like to further connect with {partnerName || 'them'} again?
            </h2>
            
            <div className="space-y-3">
              <button
                onClick={() => setWantToConnect(true)}
                className={`
                  w-full py-4 px-6 rounded-xl font-semibold text-lg
                  transition-all duration-200 transform hover:scale-105
                  ${wantToConnect === true
                    ? 'bg-gradient-to-r from-green-500 to-green-600 border-2 border-green-400 shadow-lg shadow-green-500/30'
                    : 'bg-white/10 border-2 border-white/30 hover:bg-white/20'
                  }
                `}
              >
                👍 Yes, I'd love to connect!
              </button>
              
              <button
                onClick={() => setWantToConnect(false)}
                className={`
                  w-full py-4 px-6 rounded-xl font-semibold text-lg
                  transition-all duration-200 transform hover:scale-105
                  ${wantToConnect === false
                    ? 'bg-gradient-to-r from-gray-500 to-gray-600 border-2 border-gray-400 shadow-lg shadow-gray-500/30'
                    : 'bg-white/10 border-2 border-white/30 hover:bg-white/20'
                  }
                `}
              >
                👋 Not this time
              </button>
            </div>
          </div>
        </div>

        {/* Question 2: What did you like most */}
        <div className="mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-lg font-semibold mb-4">
              What did you like most about them?
            </h2>
            
            <div className="grid grid-cols-1 gap-3">
              {FEEDBACK_REASONS.map((reason) => (
                <button
                  key={reason.value}
                  onClick={() => setFeedbackReason(reason.value)}
                  className={`
                    py-3 px-4 rounded-lg text-left font-medium
                    transition-all duration-200 transform hover:scale-105
                    ${feedbackReason === reason.value
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 border-2 border-blue-400 shadow-lg shadow-blue-500/30'
                      : 'bg-white/10 border-2 border-white/30 hover:bg-white/20'
                    }
                  `}
                >
                  {reason.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!isFormValid || isSubmitting}
          className={`
            w-full py-4 px-8 rounded-xl font-bold text-xl
            transition-all duration-200 transform hover:scale-105
            ${isFormValid && !isSubmitting
              ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 shadow-lg shadow-purple-500/30 border-2 border-purple-400'
              : 'bg-gray-600 cursor-not-allowed opacity-50 border-2 border-gray-500'
            }
          `}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Submitting...</span>
            </div>
          ) : (
            'Submit Feedback 🚀'
          )}
        </button>

        {/* Help text */}
        <p className="mt-6 text-xs text-white/50">
          Your responses are private and help us improve future matches
        </p>
      </div>
    </div>
  );
};