import React, { useState } from 'react';
import { Mail, Send, CheckCircle } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { TorontoSkylineSVG } from '@/components/TorontoSkylineSVG';
import { authAPI } from '@/services/api';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Attempting to send login request to:', `${(import.meta as any).env.VITE_API_URL}/api/auth/request-login`);
      await authAPI.requestLogin({ email });
      console.log('Login request successful');
      setSent(true);
    } catch (err: any) {
      console.error('Login request failed:', err);
      console.error('Error details:', err.response?.data, err.response?.status);
      setError('Failed to send login link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <div className="relative mb-6">
              <div className="animate-float text-6xl mb-4">🐘</div>
              <TorontoSkylineSVG />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg" style={{color: '#ffffff', textShadow: '2px 2px 4px rgba(0,0,0,0.8)'}}>
              ElephantTO Events
            </h1>
          </div>
          
          <GlassCard variant="elevated" className="p-8 text-center">
            <div className="animate-float mb-6">
              <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Check Your Email! 📧
            </h2>
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/50 rounded-lg p-4 mb-6">
              <p className="text-gray-800 dark:text-gray-200 mb-3">
                We've sent a secure login link to:
              </p>
              <p className="font-semibold text-blue-800 dark:text-blue-300 text-lg">
                {email}
              </p>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-4 text-sm">
              Click the link in your email to sign in securely. The link will expire in 15 minutes.
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-4 px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-all duration-200 font-medium"
            >
              Use Different Email
            </button>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="relative mb-6">
            <div className="animate-float text-6xl mb-4">🐘</div>
            <TorontoSkylineSVG />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg" style={{color: '#ffffff', textShadow: '2px 2px 4px rgba(0,0,0,0.8)'}}>
            ElephantTO Events
          </h1>
          <p className="text-white font-medium" style={{color: '#ffffff', textShadow: '1px 1px 2px rgba(0,0,0,0.8)'}}>
            Making memories, one event at a time in Toronto
          </p>
        </div>

        <GlassCard variant="elevated" className="p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-900 dark:text-gray-100 font-medium">
              Enter your email to login securely
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-gray-900 dark:text-gray-100 mb-2 font-bold">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-600 dark:text-gray-400" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-white/30 dark:bg-gray-800/70 border border-gray-500/50 dark:border-gray-600/50 rounded-lg text-gray-900 dark:text-white placeholder-gray-700 dark:placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/70 transition-all duration-200 font-medium"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-500/20 border border-red-300 dark:border-red-500/30 rounded-lg text-red-800 dark:text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2 shadow-lg"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  <span>Login</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-gray-900 dark:text-gray-100 text-sm font-medium">
            By continuing, you agree to our terms of service
          </div>
        </GlassCard>
      </div>
    </div>
  );
};