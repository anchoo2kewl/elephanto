import React from 'react';
import { GlassCard } from '@/components/GlassCard';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, MapPin, Clock, Users } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const upcomingEvents = [
    {
      id: 1,
      title: 'Summer Music Festival',
      date: '2024-07-15',
      time: '18:00',
      location: 'Central Park, New York',
      attendees: 250,
    },
    {
      id: 2,
      title: 'Tech Conference 2024',
      date: '2024-08-20',
      time: '09:00',
      location: 'Convention Center, San Francisco',
      attendees: 500,
    },
    {
      id: 3,
      title: 'Art Gallery Opening',
      date: '2024-09-05',
      time: '19:30',
      location: 'Modern Art Museum, Chicago',
      attendees: 75,
    },
  ];

  const stats = [
    { label: 'Events Attended', value: '12', icon: Calendar },
    { label: 'Cities Visited', value: '5', icon: MapPin },
    { label: 'Hours of Fun', value: '48', icon: Clock },
    { label: 'New Friends', value: '23', icon: Users },
  ];

  return (
    <div className="space-y-3 sm:space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <GlassCard variant="elevated" className="p-3 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
              Welcome back, {user?.name || 'Friend'}! 👋
            </h1>
            <p className="text-xs sm:text-base text-gray-700 dark:text-gray-300">
              Ready to discover amazing events in Toronto?
            </p>
          </div>
          <div className="text-3xl sm:text-6xl animate-float ml-2 sm:ml-4">🎉</div>
        </div>
      </GlassCard>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <GlassCard key={label} className="p-2 sm:p-4 text-center">
            <Icon className="h-5 w-5 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400 mx-auto mb-1 sm:mb-2" />
            <div className="text-base sm:text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
            <div className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">{label}</div>
          </GlassCard>
        ))}
      </div>

      {/* Upcoming Events */}
      <GlassCard variant="elevated" className="p-4 sm:p-6">
        <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
          Upcoming Events in Toronto 🎪
        </h2>
        <div className="space-y-3 sm:space-y-4">
          {upcomingEvents.map((event) => (
            <GlassCard key={event.id} variant="subtle" className="p-3 sm:p-4">
              <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {event.title}
                  </h3>
                  <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4 text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>{new Date(event.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>{event.time}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:flex-col sm:text-right">
                  <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>{event.attendees} attending</span>
                  </div>
                  <button className="px-3 py-1 sm:px-4 sm:py-2 sm:mt-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs sm:text-sm rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg">
                    View Details
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </GlassCard>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <GlassCard className="p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">
            Discover Events 🔍
          </h3>
          <p className="text-white/80 mb-3 sm:mb-4 text-sm sm:text-base">
            Find amazing events happening near you
          </p>
          <button className="w-full py-2 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg transition-all duration-200 transform hover:scale-105 text-sm sm:text-base">
            Browse Events
          </button>
        </GlassCard>

        <GlassCard className="p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">
            Create Event 📅
          </h3>
          <p className="text-white/80 mb-3 sm:mb-4 text-sm sm:text-base">
            Organize your own memorable event
          </p>
          <button className="w-full py-2 sm:py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg transition-all duration-200 transform hover:scale-105 text-sm sm:text-base">
            Create Event
          </button>
        </GlassCard>
      </div>
    </div>
  );
};