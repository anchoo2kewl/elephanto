import React from 'react';
import { VelvetHourCompleteProps } from '@/types/velvet-hour';

export const VelvetHourComplete: React.FC<VelvetHourCompleteProps> = () => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center text-white max-w-2xl mx-auto">
        {/* Celebration animation */}
        <div className="mb-8">
          <div className="text-8xl mb-4 animate-bounce">🎉</div>
          <div className="flex justify-center space-x-4 text-4xl mb-6">
            <span className="animate-pulse" style={{animationDelay: '0s'}}>✨</span>
            <span className="animate-pulse" style={{animationDelay: '0.2s'}}>🌟</span>
            <span className="animate-pulse" style={{animationDelay: '0.4s'}}>✨</span>
          </div>
        </div>

        {/* Main message */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
            The Hour is Complete!
          </h1>
          <p className="text-xl text-white/90 mb-6">
            This concludes Velvet Hour for the evening. We hope you enjoyed it and found some new lasting connections!
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Connections made */}
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl p-6 border border-green-400/30">
            <div className="text-3xl mb-3">🤝</div>
            <h3 className="text-lg font-semibold mb-2">Connections Made</h3>
            <p className="text-green-300 text-2xl font-bold">4</p>
            <p className="text-sm text-white/70">Amazing conversations</p>
          </div>

          {/* Mutual interests */}
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl p-6 border border-blue-400/30">
            <div className="text-3xl mb-3">💫</div>
            <h3 className="text-lg font-semibold mb-2">New Experiences</h3>
            <p className="text-blue-300 text-2xl font-bold">∞</p>
            <p className="text-sm text-white/70">Stories and perspectives</p>
          </div>
        </div>

        {/* Next steps */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20 mb-8">
          <h2 className="text-2xl font-semibold mb-6">What's Next?</h2>
          
          <div className="space-y-4 text-left">
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-xs font-bold">📱</span>
              </div>
              <div>
                <h4 className="font-semibold">Connect on Social Media</h4>
                <p className="text-sm text-white/70">
                  Exchange contact information with people you'd like to stay in touch with
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-xs font-bold">🎪</span>
              </div>
              <div>
                <h4 className="font-semibold">Continue the Conversation</h4>
                <p className="text-sm text-white/70">
                  The night is young! Continue mingling and enjoy the rest of the event
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-xs font-bold">📧</span>
              </div>
              <div>
                <h4 className="font-semibold">Stay Updated</h4>
                <p className="text-sm text-white/70">
                  Follow @elephantoevents for future events and Velvet Hour experiences
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Call to action */}
        <div className="space-y-4">
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="
              w-full py-4 px-8 rounded-xl font-bold text-lg
              bg-gradient-to-r from-purple-500 to-pink-500
              hover:from-purple-400 hover:to-pink-400
              transition-all duration-200 transform hover:scale-105
              shadow-lg shadow-purple-500/30
              border border-purple-400/50
            "
          >
            Back to Event Dashboard
          </button>

          <button 
            onClick={() => window.open('https://www.instagram.com/elephantoevents/', '_blank')}
            className="
              w-full py-3 px-6 rounded-xl font-medium
              bg-white/10 hover:bg-white/20
              border border-white/30 hover:border-white/50
              transition-all duration-200 transform hover:scale-105
            "
          >
            Follow Us on Instagram
          </button>
        </div>

        {/* Thank you message */}
        <div className="mt-8 pt-6 border-t border-white/20">
          <p className="text-lg font-medium text-white/90 mb-2">
            Thank you for being part of Velvet Hour! 🙏
          </p>
          <p className="text-sm text-white/60">
            Your participation helps us create meaningful connections in our community
          </p>
        </div>
      </div>
    </div>
  );
};