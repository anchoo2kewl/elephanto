import React, { useState } from 'react';
import { GlassCard } from '@/components/GlassCard';
import { useAuth } from '@/contexts/AuthContext';
import { userAPI } from '@/services/api';
import { User, MapPin, Calendar, Mail, Save } from 'lucide-react';

export const Settings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    dateOfBirth: user?.dateOfBirth?.split('T')[0] || '',
    currentCity: user?.currentCity || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const response = await userAPI.updateProfile(formData);
      updateUser(response.data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Profile update failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <GlassCard variant="elevated" className="p-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          Account Settings ⚙️
        </h1>
        <p className="text-white/80">
          Manage your profile and preferences
        </p>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">
              Profile Information
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-white/90 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/60" />
                  <input
                    type="email"
                    id="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white/60 cursor-not-allowed"
                  />
                </div>
                <p className="text-white/50 text-xs mt-1">
                  Email cannot be changed
                </p>
              </div>

              <div>
                <label htmlFor="name" className="block text-white/90 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/60" />
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="dateOfBirth" className="block text-white/90 mb-2">
                  Date of Birth
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/60" />
                  <input
                    type="date"
                    id="dateOfBirth"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="currentCity" className="block text-white/90 mb-2">
                  Current City
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/60" />
                  <input
                    type="text"
                    id="currentCity"
                    name="currentCity"
                    value={formData.currentCity}
                    onChange={handleChange}
                    placeholder="Enter your city"
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>

              {success && (
                <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-200 text-sm">
                  Profile updated successfully! ✅
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </form>
          </GlassCard>
        </div>

        {/* Account Info */}
        <div>
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">
              Account Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <div className="text-white/70 text-sm">Account Status</div>
                <div className="text-white font-medium">
                  {user?.isOnboarded ? '✅ Complete' : '⏳ Incomplete'}
                </div>
              </div>
              
              <div>
                <div className="text-white/70 text-sm">Account Type</div>
                <div className="text-white font-medium capitalize">
                  {user?.role === 'admin' ? '👑 Admin' : '👤 User'}
                </div>
              </div>
              
              <div>
                <div className="text-white/70 text-sm">Member Since</div>
                <div className="text-white font-medium">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </div>
              </div>
              
              <div>
                <div className="text-white/70 text-sm">Last Updated</div>
                <div className="text-white font-medium">
                  {user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};