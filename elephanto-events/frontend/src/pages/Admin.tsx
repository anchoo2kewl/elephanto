import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/GlassCard';
import { adminAPI } from '@/services/api';
import { eventApi } from '@/services/eventApi';
import { User } from '@/types';
import { SURVEY_OPTIONS, SURVEY_LABELS, COCKTAIL_OPTIONS, COCKTAIL_LABELS } from '@/constants/survey';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { 
  Shield, Users, Calendar, Database, Edit, Plus, 
  Save, X, Eye, Settings, MapPin, Clock, Ticket, Wine, FileText
} from 'lucide-react';

interface UserDetails {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  isOnboarded: boolean;
  createdAt: string;
  surveyResponse?: any;
  cocktailPreference?: any;
}

interface UserWithDetails {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin';
    isOnboarded: boolean;
    createdAt: string;
    updatedAt: string;
  };
  surveyResponse?: any;
  cocktailPreference?: any;
}

interface EventDetails {
  id: string;
  title: string;
  tagline?: string;
  date: string;
  time: string;
  entryTime?: string;
  location: string;
  address?: string;
  attire?: string;
  ageRange?: string;
  description?: string;
  isActive: boolean;
  ticketUrl?: string;
  googleMapsEnabled: boolean;
  countdownEnabled: boolean;
  cocktailSelectionEnabled: boolean;
  surveyEnabled: boolean;
  theHourEnabled: boolean;
  theHourActiveDate?: string;
  theHourLink?: string;
}

