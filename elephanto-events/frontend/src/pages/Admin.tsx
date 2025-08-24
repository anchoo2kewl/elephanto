import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GlassCard } from '@/components/GlassCard';
import { adminAPI } from '@/services/api';
import { eventApi } from '@/services/eventApi';
import { User } from '@/types';
import { SURVEY_OPTIONS, SURVEY_LABELS, COCKTAIL_OPTIONS, COCKTAIL_LABELS } from '@/constants/survey';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { 
  Shield, Users, Calendar, Database, Edit, Plus, 
  Save, X, Eye, Settings, MapPin, Clock, Ticket, Wine, FileText,
  Trash2, Download, ScrollText, Key
} from 'lucide-react';
import { VelvetHourControl } from '@/components/Admin/VelvetHourControl';
import { velvetHourApi } from '@/services/velvetHourApi';
import { AdminVelvetHourStatusResponse } from '@/types/velvet-hour';

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
  mapProvider?: 'google' | 'openstreetmap';
  countdownEnabled: boolean;
  cocktailSelectionEnabled: boolean;
  surveyEnabled: boolean;
  theHourEnabled: boolean;
  theHourActiveDate?: string;
  theHourAvailable: boolean;
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
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extract current tab from URL path
  const getCurrentTab = () => {
    const path = location.pathname.split('/admin/')[1] || '';
    switch (path) {
      case 'users': return 'users';
      case 'events': return 'events';
      case 'velvet-hour': return 'velvet-hour';
      case 'audit-logs': return 'audit-logs';
      case 'tokens': return 'tokens';
      default: return 'overview';
    }
  };
  
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'events' | 'velvet-hour' | 'audit-logs' | 'tokens'>(getCurrentTab());
  const [eventModalTab, setEventModalTab] = useState<'basic' | 'details'>('basic');
  
  // Sync activeTab with URL changes
  useEffect(() => {
    setActiveTab(getCurrentTab());
  }, [location.pathname]);
  const [eventDetails, setEventDetails] = useState<any[]>([]);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<string>('');
  const [exportingCSV, setExportingCSV] = useState(false);
  
  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditLogsPage, setAuditLogsPage] = useState(1);
  const [auditLogsTotal, setAuditLogsTotal] = useState(0);
  const [auditLogsSearch, setAuditLogsSearch] = useState('');
  
  // Tokens state
  const [tokens, setTokens] = useState<any[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [showCreateTokenModal, setShowCreateTokenModal] = useState(false);
  const [newTokenData, setNewTokenData] = useState<{ name: string; expiresIn: number }>({ name: '', expiresIn: 90 });
  const [createdToken, setCreatedToken] = useState<string>('');
  
  // Velvet Hour state
  const [velvetHourStatus, setVelvetHourStatus] = useState<AdminVelvetHourStatusResponse | null>(null);
  const [velvetHourLoading, setVelvetHourLoading] = useState(false);
  const [activeEvent, setActiveEvent] = useState<EventDetails | null>(null);

  // ESC key support for modals
  useEscapeKey(() => setEditingUser(null), !!editingUser);
  useEscapeKey(() => {
    setIsEventModalOpen(false);
    setSelectedEvent(null);
  }, isEventModalOpen);
  useEscapeKey(() => setDeleteConfirmUser(''), !!deleteConfirmUser);
  useEscapeKey(() => setShowCreateTokenModal(false), showCreateTokenModal);
  useEscapeKey(() => setCreatedToken(''), !!createdToken);

  useEffect(() => {
    loadData();
  }, []);

  // Load audit logs when audit logs tab is active
  useEffect(() => {
    if (activeTab === 'audit-logs') {
      loadAuditLogs();
    }
  }, [activeTab, auditLogsPage, auditLogsSearch]);

  // Load tokens when tokens tab is active
  useEffect(() => {
    if (activeTab === 'tokens') {
      loadTokens();
    }
  }, [activeTab]);


  // Debounce audit logs search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (activeTab === 'audit-logs') {
        setAuditLogsPage(1); // Reset to first page when searching
        loadAuditLogs();
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [auditLogsSearch]);

  // 🔧 Notification helper
  const showNotification = (
    message: string,
    type: 'success' | 'error' = 'success',
    timeout: number = type === 'success' ? 3000 : 5000
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), timeout);
  };

  const loadData = async () => {
    try {
      const [usersResponse, migrationResponse, eventsResponse] = await Promise.all([
        adminAPI.getUsers(),
        adminAPI.getMigrationStatus(),
        eventApi.admin.getAllEvents(),
      ]);
      console.log('Users response:', usersResponse.data);
      console.log('First user:', usersResponse.data[0]);
      setUsers(usersResponse.data);
      setMigrationStatus(migrationResponse.data);
      setEvents(eventsResponse.data);
    } catch (error) {
      console.error('Failed to load admin data:', error);
      showNotification('Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setAuditLogsLoading(true);
    try {
      const params: any = {
        page: auditLogsPage,
        limit: 20,
      };
      if (auditLogsSearch) {
        params.search = auditLogsSearch;
      }
      
      const response = await adminAPI.getAuditLogs(params);
      setAuditLogs(response.data.logs || []);
      setAuditLogsTotal(response.data.total || 0);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      showNotification('Failed to load audit logs', 'error');
    } finally {
      setAuditLogsLoading(false);
    }
  };

  const loadTokens = async () => {
    setTokensLoading(true);
    try {
      const response = await adminAPI.getTokens();
      setTokens(response.data || []);
    } catch (error) {
      console.error('Failed to load tokens:', error);
      showNotification('Failed to load tokens', 'error');
    } finally {
      setTokensLoading(false);
    }
  };

  const handleRoleUpdate = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      await adminAPI.updateUserRole(userId, { role: newRole });
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      setSelectedUser('');
      showNotification('User role updated successfully!', 'success');
    } catch (error) {
      console.error('Failed to update user role:', error);
      showNotification('Failed to update user role', 'error');
    }
  };

  const handleEditUser = async (userId: string) => {
    try {
      const response = await adminAPI.getUserWithDetails(userId);
      const userWithDetails: UserWithDetails = response.data;
      
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
      showNotification('Failed to load user details', 'error');
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    
    try {
      if (editingUser.id) {
        const updateData = {
          name: editingUser.name,
          role: editingUser.role,
          isOnboarded: editingUser.isOnboarded
        };
        await adminAPI.updateUserFull(editingUser.id, updateData);
        
        // Update survey response if it exists
        if (editingUser.surveyResponse) {
          await adminAPI.updateUserSurvey(editingUser.id, editingUser.surveyResponse);
        }
        
        // Update cocktail preference if it exists
        if (editingUser.cocktailPreference) {
          await adminAPI.updateUserCocktail(editingUser.id, {
            preference: editingUser.cocktailPreference.preference
          });
        }
      } else {
        const createData = {
          email: editingUser.email,
          name: editingUser.name,
          role: editingUser.role,
          isOnboarded: editingUser.isOnboarded
        };
        const createResult = await adminAPI.createUser(createData);
        const userId = createResult.data.id;
        
        // Create survey response for new user if provided
        if (editingUser.surveyResponse && editingUser.surveyResponse.age) {
          await adminAPI.updateUserSurvey(userId, editingUser.surveyResponse);
        }
        
        // Create cocktail preference for new user if provided
        if (editingUser.cocktailPreference && editingUser.cocktailPreference.preference) {
          await adminAPI.updateUserCocktail(userId, {
            preference: editingUser.cocktailPreference.preference
          });
        }
      }
      await loadData();
      setEditingUser(null);
      showNotification('User saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save user:', error);
      showNotification('Failed to save user', 'error');
    }
  };

  const handleActivateEvent = async (eventId: string) => {
    try {
      await eventApi.admin.activateEvent(eventId);
      await loadData();
      showNotification('Event activated successfully!', 'success');
    } catch (error) {
      console.error('Failed to activate event:', error);
      showNotification('Failed to activate event', 'error');
    }
  };

  const handleEditEvent = async (eventId: string) => {
    try {
      const response = await eventApi.admin.getEvent(eventId);
      setSelectedEvent(response.data.event);
      setEventDetails(response.data.details || []);
      setEventModalTab('basic');
      setIsEventModalOpen(true);
    } catch (error) {
      console.error('Failed to load event details:', error);
      showNotification('Failed to load event details', 'error');
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
      mapProvider: 'google' as const,
      countdownEnabled: true,
      cocktailSelectionEnabled: true,
      surveyEnabled: true,
      theHourEnabled: false,
      theHourActiveDate: '',
      theHourAvailable: false
    });
    setEventDetails([]);
    setEventModalTab('basic');
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async () => {
    if (!selectedEvent) return;
    
    setSavingEvent(true);
    try {
      const eventData: any = {
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
        mapProvider: selectedEvent.mapProvider || 'google',
        countdownEnabled: selectedEvent.countdownEnabled,
        cocktailSelectionEnabled: selectedEvent.cocktailSelectionEnabled,
        surveyEnabled: selectedEvent.surveyEnabled,
        theHourEnabled: selectedEvent.theHourEnabled,
        theHourActiveDate: selectedEvent.theHourActiveDate && selectedEvent.theHourActiveDate !== '' 
          ? new Date(selectedEvent.theHourActiveDate).toISOString() 
          : undefined,
        theHourAvailable: selectedEvent.theHourAvailable
      };
      
      Object.keys(eventData).forEach(key => {
        if (eventData[key] === undefined) {
          delete eventData[key];
        }
      });
      
      if (selectedEvent.id) {
        await eventApi.admin.updateEvent(selectedEvent.id, eventData);
        showNotification('Event updated successfully!', 'success');
      } else {
        await eventApi.admin.createEvent(eventData);
        showNotification('Event created successfully!', 'success');
      }
      
      await loadData();
      setIsEventModalOpen(false);
      setSelectedEvent(null);
    } catch (error: any) {
      console.error('Failed to save event:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save event. Please try again.';
      showNotification(errorMessage, 'error');
    } finally {
      setSavingEvent(false);
    }
  };

  const handleSaveEventDetail = async (detailIndex: number) => {
    if (!selectedEvent?.id) return;
    
    const detail = eventDetails[detailIndex];
    try {
      if (detail.id) {
        await eventApi.admin.updateEventDetail(selectedEvent.id, detail.id, detail);
      } else {
        const response = await eventApi.admin.createEventDetail(selectedEvent.id, detail);
        const updated = [...eventDetails];
        updated[detailIndex] = { ...detail, id: response.data.id };
        setEventDetails(updated);
      }
      showNotification('Event detail saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save event detail:', error);
      showNotification('Failed to save event detail', 'error');
    }
  };

  const handleDeleteEventDetail = async (detailIndex: number) => {
    if (!selectedEvent?.id) return;
    
    const detail = eventDetails[detailIndex];
    try {
      if (detail.id) {
        await eventApi.admin.deleteEventDetail(selectedEvent.id, detail.id);
      }
      setEventDetails(eventDetails.filter((_, i) => i !== detailIndex));
      showNotification('Event detail deleted successfully!', 'success');
    } catch (error) {
      console.error('Failed to delete event detail:', error);
      showNotification('Failed to delete event detail', 'error');
    }
  };

  const handleAttendanceUpdate = async (userId: string, attending: boolean) => {
    try {
      await adminAPI.updateUserAttendance(userId, attending);
      
      // Update the user in the local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, attending } : user
      ));
      
      showNotification(
        `User marked as ${attending ? 'attending' : 'not attending'}`, 
        'success'
      );
    } catch (error) {
      console.error('Failed to update user attendance:', error);
      showNotification('Failed to update attendance', 'error');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!deleteConfirmUser) {
      setDeleteConfirmUser(userId);
      return;
    }

    try {
      await adminAPI.deleteUser(userId);
      setUsers(users.filter(user => user.id !== userId));
      setDeleteConfirmUser('');
      showNotification('User deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete user:', error);
      showNotification('Failed to delete user', 'error');
      setDeleteConfirmUser('');
    }
  };

  const handleExportCSV = async () => {
    setExportingCSV(true);
    try {
      const response = await adminAPI.exportUsersCSV();
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or generate one
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'users_export.csv';
      if (contentDisposition) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showNotification('User data exported successfully', 'success');
    } catch (error) {
      console.error('Failed to export user data:', error);
      showNotification('Failed to export user data', 'error');
    } finally {
      setExportingCSV(false);
    }
  };

  const handleCreateToken = async () => {
    if (!newTokenData.name.trim()) {
      showNotification('Token name is required', 'error');
      return;
    }

    try {
      const response = await adminAPI.createToken(newTokenData);
      setTokens([response.data.detail, ...tokens]);
      setCreatedToken(response.data.token);
      setNewTokenData({ name: '', expiresIn: 90 });
      showNotification('Token created successfully', 'success');
    } catch (error) {
      console.error('Failed to create token:', error);
      showNotification('Failed to create token', 'error');
    }
  };

  const handleDeleteToken = async (tokenId: string, tokenName: string) => {
    if (!confirm(`Are you sure you want to delete token "${tokenName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await adminAPI.deleteToken(tokenId);
      setTokens(tokens.filter(token => token.id !== tokenId));
      showNotification('Token deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete token:', error);
      showNotification('Failed to delete token', 'error');
    }
  };

  const copyTokenToClipboard = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      showNotification('Token copied to clipboard', 'success');
    } catch (error) {
      showNotification('Failed to copy token', 'error');
    }
  };

  // Velvet Hour handlers
  const loadVelvetHourStatus = useCallback(async () => {
    if (!activeEvent?.id) return;
    
    setVelvetHourLoading(true);
    try {
      const response = await velvetHourApi.getAdminStatus(activeEvent.id);
      setVelvetHourStatus(response.data);
    } catch (error) {
      console.error('Failed to load Velvet Hour status:', error);
      showNotification('Failed to load Velvet Hour status', 'error');
    } finally {
      setVelvetHourLoading(false);
    }
  }, [activeEvent?.id]);

  const handleVelvetHourStartSession = async () => {
    if (!activeEvent?.id) return;
    
    try {
      await velvetHourApi.startSession(activeEvent.id);
      await loadVelvetHourStatus();
      showNotification('Velvet Hour session started', 'success');
    } catch (error) {
      console.error('Failed to start Velvet Hour session:', error);
      showNotification('Failed to start session', 'error');
    }
  };

  const handleVelvetHourStartRound = async (manualMatches?: any[]) => {
    if (!activeEvent?.id) return;
    
    try {
      const data = manualMatches ? { matches: manualMatches } : {};
      await velvetHourApi.startRound(activeEvent.id, data);
      await loadVelvetHourStatus();
      showNotification('Round started', 'success');
    } catch (error) {
      console.error('Failed to start round:', error);
      showNotification('Failed to start round', 'error');
    }
  };

  const handleVelvetHourEndSession = async () => {
    if (!activeEvent?.id) return;
    
    try {
      await velvetHourApi.endSession(activeEvent.id);
      await loadVelvetHourStatus();
      showNotification('Velvet Hour session ended', 'success');
    } catch (error) {
      console.error('Failed to end Velvet Hour session:', error);
      showNotification('Failed to end session', 'error');
    }
  };

  const handleVelvetHourUpdateConfig = async (config: any) => {
    if (!activeEvent?.id) {
      showNotification('No active event selected', 'error');
      return;
    }
    
    try {
      await velvetHourApi.updateConfig(activeEvent.id, config);
      await loadVelvetHourStatus();
      showNotification('Configuration updated', 'success');
    } catch (error) {
      console.error('Failed to update configuration:', error);
      showNotification('Failed to update configuration', 'error');
    }
  };

  const handleVelvetHourResetSession = async () => {
    if (!activeEvent?.id) return;
    
    const confirmed = confirm(
      'Are you sure you want to reset the Velvet Hour session? This will permanently delete all session data, matches, and feedback. This action cannot be undone.'
    );
    
    if (!confirmed) return;
    
    try {
      await velvetHourApi.resetSession(activeEvent.id);
      await loadVelvetHourStatus();
      showNotification('Velvet Hour session reset successfully', 'success');
    } catch (error) {
      console.error('Failed to reset Velvet Hour session:', error);
      showNotification('Failed to reset session', 'error');
    }
  };

  // Load active event and Velvet Hour status
  useEffect(() => {
    if (activeTab === 'velvet-hour') {
      // Find the active event
      const active = events.find(event => event.isActive);
      setActiveEvent(active || null);
      
      if (active) {
        loadVelvetHourStatus();
      }
    }
  }, [activeTab, events, loadVelvetHourStatus]);

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
      <div className="overflow-x-auto">
        <div className="flex space-x-2 md:space-x-4 min-w-max pb-2">
        {[
          { id: 'overview', label: 'Overview', icon: Database },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'events', label: 'Events', icon: Calendar },
          { id: 'velvet-hour', label: 'Velvet Hour', icon: Clock },
          { id: 'audit-logs', label: 'Audit Logs', icon: ScrollText },
          { id: 'tokens', label: 'API Tokens', icon: Key },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              if (id === 'overview') {
                navigate('/admin');
              } else {
                navigate(`/admin/${id}`);
              }
            }}
            className={`flex items-center space-x-1 md:space-x-2 px-2 md:px-4 py-2 rounded-lg transition-all duration-200 text-sm md:text-base ${
              activeTab === id
                ? 'bg-blue-600/30 text-blue-200 border border-blue-400/50'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">{label}</span>
            <span className="sm:hidden text-xs">{label.split(' ')[0]}</span>
          </button>
        ))}
        </div>
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
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
            <h2 className="text-xl font-semibold text-white">
              User Management 👥
            </h2>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button 
                onClick={handleExportCSV}
                disabled={exportingCSV}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 rounded-lg transition-all duration-200 disabled:opacity-50 text-sm sm:text-base"
              >
                {exportingCSV ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                ) : (
                  <Download className="h-4 w-4 flex-shrink-0" />
                )}
                <span className="hidden sm:inline">{exportingCSV ? 'Exporting...' : 'Export CSV'}</span>
                <span className="sm:hidden">CSV</span>
              </button>
              <button 
                onClick={() => setEditingUser({
                id: '',
                email: '',
                name: '',
                role: 'user',
                isOnboarded: false,
                createdAt: new Date().toISOString(),
                surveyResponse: {
                  id: '',
                  userId: '',
                  fullName: '',
                  email: '',
                  age: '',
                  gender: '',
                  torontoMeaning: '',
                  personality: '',
                  connectionType: '',
                  instagramHandle: '',
                  howHeardAboutUs: '',
                  eventId: '',
                  eventName: '',
                  createdAt: '',
                  updatedAt: ''
                },
                cocktailPreference: {
                  id: '',
                  userId: '',
                  preference: '',
                  eventId: '',
                  eventName: '',
                  createdAt: '',
                  updatedAt: ''
                }
              })}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-200 rounded-lg transition-all duration-200 text-sm sm:text-base"
              >
                <Plus className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Add User</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto pt-12 pb-4">
            <table className="w-full relative">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left text-white/80 py-3 px-2">User</th>
                  <th className="text-left text-white/80 py-3 px-2">Role</th>
                  <th className="text-left text-white/80 py-3 px-2">Status</th>
                  <th className="text-left text-white/80 py-3 px-2">Survey</th>
                  <th className="text-left text-white/80 py-3 px-2">Cocktail</th>
                  <th className="text-left text-white/80 py-3 px-2">Attendance</th>
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
                        user.hasSurvey && user.hasCocktail
                          ? 'bg-green-500/20 text-green-200'
                          : user.hasSurvey || user.hasCocktail
                          ? 'bg-yellow-500/20 text-yellow-200'
                          : 'bg-red-500/20 text-red-200'
                      }`}>
                        {user.hasSurvey && user.hasCocktail 
                          ? '✅ Complete' 
                          : user.hasSurvey || user.hasCocktail
                          ? '🟡 Partial'
                          : '❌ Incomplete'}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <div 
                        className="flex justify-center"
                        title={user.hasSurvey ? 'Survey completed' : 'Survey not completed'}
                      >
                        <FileText 
                          className={`h-4 w-4 ${
                            user.hasSurvey ? 'text-green-400' : 'text-gray-400'
                          }`}
                        />
                      </div>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <div 
                        className="flex justify-center"
                        title={user.hasCocktail ? 'Cocktail preference set' : 'No cocktail preference'}
                      >
                        <Wine 
                          className={`h-4 w-4 ${
                            user.hasCocktail ? 'text-green-400' : 'text-gray-400'
                          }`}
                        />
                      </div>
                    </td>
                    <td className="py-4 px-2 text-center">
                      {user.hasActiveEvent ? (
                        <input
                          type="checkbox"
                          checked={user.attending || false}
                          onChange={(e) => handleAttendanceUpdate(user.id, e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
                          title={user.attending ? 'User is attending' : 'User is not attending'}
                        />
                      ) : (
                        <span className="text-gray-500 text-xs">No active event</span>
                      )}
                    </td>
                    <td className="py-4 px-2 text-white/70 text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-2 relative overflow-visible">
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

                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className={`relative rounded transition-all duration-300 transform ${
                            deleteConfirmUser === user.id
                              ? 'p-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-500/50 scale-110 animate-pulse border-2 border-red-400'
                              : 'p-1 bg-red-600/20 hover:bg-red-600/30 text-red-200 hover:scale-105'
                          }`}
                          title={deleteConfirmUser === user.id ? '⚠️ CLICK AGAIN TO PERMANENTLY DELETE USER ⚠️' : 'Delete User'}
                        >
                          <Trash2 className={`${deleteConfirmUser === user.id ? 'h-5 w-5' : 'h-4 w-4'} transition-all duration-300`} />
                          {deleteConfirmUser === user.id && (
                            <div className="absolute top-1/2 -left-52 transform -translate-y-1/2 bg-gradient-to-r from-red-700 to-red-800 text-white text-sm px-4 py-2 rounded-lg whitespace-nowrap font-bold animate-pulse z-[100] shadow-xl border-2 border-red-400 after:content-[''] after:absolute after:top-1/2 after:left-full after:transform after:-translate-y-1/2 after:border-4 after:border-transparent after:border-l-red-700">
                              ⚠️ CONFIRM DELETE ⚠️
                            </div>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 pt-12">
            {users.map((user) => (
              <div key={user.id} className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-white font-medium">
                      {user.name || 'No name'}
                    </div>
                    <div className="text-white/60 text-sm">{user.email}</div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'admin'
                      ? 'bg-purple-500/20 text-purple-200'
                      : 'bg-blue-500/20 text-blue-200'
                  }`}>
                    {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <div className="text-white/60">Status</div>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      user.hasSurvey && user.hasCocktail
                        ? 'bg-green-500/20 text-green-200'
                        : user.hasSurvey || user.hasCocktail
                        ? 'bg-yellow-500/20 text-yellow-200'
                        : 'bg-red-500/20 text-red-200'
                    }`}>
                      {user.hasSurvey && user.hasCocktail 
                        ? '✅ Complete' 
                        : user.hasSurvey || user.hasCocktail
                        ? '🟡 Partial'
                        : '❌ Incomplete'}
                    </span>
                  </div>
                  <div>
                    <div className="text-white/60">Attendance</div>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      user.attending
                        ? 'bg-green-500/20 text-green-200'
                        : 'bg-gray-500/20 text-gray-300'
                    }`}>
                      {user.attending ? '✅ Yes' : '❌ No'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <div className="text-white/60">
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setSelectedUser(user.id)}
                      className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 rounded transition-all duration-200"
                      title="View Details"
                    >
                      <Eye className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleEditUser(user.id)}
                      className="p-2 bg-green-600/20 hover:bg-green-600/30 text-green-200 rounded transition-all duration-200"
                      title="Edit User"
                    >
                      <Edit className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
                
                {!editingUser.surveyResponse && editingUser.id && (
                  <div className="space-y-3">
                    <div className="text-center py-2 text-white/60 text-sm">
                      <FileText className="h-6 w-6 mx-auto mb-1" />
                      User hasn't completed survey - you can add it below
                    </div>
                    
                    <div>
                      <label className="block text-white/80 text-sm mb-1">{SURVEY_LABELS.age}</label>
                      <input
                        type="text"
                        value=""
                        onChange={(e) => setEditingUser({
                          ...editingUser, 
                          surveyResponse: {
                            id: '',
                            userId: editingUser.id,
                            fullName: editingUser.name || '',
                            email: editingUser.email,
                            age: e.target.value,
                            gender: '',
                            torontoMeaning: '',
                            personality: '',
                            connectionType: '',
                            instagramHandle: '',
                            howHeardAboutUs: '',
                            eventId: '',
                            eventName: '',
                            createdAt: '',
                            updatedAt: ''
                          }
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
                              name={`gender-existing-${editingUser.id}`}
                              value={option}
                              checked={false}
                              onChange={(e) => setEditingUser({
                                ...editingUser, 
                                surveyResponse: {
                                  id: '',
                                  userId: editingUser.id,
                                  fullName: editingUser.name || '',
                                  email: editingUser.email,
                                  age: '',
                                  gender: e.target.value,
                                  torontoMeaning: '',
                                  personality: '',
                                  connectionType: '',
                                  instagramHandle: '',
                                  howHeardAboutUs: '',
                                  eventId: '',
                                  eventName: '',
                                  createdAt: '',
                                  updatedAt: ''
                                }
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
                        value=""
                        onChange={(e) => setEditingUser({
                          ...editingUser, 
                          surveyResponse: {
                            id: '',
                            userId: editingUser.id,
                            fullName: editingUser.name || '',
                            email: editingUser.email,
                            age: '',
                            gender: '',
                            torontoMeaning: '',
                            personality: '',
                            connectionType: '',
                            instagramHandle: e.target.value,
                            howHeardAboutUs: '',
                            eventId: '',
                            eventName: '',
                            createdAt: '',
                            updatedAt: ''
                          }
                        })}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                        placeholder="@username"
                      />
                    </div>
                  </div>
                )}
                
                {!editingUser.id && (
                  <div className="text-center py-4 text-white/60">
                    <FileText className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Survey information will be filled in below</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Survey Details */}
            {editingUser.id && (
              <div className="mt-6 space-y-6">
                <div className="flex items-center justify-between border-b border-white/20 pb-2">
                  <h4 className="text-lg font-medium text-white">Survey Details</h4>
                  {editingUser.surveyResponse && (
                    <span className="text-sm text-purple-300 bg-purple-600/20 px-2 py-1 rounded">
                      Event: {editingUser.surveyResponse.eventName || editingUser.surveyResponse.eventId}
                    </span>
                  )}
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
                            surveyResponse: editingUser.surveyResponse ? 
                              {...editingUser.surveyResponse, torontoMeaning: e.target.value} :
                              {
                                id: '',
                                userId: editingUser.id,
                                fullName: editingUser.name || '',
                                email: editingUser.email,
                                age: '',
                                gender: '',
                                torontoMeaning: e.target.value,
                                personality: '',
                                connectionType: '',
                                instagramHandle: '',
                                howHeardAboutUs: '',
                                eventId: '',
                                eventName: '',
                                createdAt: '',
                                updatedAt: ''
                              }
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
                            surveyResponse: editingUser.surveyResponse ? 
                              {...editingUser.surveyResponse, personality: e.target.value} :
                              {
                                id: '',
                                userId: editingUser.id,
                                fullName: editingUser.name || '',
                                email: editingUser.email,
                                age: '',
                                gender: '',
                                torontoMeaning: '',
                                personality: e.target.value,
                                connectionType: '',
                                instagramHandle: '',
                                howHeardAboutUs: '',
                                eventId: '',
                                eventName: '',
                                createdAt: '',
                                updatedAt: ''
                              }
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
                            surveyResponse: editingUser.surveyResponse ? 
                              {...editingUser.surveyResponse, connectionType: e.target.value} :
                              {
                                id: '',
                                userId: editingUser.id,
                                fullName: editingUser.name || '',
                                email: editingUser.email,
                                age: '',
                                gender: '',
                                torontoMeaning: '',
                                personality: '',
                                connectionType: e.target.value,
                                instagramHandle: '',
                                howHeardAboutUs: '',
                                eventId: '',
                                eventName: '',
                                createdAt: '',
                                updatedAt: ''
                              }
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
                            surveyResponse: editingUser.surveyResponse ? 
                              {...editingUser.surveyResponse, howHeardAboutUs: e.target.value} :
                              {
                                id: '',
                                userId: editingUser.id,
                                fullName: editingUser.name || '',
                                email: editingUser.email,
                                age: '',
                                gender: '',
                                torontoMeaning: '',
                                personality: '',
                                connectionType: '',
                                instagramHandle: '',
                                howHeardAboutUs: e.target.value,
                                eventId: '',
                                eventName: '',
                                createdAt: '',
                                updatedAt: ''
                              }
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
            
            {/* Survey Details Form for New Users */}
            {!editingUser.id && (
              <div className="mt-6 space-y-6">
                <div className="border-b border-white/20 pb-2">
                  <h4 className="text-lg font-medium text-white">Survey Details</h4>
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm mb-3">{SURVEY_LABELS.torontoMeaning}</label>
                  <div className="space-y-2">
                    {SURVEY_OPTIONS.torontoMeaning.map((option) => (
                      <label key={option.value} className="flex items-start cursor-pointer">
                        <input
                          type="radio"
                          name={`torontoMeaning-new`}
                          value={option.value}
                          checked={editingUser.surveyResponse?.torontoMeaning === option.value}
                          onChange={(e) => setEditingUser({
                            ...editingUser, 
                            surveyResponse: {
                              ...editingUser.surveyResponse!,
                              torontoMeaning: e.target.value,
                              fullName: editingUser.name || '',
                              email: editingUser.email
                            }
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
                          name={`personality-new`}
                          value={option.value}
                          checked={editingUser.surveyResponse?.personality === option.value}
                          onChange={(e) => setEditingUser({
                            ...editingUser, 
                            surveyResponse: {
                              ...editingUser.surveyResponse!,
                              personality: e.target.value,
                              fullName: editingUser.name || '',
                              email: editingUser.email
                            }
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
                          name={`connectionType-new`}
                          value={option.value}
                          checked={editingUser.surveyResponse?.connectionType === option.value}
                          onChange={(e) => setEditingUser({
                            ...editingUser, 
                            surveyResponse: {
                              ...editingUser.surveyResponse!,
                              connectionType: e.target.value,
                              fullName: editingUser.name || '',
                              email: editingUser.email
                            }
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
                          name={`howHeard-new`}
                          value={option.value}
                          checked={editingUser.surveyResponse?.howHeardAboutUs === option.value}
                          onChange={(e) => setEditingUser({
                            ...editingUser, 
                            surveyResponse: {
                              ...editingUser.surveyResponse!,
                              howHeardAboutUs: e.target.value,
                              fullName: editingUser.name || '',
                              email: editingUser.email
                            }
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
            {editingUser.id && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/20 pb-2">
                  <h4 className="text-lg font-medium text-white">Cocktail Preferences</h4>
                  {editingUser.cocktailPreference && (
                    <span className="text-sm text-purple-300 bg-purple-600/20 px-2 py-1 rounded">
                      Event: {editingUser.cocktailPreference.eventName || editingUser.cocktailPreference.eventId}
                    </span>
                  )}
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
                            cocktailPreference: editingUser.cocktailPreference ? 
                              {...editingUser.cocktailPreference, preference: e.target.value} :
                              {
                                id: '',
                                userId: editingUser.id,
                                preference: e.target.value,
                                eventId: '',
                                eventName: '',
                                createdAt: '',
                                updatedAt: ''
                              }
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
            
            {/* Cocktail Preferences Form for New Users */}
            {!editingUser.id && (
              <div className="mt-6 space-y-4">
                <div className="border-b border-white/20 pb-2">
                  <h4 className="text-lg font-medium text-white">Cocktail Preferences</h4>
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm mb-3">{COCKTAIL_LABELS.preference}</label>
                  <div className="space-y-2">
                    {COCKTAIL_OPTIONS.map((option) => (
                      <label key={option.value} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name={`cocktail-new`}
                          value={option.value}
                          checked={editingUser.cocktailPreference?.preference === option.value}
                          onChange={(e) => setEditingUser({
                            ...editingUser, 
                            cocktailPreference: {
                              ...editingUser.cocktailPreference!,
                              preference: e.target.value
                            }
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
            
            {/* Tab Navigation */}
            <div className="flex space-x-1 mb-6 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setEventModalTab('basic')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                  eventModalTab === 'basic'
                    ? 'bg-blue-600/30 text-blue-200 border border-blue-400/50'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                Basic Information
              </button>
              <button
                onClick={() => setEventModalTab('details')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                  eventModalTab === 'details'
                    ? 'bg-blue-600/30 text-blue-200 border border-blue-400/50'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                Event Details
              </button>
            </div>
            
            {/* Basic Information Tab */}
            {eventModalTab === 'basic' && (
              <div>
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
                        value={selectedEvent.date ? selectedEvent.date.split('T')[0] : ''}
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

                {/* ✅ Description (now inside wrapper) */}
                <div className="mt-6">
                  <label className="block text-white/80 text-sm mb-2">Description</label>
                  <textarea
                    value={selectedEvent.description || ''}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                    placeholder="Event description..."
                  />
                </div>

                {/* ✅ Feature Toggles (inside wrapper) */}
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
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="googleMapsEnabled"
                          checked={selectedEvent.googleMapsEnabled}
                          onChange={(e) => setSelectedEvent({...selectedEvent, googleMapsEnabled: e.target.checked})}
                          className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded"
                        />
                        <label htmlFor="googleMapsEnabled" className="text-white/80 text-sm">Enable Maps</label>
                      </div>
                      
                      {selectedEvent.googleMapsEnabled && (
                        <div className="ml-7 space-y-2">
                          <label className="text-white/80 text-sm font-medium">Map Provider</label>
                          <select
                            value={selectedEvent.mapProvider}
                            onChange={(e) => setSelectedEvent({...selectedEvent, mapProvider: e.target.value as 'google' | 'openstreetmap'})}
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="google" className="bg-gray-800 text-white">Google Maps (requires API key)</option>
                            <option value="openstreetmap" className="bg-gray-800 text-white">OpenStreetMap (free)</option>
                          </select>
                          <p className="text-white/60 text-xs">
                            {selectedEvent.mapProvider === 'google' 
                              ? 'Uses Google Maps API - requires valid API key'
                              : 'Uses OpenStreetMap - no API key required'
                            }
                          </p>
                        </div>
                      )}
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

                {/* ✅ Velvet Hour Configuration */}
                {selectedEvent.theHourEnabled && (
                  <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-medium">Velvet Hour Configuration</h4>
                      <span className="text-xs text-white/60 bg-purple-600/20 px-2 py-1 rounded">Interactive Matching</span>
                    </div>
                    
                    {/* Availability Toggle */}
                    <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-white font-medium text-sm">Make Available to Users</label>
                          <p className="text-white/60 text-xs mt-1">
                            Controls if users see "Enter" or "Coming Soon". Admin must still start the session manually.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedEvent.theHourAvailable}
                          onChange={(e) => setSelectedEvent({...selectedEvent, theHourAvailable: e.target.checked})}
                          className="w-4 h-4 text-purple-600 bg-white/10 border-white/20 rounded"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-white/80 text-xs mb-1">Round Duration (min)</label>
                          <input
                            type="number"
                            min="1"
                            max="30"
                            defaultValue="10"
                            className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-white/80 text-xs mb-1">Break Duration (min)</label>
                          <input
                            type="number"
                            min="1"
                            max="15"
                            defaultValue="5"
                            className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-white/80 text-xs mb-1">Total Rounds</label>
                          <input
                            type="number"
                            min="1"
                            max="8"
                            defaultValue="4"
                            className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-white/80 text-xs mb-1">Min Participants</label>
                          <input
                            type="number"
                            min="2"
                            max="20"
                            defaultValue="4"
                            className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                          />
                        </div>
                      </div>
                      
                      <div className="text-xs text-white/60">
                        💡 Use the Velvet Hour tab to manage live sessions and start rounds manually.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Event Details Tab */}
            {eventModalTab === 'details' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-medium text-white">Event Details Sections</h4>
                  <button
                    onClick={() => {
                      const newDetail = {
                        id: '',
                        title: '',
                        sectionType: 'general',
                        content: '',
                        displayOrder: eventDetails.length
                      };
                      setEventDetails([...eventDetails, newDetail]);
                    }}
                    className="flex items-center space-x-2 px-3 py-1 bg-green-600/20 hover:bg-green-600/30 text-green-200 rounded-lg transition-all duration-200"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Section</span>
                  </button>
                </div>
                
                {eventDetails.length === 0 && (
                  <div className="text-center py-8 text-white/60">
                    <p>No event details sections yet. Add a section to get started.</p>
                  </div>
                )}
                
                {eventDetails.map((detail, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-white/80 text-sm mb-2">Section Title</label>
                        <input
                          type="text"
                          value={detail.title}
                          onChange={(e) => {
                            const updated = [...eventDetails];
                            updated[index] = { ...detail, title: e.target.value };
                            setEventDetails(updated);
                          }}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                          placeholder="Section Title"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-white/80 text-sm mb-2">Section Type</label>
                        <select
                          value={detail.sectionType}
                          onChange={(e) => {
                            const updated = [...eventDetails];
                            updated[index] = { ...detail, sectionType: e.target.value };
                            setEventDetails(updated);
                          }}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                        >
                          <option value="general">General</option>
                          <option value="who_we_curate">Who We're Curating</option>
                          <option value="about_event">About the Event</option>
                          <option value="about_org">About the Organization</option>
                          <option value="location">Location</option>
                          <option value="contact">Contact</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-white/80 text-sm mb-2">Content (HTML supported)</label>
                      <textarea
                        value={detail.content}
                        onChange={(e) => {
                          const updated = [...eventDetails];
                          updated[index] = { ...detail, content: e.target.value };
                          setEventDetails(updated);
                        }}
                        rows={6}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                        placeholder="Section content... HTML tags are supported for formatting."
                      />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <div>
                          <label className="block text-white/80 text-xs mb-1">Display Order</label>
                          <input
                            type="number"
                            value={detail.displayOrder}
                            onChange={(e) => {
                              const updated = [...eventDetails];
                              updated[index] = { ...detail, displayOrder: parseInt(e.target.value) || 0 };
                              setEventDetails(updated);
                            }}
                            className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                            min="0"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleSaveEventDetail(index)}
                          className="flex items-center space-x-1 px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 rounded transition-all duration-200"
                        >
                          <Save className="h-3 w-3" />
                          <span className="text-sm">Save</span>
                        </button>
                        <button
                          onClick={() => handleDeleteEventDetail(index)}
                          className="flex items-center space-x-1 px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-200 rounded transition-all duration-200"
                        >
                          <X className="h-3 w-3" />
                          <span className="text-sm">Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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

      {/* Audit Logs Tab */}
      {activeTab === 'audit-logs' && (
        <GlassCard className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">
              Audit Logs 📊
            </h2>
            <div className="flex items-center space-x-3">
              <input
                type="text"
                placeholder="Search logs..."
                value={auditLogsSearch}
                onChange={(e) => setAuditLogsSearch(e.target.value)}
                className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          {auditLogsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-12">
              <ScrollText className="h-12 w-12 mx-auto mb-4 text-white/50" />
              <p className="text-white/70">No audit logs found</p>
              <p className="text-white/50 text-sm mt-2">Admin actions will appear here</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left text-white/80 py-3 px-2">Date</th>
                      <th className="text-left text-white/80 py-3 px-2">Admin</th>
                      <th className="text-left text-white/80 py-3 px-2">Action</th>
                      <th className="text-left text-white/80 py-3 px-2">Target</th>
                      <th className="text-left text-white/80 py-3 px-2">Changes</th>
                      <th className="text-left text-white/80 py-3 px-2">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log: any) => (
                      <tr key={log.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-2 text-white/70 text-sm">
                          {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString()}
                        </td>
                        <td className="py-3 px-2 text-white">
                          <div className="text-sm">
                            <div className="font-medium">{log.adminName || 'System'}</div>
                            {log.adminEmail && (
                              <div className="text-white/60 text-xs">{log.adminEmail}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            log.action === 'user_delete' ? 'bg-red-600/20 text-red-200' :
                            log.action === 'user_update' ? 'bg-blue-600/20 text-blue-200' :
                            log.action === 'role_change' ? 'bg-purple-600/20 text-purple-200' :
                            log.action === 'survey_update' ? 'bg-green-600/20 text-green-200' :
                            log.action === 'cocktail_update' ? 'bg-yellow-600/20 text-yellow-200' :
                            log.action.includes('token') ? 'bg-indigo-600/20 text-indigo-200' :
                            'bg-gray-600/20 text-gray-200'
                          }`}>
                            {log.action.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-white">
                          {log.targetName ? (
                            <div className="text-sm">
                              <div className="font-medium">{log.targetName}</div>
                              {log.targetEmail && (
                                <div className="text-white/60 text-xs">{log.targetEmail}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-white/50 text-sm">—</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-white/70 text-sm max-w-xs">
                          {log.oldValue && Object.keys(log.oldValue).length > 0 && (
                            <details className="cursor-pointer">
                              <summary className="text-blue-300 hover:text-blue-200">View changes</summary>
                              <div className="mt-2 p-2 bg-black/20 rounded text-xs">
                                <div className="text-red-300 mb-1">Old: {JSON.stringify(log.oldValue, null, 2)}</div>
                                <div className="text-green-300">New: {JSON.stringify(log.newValue, null, 2)}</div>
                              </div>
                            </details>
                          )}
                        </td>
                        <td className="py-3 px-2 text-white/60 text-xs">
                          {log.ipAddress || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {auditLogsTotal > 20 && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/20">
                  <div className="text-white/70 text-sm">
                    Showing {((auditLogsPage - 1) * 20) + 1} to {Math.min(auditLogsPage * 20, auditLogsTotal)} of {auditLogsTotal} logs
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setAuditLogsPage(Math.max(1, auditLogsPage - 1))}
                      disabled={auditLogsPage === 1}
                      className="px-3 py-1 bg-white/10 text-white rounded disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setAuditLogsPage(auditLogsPage + 1)}
                      disabled={auditLogsPage * 20 >= auditLogsTotal}
                      className="px-3 py-1 bg-white/10 text-white rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </GlassCard>
      )}

      {/* Velvet Hour Tab */}
      {activeTab === 'velvet-hour' && (
        <div>
          {!activeEvent ? (
            <GlassCard className="p-6">
              <div className="text-center py-12">
                <Clock className="h-12 w-12 mx-auto mb-4 text-white/50" />
                <h3 className="text-lg font-semibold text-white mb-2">No Active Event</h3>
                <p className="text-white/70">You need to have an active event to manage Velvet Hour.</p>
                <p className="text-white/50 text-sm mt-2">
                  Go to the Events tab and activate an event first.
                </p>
              </div>
            </GlassCard>
          ) : velvetHourLoading ? (
            <GlassCard className="p-6">
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            </GlassCard>
          ) : velvetHourStatus ? (
            <VelvetHourControl
              eventId={activeEvent.id}
              eventTitle={activeEvent.title}
              eventDate={activeEvent.date}
              eventTime={activeEvent.time}
              status={velvetHourStatus}
              onStartSession={handleVelvetHourStartSession}
              onStartRound={handleVelvetHourStartRound}
              onEndSession={handleVelvetHourEndSession}
              onUpdateConfig={handleVelvetHourUpdateConfig}
              onResetSession={handleVelvetHourResetSession}
            />
          ) : (
            <GlassCard className="p-6">
              <div className="text-center py-12">
                <Clock className="h-12 w-12 mx-auto mb-4 text-white/50" />
                <h3 className="text-lg font-semibold text-white mb-2">Failed to Load</h3>
                <p className="text-white/70">Could not load Velvet Hour status.</p>
                <button
                  onClick={loadVelvetHourStatus}
                  className="mt-4 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 rounded-lg transition-all duration-200"
                >
                  Retry
                </button>
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* API Tokens Tab */}
      {activeTab === 'tokens' && (
        <GlassCard className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">
              API Tokens 🔑
            </h2>
            <button 
              onClick={() => setShowCreateTokenModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-200 rounded-lg transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              <span>Create Token</span>
            </button>
          </div>

          {tokensLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-12">
              <Key className="h-12 w-12 mx-auto mb-4 text-white/50" />
              <p className="text-white/70">No API tokens yet</p>
              <p className="text-white/50 text-sm mt-2">Create your first token to access the API programmatically</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left text-white/80 py-3 px-2">Name</th>
                    <th className="text-left text-white/80 py-3 px-2">Last Used</th>
                    <th className="text-left text-white/80 py-3 px-2">Expires</th>
                    <th className="text-left text-white/80 py-3 px-2">Created</th>
                    <th className="text-left text-white/80 py-3 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((token: any) => (
                    <tr key={token.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-2 text-white">
                        <div className="font-medium">{token.name}</div>
                      </td>
                      <td className="py-3 px-2 text-white/70 text-sm">
                        {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-3 px-2 text-white/70 text-sm">
                        {token.expiresAt ? (
                          <span className={new Date(token.expiresAt) < new Date() ? 'text-red-400' : ''}>
                            {new Date(token.expiresAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-green-400">Never</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-white/70 text-sm">
                        {new Date(token.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2">
                        <button
                          onClick={() => handleDeleteToken(token.id, token.name)}
                          className="p-1 bg-red-600/20 hover:bg-red-600/30 text-red-200 rounded transition-all duration-200"
                          title="Delete Token"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {/* Create Token Modal */}
      {showCreateTokenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-black/80 backdrop-blur-md border border-white/20 rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Create API Token</h3>
              <button
                onClick={() => setShowCreateTokenModal(false)}
                className="text-white/60 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white/80 text-sm mb-2">Token Name</label>
                <input
                  type="text"
                  value={newTokenData.name}
                  onChange={(e) => setNewTokenData({ ...newTokenData, name: e.target.value })}
                  placeholder="e.g., API Scripts, Mobile App, etc."
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm mb-2">Expires In</label>
                <select
                  value={newTokenData.expiresIn}
                  onChange={(e) => setNewTokenData({ ...newTokenData, expiresIn: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                >
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                  <option value={365}>1 year</option>
                  <option value={0}>Never expires</option>
                </select>
              </div>

              <div className="bg-yellow-600/20 border border-yellow-400/30 rounded-lg p-3">
                <p className="text-yellow-200 text-sm">
                  ⚠️ The token will only be shown once. Make sure to copy it!
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateTokenModal(false)}
                className="px-4 py-2 text-white/70 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateToken}
                disabled={!newTokenData.name.trim()}
                className="px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-200 rounded-lg transition-all duration-200 disabled:opacity-50"
              >
                Create Token
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Created Token Display Modal */}
      {createdToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-black/80 backdrop-blur-md border border-white/20 rounded-xl p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Token Created Successfully! 🎉</h3>
              <button
                onClick={() => setCreatedToken('')}
                className="text-white/60 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-red-600/20 border border-red-400/30 rounded-lg p-4">
                <h4 className="text-red-200 font-medium mb-2">⚠️ Important Security Notice</h4>
                <p className="text-red-200/80 text-sm">
                  This is your personal access token. Copy it now as it won't be shown again.
                  Treat it like a password and store it securely.
                </p>
              </div>

              <div>
                <label className="block text-white/80 text-sm mb-2">Your Personal Access Token</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={createdToken}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white font-mono text-sm"
                  />
                  <button
                    onClick={() => copyTokenToClipboard(createdToken)}
                    className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 rounded-lg transition-all duration-200"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="bg-blue-600/20 border border-blue-400/30 rounded-lg p-4">
                <h4 className="text-blue-200 font-medium mb-2">💡 How to Use This Token</h4>
                <div className="text-blue-200/80 text-sm space-y-2">
                  <p>Include this token in your API requests:</p>
                  <code className="block bg-black/40 p-2 rounded text-xs">
                    curl -H "Authorization: Bearer {createdToken}" http://localhost:8080/api/admin/users
                  </code>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setCreatedToken('')}
                className="px-4 py-2 bg-gray-600/20 hover:bg-gray-600/30 text-gray-200 rounded-lg transition-all duration-200"
              >
                I've Copied It Safely
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
