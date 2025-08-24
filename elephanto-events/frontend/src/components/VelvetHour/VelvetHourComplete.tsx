import React from 'react';
import { VelvetHourCompleteProps } from '@/types/velvet-hour';
import { Users, MessageCircle, ArrowRight, Instagram, ExternalLink } from 'lucide-react';

export const VelvetHourComplete: React.FC<VelvetHourCompleteProps> = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
      <div className="text-center text-white max-w-2xl mx-auto">
        {/* Main message */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-6 text-white">
            Velvet Hour Complete
          </h1>
          <p className="text-xl text-white/90 leading-relaxed">
            Thank you for participating in tonight's Velvet Hour experience. We hope you had meaningful conversations and made valuable connections.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Connections made */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
            <div className="flex justify-center mb-4">
              <Users className="h-12 w-12 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-white">Conversations</h3>
            <p className="text-green-300 text-3xl font-bold mb-2">2</p>
            <p className="text-white/70">Total rounds completed</p>
          </div>

          {/* Network expansion */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
            <div className="flex justify-center mb-4">
              <MessageCircle className="h-12 w-12 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-white">Connections</h3>
            <p className="text-blue-300 text-3xl font-bold mb-2">New</p>
            <p className="text-white/70">Professional network expanded</p>
          </div>
        </div>

        {/* Next steps */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20 mb-8">
          <h2 className="text-2xl font-semibold mb-8 text-white">Continue Your Journey</h2>
          
          <div className="space-y-6 text-left">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-blue-500/20 border border-blue-400/50 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Network & Connect</h4>
                <p className="text-white/80 leading-relaxed">
                  Exchange contact information with participants you connected with during the sessions
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-purple-500/20 border border-purple-400/50 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <MessageCircle className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Continue Conversations</h4>
                <p className="text-white/80 leading-relaxed">
                  Explore the venue and engage with other attendees throughout the remainder of the event
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-green-500/20 border border-green-400/50 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <ExternalLink className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Stay Informed</h4>
                <p className="text-white/80 leading-relaxed">
                  Follow us for updates on future networking events and Velvet Hour sessions
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
              w-full py-4 px-8 rounded-xl font-semibold text-lg text-white
              bg-blue-600 hover:bg-blue-500
              transition-all duration-200 transform hover:scale-105
              shadow-lg shadow-blue-500/30
              border border-blue-400/50
              flex items-center justify-center space-x-2
            "
          >
            <span>Return to Event Dashboard</span>
            <ArrowRight className="h-5 w-5" />
          </button>

          <button 
            onClick={() => window.open('https://www.instagram.com/elephantoevents/', '_blank')}
            className="
              w-full py-3 px-6 rounded-xl font-medium text-white
              bg-white/10 hover:bg-white/20
              border border-white/30 hover:border-white/50
              transition-all duration-200
              flex items-center justify-center space-x-2
            "
          >
            <Instagram className="h-5 w-5" />
            <span>Follow Elephanto Events</span>
          </button>
        </div>

        {/* Thank you message */}
        <div className="mt-12 pt-8 border-t border-white/20">
          <p className="text-lg font-medium text-white mb-3">
            Thank you for your participation
          </p>
          <p className="text-white/70 leading-relaxed">
            Your engagement helps us build stronger professional communities and create meaningful networking opportunities for everyone involved.
          </p>
        </div>
      </div>
    </div>
  );
};