export const Admin: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [migrationStatus, setMigrationStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [editingUser, setEditingUser] = useState<UserDetails | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventDetails | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'events'>('overview');
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);

  // ESC key support for modals
  useEscapeKey(() => setEditingUser(null), !!editingUser);
  useEscapeKey(() => {
    setIsEventModalOpen(false);
    setSelectedEvent(null);
  }, isEventModalOpen);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersResponse, migrationResponse, eventsResponse] = await Promise.all([
        adminAPI.getUsers(),
        adminAPI.getMigrationStatus(),
        eventApi.admin.getAllEvents(),
      ]);
      setUsers(usersResponse.data);
      setMigrationStatus(migrationResponse.data);
      setEvents(eventsResponse.data);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      await adminAPI.updateUserRole(userId, { role: newRole });
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      setSelectedUser('');
    } catch (error) {
      console.error('Failed to update user role:', error);
    }
  };

  const handleEditUser = async (userId: string) => {
    try {
      const response = await adminAPI.getUserWithDetails(userId);
      const userWithDetails: UserWithDetails = response.data;
      
      // Transform the backend response to match our UserDetails interface
      const userDetails: UserDetails = {
        id: userWithDetails.user.id,
        email: userWithDetails.user.email,
        name: userWithDetails.user.name || '',
        role: userWithDetails.user.role,
        isOnboarded: userWithDetails.user.isOnboarded,
        createdAt: userWithDetails.user.createdAt,
        surveyResponse: userWithDetails.surveyResponse,
        cocktailPreference: userWithDetails.cocktailPreference
      };
      
      setEditingUser(userDetails);
    } catch (error) {
      console.error('Failed to load user details:', error);
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    
    try {
      if (editingUser.id) {
        // Update basic user info
        const updateData = {
          name: editingUser.name,
          role: editingUser.role,
          isOnboarded: editingUser.isOnboarded
        };
        await adminAPI.updateUserFull(editingUser.id, updateData);
        
        // Note: Survey and cocktail updates would need separate endpoints
        // For now, we're only updating basic user information
        // TODO: Add survey response and cocktail preference update endpoints
      } else {
        // Create new user (basic info only)
        const createData = {
          email: editingUser.email,
          name: editingUser.name,
          role: editingUser.role,
          isOnboarded: editingUser.isOnboarded
        };
        await adminAPI.createUser(createData);
      }
      await loadData(); // Refresh data
      setEditingUser(null);
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  };

  const handleActivateEvent = async (eventId: string) => {
    try {
      await eventApi.admin.activateEvent(eventId);
      await loadData(); // Refresh events
    } catch (error) {
      console.error('Failed to activate event:', error);
    }
  };

  const handleEditEvent = async (eventId: string) => {
    try {
      const response = await eventApi.admin.getEvent(eventId);
      setSelectedEvent(response.data.event);
      setIsEventModalOpen(true);
    } catch (error) {
      console.error('Failed to load event details:', error);
    }
  };

  const handleCreateEvent = () => {
    setSelectedEvent({
      id: '',
      title: '',
      tagline: '',
      date: '',
      time: '',
      entryTime: '',
      location: '',
      address: '',
      attire: '',
      ageRange: '',
      description: '',
      isActive: false,
      ticketUrl: '',
      googleMapsEnabled: true,
      countdownEnabled: true,
      cocktailSelectionEnabled: true,
      surveyEnabled: true,
      theHourEnabled: false,
      theHourActiveDate: '',
      theHourLink: ''
    });
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async () => {
    if (!selectedEvent) {
      console.log('No selected event');
      return;
    }
    
    setSavingEvent(true);
    console.log('Saving event:', selectedEvent);
    
    try {
      // Format the event data for the backend UpdateEventRequest structure
      const eventData = {
        title: selectedEvent.title || undefined,
        tagline: selectedEvent.tagline || undefined,
        date: selectedEvent.date ? selectedEvent.date.split('T')[0] : undefined,
        time: selectedEvent.time || undefined,
        entryTime: selectedEvent.entryTime || undefined,
        location: selectedEvent.location || undefined,
        address: selectedEvent.address || undefined,
        attire: selectedEvent.attire || undefined,
        ageRange: selectedEvent.ageRange || undefined,
        description: selectedEvent.description || undefined,
        ticketUrl: selectedEvent.ticketUrl || undefined,
        googleMapsEnabled: selectedEvent.googleMapsEnabled,
        countdownEnabled: selectedEvent.countdownEnabled,
        cocktailSelectionEnabled: selectedEvent.cocktailSelectionEnabled,
        surveyEnabled: selectedEvent.surveyEnabled,
        theHourEnabled: selectedEvent.theHourEnabled,
        // TheHourActiveDate should be null if not set, not empty string
        theHourActiveDate: selectedEvent.theHourActiveDate && selectedEvent.theHourActiveDate !== '' 
          ? new Date(selectedEvent.theHourActiveDate).toISOString() 
          : undefined,
        theHourLink: selectedEvent.theHourLink || undefined
      };
      
      // Remove undefined values to avoid sending them
      Object.keys(eventData).forEach(key => {
        if ((eventData as any)[key] === undefined) {
          delete (eventData as any)[key];
        }
      });
      
      console.log('Formatted event data:', eventData);
      
      let result;
      if (selectedEvent.id) {
        console.log('Updating event with ID:', selectedEvent.id);
        result = await eventApi.admin.updateEvent(selectedEvent.id, eventData);
        setNotification({ message: 'Event updated successfully!', type: 'success' });
      } else {
        console.log('Creating new event');
        result = await eventApi.admin.createEvent(eventData);
        setNotification({ message: 'Event created successfully!', type: 'success' });
      }
      console.log('Save result:', result);
      
      await loadData();
      setIsEventModalOpen(false);
      setSelectedEvent(null);
      
      // Auto-hide notification after 3 seconds
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      console.error('Failed to save event:', error);
      
      // More detailed error logging
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
      }
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save event. Please try again.';
      setNotification({ 
        message: errorMessage, 
        type: 'error' 
      });
      // Auto-hide error notification after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setSavingEvent(false);
    }
  };

  const stats = [
    { label: 'Total Users', value: users.length.toString(), icon: Users },
    { label: 'Admin Users', value: users.filter(u => u.role === 'admin').length.toString(), icon: Shield },
    { label: 'Total Events', value: events.length.toString(), icon: Calendar },
    { label: 'DB Version', value: migrationStatus?.version?.toString() || '0', icon: Database },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Notification Popup */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg backdrop-blur-md border transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-green-600/20 border-green-400/30 text-green-200' 
            : 'bg-red-600/20 border-red-400/30 text-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}
      
      <GlassCard variant="elevated" className="p-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          Admin Dashboard 👑
        </h1>
        <p className="text-white/80">
          Manage users, events, and system settings
        </p>
      </GlassCard>

      {/* Navigation Tabs */}
      <div className="flex space-x-4">
        {[
          { id: 'overview', label: 'Overview', icon: Database },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'events', label: 'Events', icon: Calendar },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              activeTab === id
                ? 'bg-blue-600/30 text-blue-200 border border-blue-400/50'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map(({ label, value, icon: Icon }) => (
              <GlassCard key={label} className="p-4 text-center">
                <Icon className="h-8 w-8 text-white/80 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-white/70 text-sm">{label}</div>
              </GlassCard>
            ))}
          </div>

          {/* Database Status */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Database Status 🗄️
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-white/70 text-sm">Migration Version</div>
                <div className="text-white font-medium text-lg">
                  {migrationStatus?.version || 'No migrations'}
                </div>
              </div>
              <div>
                <div className="text-white/70 text-sm">Status</div>
                <div className="text-white font-medium text-lg">
                  {migrationStatus?.dirty ? '❌ Dirty' : '✅ Clean'}
                </div>
              </div>
            </div>
          </GlassCard>
        </>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <GlassCard className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">
              User Management 👥
            </h2>
            <button 
              onClick={() => setEditingUser({
                id: '',
                email: '',
                name: '',
                role: 'user',
                isOnboarded: false,
                createdAt: new Date().toISOString()
              })}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-200 rounded-lg transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              <span>Add User</span>
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left text-white/80 py-3 px-2">User</th>
                  <th className="text-left text-white/80 py-3 px-2">Role</th>
                  <th className="text-left text-white/80 py-3 px-2">Status</th>
                  <th className="text-left text-white/80 py-3 px-2">Survey</th>
                  <th className="text-left text-white/80 py-3 px-2">Cocktail</th>
                  <th className="text-left text-white/80 py-3 px-2">Joined</th>
                  <th className="text-left text-white/80 py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-white/10">
                    <td className="py-4 px-2">
                      <div>
                        <div className="text-white font-medium">
                          {user.name || 'No name'}
                        </div>
                        <div className="text-white/60 text-sm">{user.email}</div>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-purple-500/20 text-purple-200'
                          : 'bg-blue-500/20 text-blue-200'
                      }`}>
                        {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                      </span>
                    </td>
                    <td className="py-4 px-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.isOnboarded
                          ? 'bg-green-500/20 text-green-200'
                          : 'bg-yellow-500/20 text-yellow-200'
                      }`}>
                        {user.isOnboarded ? '✅ Complete' : '⏳ Pending'}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <FileText className="h-4 w-4 text-gray-400 mx-auto" />
                    </td>
                    <td className="py-4 px-2 text-center">
                      <Wine className="h-4 w-4 text-gray-400 mx-auto" />
                    </td>
                    <td className="py-4 px-2 text-white/70 text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditUser(user.id)}
                          className="p-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 rounded transition-all duration-200"
                          title="Edit User Details"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        
                        <div className="relative">
                          <button
                            onClick={() => setSelectedUser(selectedUser === user.id ? '' : user.id)}
                            className="p-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 rounded transition-all duration-200"
                            title="Change Role"
                          >
                            <Settings className="h-4 w-4" />
                          </button>
                          
                          {selectedUser === user.id && (
                            <div className="absolute top-full right-0 mt-1 w-32 bg-black/80 backdrop-blur-md border border-white/20 rounded-lg overflow-hidden z-10">
                              <button
                                onClick={() => handleRoleUpdate(user.id, 'user')}
                                className="w-full px-3 py-2 text-left text-white hover:bg-white/20 transition-colors duration-200"
                                disabled={user.role === 'user'}
                              >
                                👤 User
                              </button>
                              <button
                                onClick={() => handleRoleUpdate(user.id, 'admin')}
                                className="w-full px-3 py-2 text-left text-white hover:bg-white/20 transition-colors duration-200"
                                disabled={user.role === 'admin'}
                              >
                                👑 Admin
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <GlassCard className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">
              Event Management 📅
            </h2>
            <button 
              onClick={handleCreateEvent}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-200 rounded-lg transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              <span>Create Event</span>
            </button>
          </div>
          
          <div className="space-y-4">
            {events.map((event) => {
              return (
                <div key={event.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{event.title}</h3>
                        {event.isActive && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-200 text-xs rounded-full">
                            ✅ Active
                          </span>
                        )}
                      </div>
                      
                      <p className="text-white/70 text-sm mb-3">{event.tagline}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center space-x-2 text-white/60">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(event.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-white/60">
                          <Clock className="h-4 w-4" />
                          <span>{event.time}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-white/60">
                          <MapPin className="h-4 w-4" />
                          <span>{event.location}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-white/60">
                          <Ticket className="h-4 w-4" />
                          <span>{event.ticketUrl ? 'Has Tickets' : 'No Tickets'}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-3 text-xs">
                        <span className={`px-2 py-1 rounded ${event.countdownEnabled ? 'bg-blue-500/20 text-blue-200' : 'bg-gray-500/20 text-gray-400'}`}>
                          {event.countdownEnabled ? '⏰ Countdown' : '❌ No Countdown'}
                        </span>
                        <span className={`px-2 py-1 rounded ${event.cocktailSelectionEnabled ? 'bg-purple-500/20 text-purple-200' : 'bg-gray-500/20 text-gray-400'}`}>
                          {event.cocktailSelectionEnabled ? '🍸 Cocktails' : '❌ No Cocktails'}
                        </span>
                        <span className={`px-2 py-1 rounded ${event.surveyEnabled ? 'bg-green-500/20 text-green-200' : 'bg-gray-500/20 text-gray-400'}`}>
                          {event.surveyEnabled ? '📋 Survey' : '❌ No Survey'}
                        </span>
                        <span className={`px-2 py-1 rounded ${event.theHourEnabled ? 'bg-yellow-500/20 text-yellow-200' : 'bg-gray-500/20 text-gray-400'}`}>
                          {event.theHourEnabled ? '⚡ The Hour' : '❌ No Hour'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleEditEvent(event.id)}
                        className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 rounded transition-all duration-200"
                        title="Edit Event"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      
                      {!event.isActive && (
                        <button
                          onClick={() => handleActivateEvent(event.id)}
                          className="p-2 bg-green-600/20 hover:bg-green-600/30 text-green-200 rounded transition-all duration-200"
                          title="Activate Event"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* User Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900/90 backdrop-blur-md border border-white/20 rounded-xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">
                {editingUser.id ? 'Edit User' : 'Add New User'}
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-200"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-white border-b border-white/20 pb-2">Basic Information</h4>
                
                <div>
                  <label className="block text-white/80 text-sm mb-2">Email</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                    placeholder="user@example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm mb-2">Full Name</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                    placeholder="John Doe"
                  />
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm mb-2">Role</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({...editingUser, role: e.target.value as 'user' | 'admin'})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  >
                    <option value="user">👤 User</option>
                    <option value="admin">👑 Admin</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="onboarded"
                    checked={editingUser.isOnboarded}
                    onChange={(e) => setEditingUser({...editingUser, isOnboarded: e.target.checked})}
                    className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded"
                  />
                  <label htmlFor="onboarded" className="text-white/80 text-sm">
                    Mark as Onboarded
                  </label>
                </div>
              </div>

              {/* Quick Info */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-white border-b border-white/20 pb-2">Quick Info</h4>
                
                {editingUser.surveyResponse && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-white/80 text-sm mb-1">{SURVEY_LABELS.age}</label>
                      <input
                        type="text"
                        value={editingUser.surveyResponse.age || ''}
                        onChange={(e) => setEditingUser({
                          ...editingUser, 
                          surveyResponse: {...editingUser.surveyResponse, age: e.target.value}
                        })}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                        placeholder="Age"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white/80 text-sm mb-1">{SURVEY_LABELS.gender}</label>
                      <div className="space-y-2">
                        {['Male', 'Female', 'Other'].map((option) => (
                          <label key={option} className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name={`gender-${editingUser.id}`}
                              value={option}
                              checked={editingUser.surveyResponse?.gender === option}
                              onChange={(e) => setEditingUser({
                                ...editingUser, 
                                surveyResponse: {...editingUser.surveyResponse, gender: e.target.value}
                              })}
                              className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded"
                            />
                            <span className="ml-2 text-white/80 text-sm">{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-white/80 text-sm mb-1">{SURVEY_LABELS.instagramHandle}</label>
                      <input
                        type="text"
                        value={editingUser.surveyResponse.instagramHandle || ''}
                        onChange={(e) => setEditingUser({
                          ...editingUser, 
                          surveyResponse: {...editingUser.surveyResponse, instagramHandle: e.target.value}
                        })}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                        placeholder="@username"
                      />
                    </div>
                  </div>
                )}
                
                {!editingUser.surveyResponse && (
                  <div className="text-center py-4 text-white/60">
                    <FileText className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No survey data available</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Survey Details */}
            {editingUser.surveyResponse && (
              <div className="mt-6 space-y-6">
                <div className="flex items-center justify-between border-b border-white/20 pb-2">
                  <h4 className="text-lg font-medium text-white">Survey Details</h4>
                  <span className="text-sm text-purple-300 bg-purple-600/20 px-2 py-1 rounded">
                    Event: {editingUser.surveyResponse.eventName || editingUser.surveyResponse.eventId}
                  </span>
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm mb-3">{SURVEY_LABELS.torontoMeaning}</label>
                  <div className="space-y-2">
                    {SURVEY_OPTIONS.torontoMeaning.map((option) => (
                      <label key={option.value} className="flex items-start cursor-pointer">
                        <input
                          type="radio"
                          name={`torontoMeaning-${editingUser.id}`}
                          value={option.value}
                          checked={editingUser.surveyResponse?.torontoMeaning === option.value}
                          onChange={(e) => setEditingUser({
                            ...editingUser, 
                            surveyResponse: {...editingUser.surveyResponse, torontoMeaning: e.target.value}
                          })}
                          className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded mt-1"
                        />
                        <span className="ml-3 text-white/80 text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm mb-3">{SURVEY_LABELS.personality}</label>
                  <div className="space-y-2">
                    {SURVEY_OPTIONS.personality.map((option) => (
                      <label key={option.value} className="flex items-start cursor-pointer">
                        <input
                          type="radio"
                          name={`personality-${editingUser.id}`}
                          value={option.value}
                          checked={editingUser.surveyResponse?.personality === option.value}
                          onChange={(e) => setEditingUser({
                            ...editingUser, 
                            surveyResponse: {...editingUser.surveyResponse, personality: e.target.value}
                          })}
                          className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded mt-1"
                        />
                        <span className="ml-3 text-white/80 text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm mb-3">{SURVEY_LABELS.connectionType}</label>
                  <div className="space-y-2">
                    {SURVEY_OPTIONS.connectionType.map((option) => (
                      <label key={option.value} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name={`connectionType-${editingUser.id}`}
                          value={option.value}
                          checked={editingUser.surveyResponse?.connectionType === option.value}
                          onChange={(e) => setEditingUser({
                            ...editingUser, 
                            surveyResponse: {...editingUser.surveyResponse, connectionType: e.target.value}
                          })}
                          className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded"
                        />
                        <span className="ml-3 text-white/80 text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm mb-3">{SURVEY_LABELS.howHeardAboutUs}</label>
                  <div className="space-y-2">
                    {SURVEY_OPTIONS.howHeardAboutUs.map((option) => (
                      <label key={option.value} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name={`howHeard-${editingUser.id}`}
                          value={option.value}
                          checked={editingUser.surveyResponse?.howHeardAboutUs === option.value}
                          onChange={(e) => setEditingUser({
                            ...editingUser, 
                            surveyResponse: {...editingUser.surveyResponse, howHeardAboutUs: e.target.value}
                          })}
                          className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded"
                        />
                        <span className="ml-3 text-white/80 text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Cocktail Preferences */}
            {editingUser.cocktailPreference && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/20 pb-2">
                  <h4 className="text-lg font-medium text-white">Cocktail Preferences</h4>
                  <span className="text-sm text-purple-300 bg-purple-600/20 px-2 py-1 rounded">
                    Event: {editingUser.cocktailPreference.eventName || editingUser.cocktailPreference.eventId}
                  </span>
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm mb-3">{COCKTAIL_LABELS.preference}</label>
                  <div className="space-y-2">
                    {COCKTAIL_OPTIONS.map((option) => (
                      <label key={option.value} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name={`cocktail-${editingUser.id}`}
                          value={option.value}
                          checked={editingUser.cocktailPreference?.preference === option.value}
                          onChange={(e) => setEditingUser({
                            ...editingUser, 
                            cocktailPreference: {...editingUser.cocktailPreference, preference: e.target.value}
                          })}
                          className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded"
                        />
                        <span className="ml-3 text-white/80 text-sm flex items-center">
                          <span className="mr-2">{option.emoji}</span>
                          <span className="font-medium">{option.label}</span>
                          <span className="ml-2 text-white/60 text-xs">— {option.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-gray-600/20 hover:bg-gray-600/30 text-gray-200 rounded-lg transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUser}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 rounded-lg transition-all duration-200"
              >
                <Save className="h-4 w-4" />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Edit Modal */}
      {isEventModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900/90 backdrop-blur-md border border-white/20 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">
                {selectedEvent.id ? 'Edit Event' : 'Create New Event'}
              </h3>
              <button
                onClick={() => {
                  setIsEventModalOpen(false);
                  setSelectedEvent(null);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-200"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-white border-b border-white/20 pb-2">Basic Information</h4>
                
                <div>
                  <label className="block text-white/80 text-sm mb-2">Event Title</label>
                  <input
                    type="text"
                    value={selectedEvent.title}
                    onChange={(e) => setSelectedEvent({...selectedEvent, title: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                    placeholder="Event Title"
                  />
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm mb-2">Tagline</label>
                  <input
                    type="text"
                    value={selectedEvent.tagline || ''}
                    onChange={(e) => setSelectedEvent({...selectedEvent, tagline: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                    placeholder="Event Tagline"
                  />
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm mb-2">Date</label>
                  <input
                    type="date"
                    value={selectedEvent.date ? new Date(selectedEvent.date + 'T00:00:00').toISOString().slice(0, 10) : ''}
                    onChange={(e) => setSelectedEvent({...selectedEvent, date: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm mb-2">Time</label>
                  <input
                    type="text"
                    value={selectedEvent.time}
                    onChange={(e) => setSelectedEvent({...selectedEvent, time: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                    placeholder="6:30 - 9:30 PM"
                  />
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm mb-2">Entry Time</label>
                  <input
                    type="text"
                    value={selectedEvent.entryTime || ''}
                    onChange={(e) => setSelectedEvent({...selectedEvent, entryTime: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                    placeholder="Entry until 7:15 PM"
                  />
                </div>
              </div>
              
              {/* Location & Details */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-white border-b border-white/20 pb-2">Location & Details</h4>
                
                <div>
                  <label className="block text-white/80 text-sm mb-2">Location</label>
                  <input
                    type="text"
                    value={selectedEvent.location}
                    onChange={(e) => setSelectedEvent({...selectedEvent, location: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                    placeholder="Venue Name"
                  />
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm mb-2">Address</label>
                  <input
                    type="text"
                    value={selectedEvent.address || ''}
                    onChange={(e) => setSelectedEvent({...selectedEvent, address: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                    placeholder="Full Address"
                  />
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm mb-2">Attire</label>
                  <input
                    type="text"
                    value={selectedEvent.attire || ''}
                    onChange={(e) => setSelectedEvent({...selectedEvent, attire: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                    placeholder="Smart Casual"
                  />
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm mb-2">Age Range</label>
                  <input
                    type="text"
                    value={selectedEvent.ageRange || ''}
                    onChange={(e) => setSelectedEvent({...selectedEvent, ageRange: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                    placeholder="25 - 40"
                  />
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm mb-2">Ticket URL</label>
                  <input
                    type="url"
                    value={selectedEvent.ticketUrl || ''}
                    onChange={(e) => setSelectedEvent({...selectedEvent, ticketUrl: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                    placeholder="https://eventbrite.com/..."
                  />
                </div>
              </div>
            </div>
            
            {/* Description */}
            <div className="mt-6">
              <label className="block text-white/80 text-sm mb-2">Description</label>
              <textarea
                value={selectedEvent.description || ''}
                onChange={(e) => setSelectedEvent({...selectedEvent, description: e.target.value})}
                rows={4}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                placeholder="Event description..."
              />
            </div>
            
            {/* Feature Toggles */}
            <div className="mt-6">
              <h4 className="text-lg font-medium text-white border-b border-white/20 pb-2 mb-4">Feature Settings</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={selectedEvent.isActive}
                    onChange={(e) => setSelectedEvent({...selectedEvent, isActive: e.target.checked})}
                    className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded"
                  />
                  <label htmlFor="isActive" className="text-white/80 text-sm">Active Event</label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="countdownEnabled"
                    checked={selectedEvent.countdownEnabled}
                    onChange={(e) => setSelectedEvent({...selectedEvent, countdownEnabled: e.target.checked})}
                    className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded"
                  />
                  <label htmlFor="countdownEnabled" className="text-white/80 text-sm">Show Countdown</label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="cocktailSelectionEnabled"
                    checked={selectedEvent.cocktailSelectionEnabled}
                    onChange={(e) => setSelectedEvent({...selectedEvent, cocktailSelectionEnabled: e.target.checked})}
                    className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded"
                  />
                  <label htmlFor="cocktailSelectionEnabled" className="text-white/80 text-sm">Cocktail Selection</label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="surveyEnabled"
                    checked={selectedEvent.surveyEnabled}
                    onChange={(e) => setSelectedEvent({...selectedEvent, surveyEnabled: e.target.checked})}
                    className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded"
                  />
                  <label htmlFor="surveyEnabled" className="text-white/80 text-sm">Survey Enabled</label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="googleMapsEnabled"
                    checked={selectedEvent.googleMapsEnabled}
                    onChange={(e) => setSelectedEvent({...selectedEvent, googleMapsEnabled: e.target.checked})}
                    className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded"
                  />
                  <label htmlFor="googleMapsEnabled" className="text-white/80 text-sm">Google Maps</label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="theHourEnabled"
                    checked={selectedEvent.theHourEnabled}
                    onChange={(e) => setSelectedEvent({...selectedEvent, theHourEnabled: e.target.checked})}
                    className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded"
                  />
                  <label htmlFor="theHourEnabled" className="text-white/80 text-sm">The Hour Feature</label>
                </div>
              </div>
            </div>
            
            {/* The Hour Link */}
            {selectedEvent.theHourEnabled && (
              <div className="mt-4">
                <label className="block text-white/80 text-sm mb-2">The Hour Link (optional)</label>
                <input
                  type="url"
                  value={selectedEvent.theHourLink || ''}
                  onChange={(e) => setSelectedEvent({...selectedEvent, theHourLink: e.target.value})}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                  placeholder="https://your-hour-link.com (leave blank for 'Coming Soon')"
                />
              </div>
            )}
            
            {/* Actions */}
            <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-white/20">
              <button
                onClick={() => {
                  setIsEventModalOpen(false);
                  setSelectedEvent(null);
                }}
                className="px-4 py-2 bg-gray-600/20 hover:bg-gray-600/30 text-gray-200 rounded-lg transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEvent}
                disabled={savingEvent}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  savingEvent 
                    ? 'bg-blue-600/10 text-blue-400 cursor-not-allowed' 
                    : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-200'
                }`}
              >
                {savingEvent ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{savingEvent ? 'Saving...' : 'Save Event'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};