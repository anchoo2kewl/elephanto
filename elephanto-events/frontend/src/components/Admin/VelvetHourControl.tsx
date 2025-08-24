import React, { useState, useEffect } from 'react';
import { AdminVelvetHourControlProps, ManualMatch } from '@/types/velvet-hour';
import { velvetHourApi } from '@/services/velvetHourApi';
import { DraggableMatchmaking } from './DraggableMatchmaking';
import { useWebSocket, MESSAGE_TYPES } from '@/services/websocket';
import { useToast } from '@/components/Toast';
import { Play, Square, Settings, Users, Clock, Target, Calendar, RotateCcw, WifiOff } from 'lucide-react';

export const VelvetHourControl: React.FC<AdminVelvetHourControlProps> = ({
  eventId,
  eventTitle,
  eventDate,
  eventTime,
  status,
  onStartSession,
  onStartRound,
  onEndSession,
  onUpdateConfig,
  onResetSession
}) => {
  const { showToast } = useToast();
  const [showConfig, setShowConfig] = useState(false);
  const [showMatchmaking, setShowMatchmaking] = useState(false);
  const [manualMatches, setManualMatches] = useState<ManualMatch[]>([]);
  const [matchStats, setMatchStats] = useState({ 
    incompleteMatches: 0, 
    completeMatches: 0, 
    duplicatePairings: 0, 
    validationErrors: [] as string[] 
  });
  const [showAttendingModal, setShowAttendingModal] = useState(false);
  const [showPresentModal, setShowPresentModal] = useState(false);
  const [attendingUsers, setAttendingUsers] = useState<any[]>([]);
  const [presentUsers, setPresentUsers] = useState<any[]>([]);
  const [config, setConfig] = useState({
    roundDuration: 10,
    breakDuration: 5,
    totalRounds: 4
  });


  // Update config when status changes (load values from database)
  useEffect(() => {
    if (status?.config) {
      setConfig({
        roundDuration: status.config.roundDuration,
        breakDuration: status.config.breakDuration,
        totalRounds: status.config.totalRounds
      });
    }
  }, [status?.config]);

  // Calculate minimum participants based on total rounds (round-robin formula)
  const calculateMinParticipants = (totalRounds: number) => {
    // For R rounds: n_min = R if R is odd, R+1 if R is even
    return totalRounds % 2 === 0 ? totalRounds + 1 : totalRounds;
  };
  const [attendanceStats, setAttendanceStats] = useState<{
    attendingCount: number;
    presentCount: number;
    minParticipants: number;
    canStart: boolean;
    alreadyStarted: boolean;
  } | null>(null);

  // WebSocket connection for real-time updates
  const { isConnected, subscribe } = useWebSocket(eventId);

  // Fetch attendance stats
  useEffect(() => {
    const fetchAttendanceStats = async () => {
      try {
        console.log('🔄 Fetching initial attendance stats for event:', eventId);
        const response = await velvetHourApi.getAttendanceStats(eventId);
        console.log('📊 Initial attendance stats fetched:', response.data);
        console.log('📍 Setting initial attendanceStats state to:', response.data);
        setAttendanceStats(response.data);
      } catch (error) {
        console.error('❌ Failed to fetch initial attendance stats:', error);
      }
    };

    if (eventId) {
      fetchAttendanceStats();
    }

    // Listen for WebSocket connection events to refresh stats
    const handleWebSocketConnected = (event: CustomEvent) => {
      if (event.detail.eventId === eventId) {
        console.log('🌐 WebSocket connected for event:', eventId, ', refreshing attendance stats');
        // Small delay to let backend process the connection
        setTimeout(() => {
          console.log('⏰ Delayed fetch after WebSocket connection...');
          fetchAttendanceStats();
        }, 500); // Increased delay to 500ms to ensure backend has processed the connection
      }
    };

    window.addEventListener('websocket-connected', handleWebSocketConnected as EventListener);

    return () => {
      window.removeEventListener('websocket-connected', handleWebSocketConnected as EventListener);
    };
  }, [eventId]); // Only re-fetch when eventId changes, not session status

  // WebSocket event listeners for real-time updates
  useEffect(() => {
    // Set up subscriptions immediately when eventId is available, don't wait for isConnected
    // This prevents race conditions where WebSocket connects and sends messages before React state updates
    if (!eventId) return;

    const unsubscribeAttendance = subscribe(MESSAGE_TYPES.ATTENDANCE_STATS_UPDATE, (data) => {
      console.log('🔄 Attendance stats update received:', data);
      console.log('🔍 Message type check - data.type:', data.type, 'data.presentCount:', data.presentCount);
      
      // Check if this is a presence update (real-time WebSocket connect/disconnect)
      if (data.type === 'presence_update' && data.presentCount !== undefined) {
        console.log('✅ Processing presence update - setting presentCount to:', data.presentCount);
        // Update only the present count for real-time updates
        setAttendanceStats(prev => {
          console.log('📊 Previous attendance stats:', prev);
          const updated = prev ? {
            ...prev,
            presentCount: data.presentCount,
            canStart: data.presentCount >= prev.minParticipants && !prev.alreadyStarted
          } : null;
          console.log('📈 Updated attendance stats:', updated);
          return updated;
        });
        
        // If present users modal is open, refresh the user list
        if (showPresentModal) {
          const refreshPresentUsers = async () => {
            try {
              const response = await velvetHourApi.getPresentUsers(eventId);
              setPresentUsers(response.data);
              console.log('🔄 Refreshed present users modal due to presence update');
            } catch (error) {
              console.error('❌ Failed to refresh present users in modal:', error);
            }
          };
          refreshPresentUsers();
        }
      } else {
        console.log('🔄 Non-presence update, refreshing all stats from API');
        // For other attendance updates, refresh all stats from API
        const fetchAttendanceStats = async () => {
          try {
            const response = await velvetHourApi.getAttendanceStats(eventId);
            console.log('📊 Fetched fresh attendance stats:', response.data);
            setAttendanceStats(response.data);
          } catch (error) {
            console.error('❌ Failed to fetch attendance stats after update:', error);
          }
        };
        fetchAttendanceStats();
      }
    });

    const unsubscribeParticipantJoined = subscribe(MESSAGE_TYPES.VELVET_HOUR_PARTICIPANT_JOINED, (data) => {
      console.log('Participant joined:', data);
      // The parent component should refresh the status which will trigger re-render
      // We can also manually refresh attendance stats here
      const fetchAttendanceStats = async () => {
        try {
          const response = await velvetHourApi.getAttendanceStats(eventId);
          setAttendanceStats(response.data);
        } catch (error) {
          console.error('Failed to fetch attendance stats after participant joined:', error);
        }
      };
      fetchAttendanceStats();
    });

    const unsubscribeSessionStarted = subscribe(MESSAGE_TYPES.VELVET_HOUR_SESSION_STARTED, (data) => {
      console.log('Velvet Hour session started:', data);
      // Parent will handle session status updates
    });

    const unsubscribeRoundStarted = subscribe(MESSAGE_TYPES.VELVET_HOUR_ROUND_STARTED, (data) => {
      console.log('Velvet Hour round started:', data);
      // Parent will handle status updates
    });

    const unsubscribeSessionEnded = subscribe(MESSAGE_TYPES.VELVET_HOUR_SESSION_ENDED, (data) => {
      console.log('Velvet Hour session ended:', data);
      // Parent will handle status updates
    });

    const unsubscribeStatusUpdate = subscribe(MESSAGE_TYPES.VELVET_HOUR_STATUS_UPDATE, (data) => {
      console.log('Velvet Hour status update:', data);
      // Refresh attendance stats and let parent handle session status
      const fetchAttendanceStats = async () => {
        try {
          const response = await velvetHourApi.getAttendanceStats(eventId);
          setAttendanceStats(response.data);
        } catch (error) {
          console.error('Failed to fetch attendance stats after status update:', error);
        }
      };
      fetchAttendanceStats();
    });

    const unsubscribeFeedbackSubmitted = subscribe(MESSAGE_TYPES.VELVET_HOUR_FEEDBACK_SUBMITTED, (data) => {
      console.log('Velvet Hour feedback submitted:', data);
      // Force refresh of the admin status to show updated feedback status
      // The parent component should handle this by re-fetching admin status
      // We could also trigger a status refresh event here
    });

    // Handle user join/leave events for real-time attendance updates
    const unsubscribeUserJoined = subscribe(MESSAGE_TYPES.USER_JOINED_EVENT, (data) => {
      console.log('User joined event:', data);
      const fetchAttendanceStats = async () => {
        try {
          const response = await velvetHourApi.getAttendanceStats(eventId);
          setAttendanceStats(response.data);
        } catch (error) {
          console.error('Failed to fetch attendance stats after user joined:', error);
        }
      };
      fetchAttendanceStats();
    });

    const unsubscribeUserLeft = subscribe(MESSAGE_TYPES.USER_LEFT_EVENT, (data) => {
      console.log('User left event:', data);
      const fetchAttendanceStats = async () => {
        try {
          const response = await velvetHourApi.getAttendanceStats(eventId);
          setAttendanceStats(response.data);
        } catch (error) {
          console.error('Failed to fetch attendance stats after user left:', error);
        }
      };
      fetchAttendanceStats();
    });

    // Cleanup subscriptions
    return () => {
      unsubscribeAttendance();
      unsubscribeParticipantJoined();
      unsubscribeSessionStarted();
      unsubscribeRoundStarted();
      unsubscribeSessionEnded();
      unsubscribeStatusUpdate();
      unsubscribeFeedbackSubmitted();
      unsubscribeUserJoined();
      unsubscribeUserLeft();
    };
  }, [eventId, subscribe, showPresentModal]);

  // Calculate max possible matches
  const maxMatches = Math.floor(status.participants.length / 2);

  // Get all previous matches for duplicate validation
  const getAllPreviousMatches = () => {
    // For now, we'll use the current matches from status as "previous" matches
    // In a production system, the backend should provide all historical matches from completed rounds
    // This is a simplified implementation for demonstration
    if (status.currentMatches && status.currentMatches.length > 0) {
      // Return the full VelvetHourMatch objects for validation
      return status.currentMatches;
    }
    return [];
  };

  // Helper function to format time for admin
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate time remaining in seconds for precise countdown
  const calculateTimeRemaining = () => {
    if (!status.session?.roundEndsAt) return 0;
    const now = Date.now();
    const endTime = new Date(status.session.roundEndsAt).getTime();
    const timeLeftSeconds = Math.max(0, Math.floor((endTime - now) / 1000));
    return timeLeftSeconds;
  };

  const [currentTimeRemaining, setCurrentTimeRemaining] = useState(0);

  // Update timer every second for real-time countdown
  useEffect(() => {
    const updateTimer = () => {
      setCurrentTimeRemaining(calculateTimeRemaining());
    };

    // Update immediately
    updateTimer();

    // Set up interval if session has an end time
    if (status.session?.roundEndsAt) {
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [status.session?.roundEndsAt]);

  const handleStartRound = () => {
    // Button should only be enabled when all conditions are met
    // So we can proceed directly without additional validation
    if (showMatchmaking && manualMatches.length > 0) {
      // Using manual matches
      onStartRound(manualMatches);
    } else if (!showMatchmaking) {
      // Using automatic matching
      onStartRound();
    }
    // Note: if showMatchmaking is true but no matches, button should be disabled
    setShowMatchmaking(false);
    setManualMatches([]);
    setMatchStats({ incompleteMatches: 0, completeMatches: 0, duplicatePairings: 0, validationErrors: [] });
  };

  const handleCloseRound = async () => {
    try {
      await velvetHourApi.closeRound(eventId);
      showToast('Round closed successfully! Break period started.', 'success');
    } catch (error) {
      console.error('Failed to close round:', error);
      showToast('Failed to close round', 'error');
    }
  };

  const handleUpdateConfig = () => {
    onUpdateConfig(config);
    setShowConfig(false);
  };

  const handleShowAttendingUsers = async () => {
    try {
      const response = await velvetHourApi.getAttendingUsers(eventId);
      setAttendingUsers(response.data);
      setShowAttendingModal(true);
    } catch (error) {
      console.error('Failed to fetch attending users:', error);
    }
  };

  const handleShowPresentUsers = async () => {
    try {
      const response = await velvetHourApi.getPresentUsers(eventId);
      setPresentUsers(response.data);
      setShowPresentModal(true);
    } catch (error) {
      console.error('Failed to fetch present users:', error);
    }
  };

  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  const handleClearConnections = async () => {
    setShowClearDialog(false);
    
    try {
      const response = await velvetHourApi.clearWebSocketConnections(eventId);
      console.log('Cleared connections:', response.data);
      
      // Refresh attendance stats to show updated count
      const statsResponse = await velvetHourApi.getAttendanceStats(eventId);
      setAttendanceStats(statsResponse.data);
      
    } catch (error) {
      console.error('Failed to clear connections:', error);
    }
  };

  const handleResetSession = async () => {
    setShowResetDialog(false);
    
    try {
      // Call the parent's reset handler which will handle the API call and WebSocket broadcasts
      if (onResetSession) {
        onResetSession();
      }
    } catch (error) {
      console.error('Failed to reset session:', error);
    }
  };

  // Handle escape key for modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAttendingModal) {
          setShowAttendingModal(false);
        }
        if (showPresentModal) {
          setShowPresentModal(false);
        }
        if (showClearDialog) {
          setShowClearDialog(false);
        }
        if (showResetDialog) {
          setShowResetDialog(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showAttendingModal, showPresentModal, showClearDialog, showResetDialog]);

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 bg-white/10 rounded-xl border border-white/20">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Velvet Hour Control</h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-white/70 mb-2">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span className="font-medium text-sm">{eventTitle}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{new Date(eventDate).toLocaleDateString()} at {eventTime}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-xs">{isConnected ? 'Live' : 'Offline'}</span>
              </div>
            </div>
            <p className="text-white/60 text-sm">
              Manage the interactive matching experience for attendees
            </p>
          </div>
          
          {/* Control Buttons - Stack on mobile, inline on larger screens */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 lg:flex-nowrap">
            {status.session && onResetSession && (
              <button
                onClick={() => setShowResetDialog(true)}
                className="flex items-center justify-center space-x-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-200 rounded-lg border border-red-400/30 transition-all duration-200 text-sm whitespace-nowrap"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">Reset Session</span>
                <span className="sm:hidden">Reset</span>
              </button>
            )}
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center justify-center space-x-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg border border-white/20 transition-all duration-200 text-sm whitespace-nowrap"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden">Config</span>
            </button>
            <button
              onClick={() => setShowClearDialog(true)}
              className="flex items-center justify-center space-x-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-200 rounded-lg border border-red-400/30 transition-all duration-200 font-semibold text-sm whitespace-nowrap"
            >
              <WifiOff className="h-4 w-4" />
              <span className="hidden md:inline">⚠️ Disconnect All Users</span>
              <span className="hidden sm:inline md:hidden">Disconnect All</span>
              <span className="sm:hidden">Disconnect</span>
            </button>
          </div>
        </div>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="bg-white/10 rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Velvet Hour Configuration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">Round Duration (minutes)</label>
              <input
                type="number"
                value={config.roundDuration}
                onChange={(e) => setConfig({ ...config, roundDuration: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white"
                min="1"
                max="30"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">Break Duration (minutes)</label>
              <input
                type="number"
                value={config.breakDuration}
                onChange={(e) => setConfig({ ...config, breakDuration: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white"
                min="1"
                max="15"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">Total Rounds</label>
              <input
                type="number"
                value={config.totalRounds}
                onChange={(e) => setConfig({ ...config, totalRounds: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white"
                min="1"
                max="8"
              />
            </div>
          </div>
          <div className="mb-4">
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/70">Minimum Participants Required:</span>
                <span className="text-lg font-semibold text-white">
                  {calculateMinParticipants(config.totalRounds)} people
                </span>
              </div>
              <p className="text-xs text-white/50 mt-2">
                Automatically calculated for {config.totalRounds} rounds using round-robin matching
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleUpdateConfig}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors duration-200 text-sm"
            >
              Save Configuration
            </button>
            <button
              onClick={() => setShowConfig(false)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors duration-200 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Session Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white/10 rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-white">Session Status</h3>
            <Users className="h-5 w-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white mb-1">
            {status.session ? status.session.status.toUpperCase() : 'NOT STARTED'}
          </p>
          <p className="text-sm text-white/70">
            {status.participants.length} participants joined
          </p>
        </div>

        <div className="bg-white/10 rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-white">Current Round</h3>
            <Target className="h-5 w-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white mb-1">
            {status.session?.currentRound || 0} / {status.config?.totalRounds || config.totalRounds}
          </p>
          <p className="text-sm text-white/70">
            {status.currentMatches.length} active matches
          </p>
        </div>

        <div className="bg-white/10 rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-white">Time Remaining</h3>
            <Clock className="h-5 w-5 text-yellow-400" />
          </div>
          <p className="text-2xl font-bold text-white mb-1">
            {status.session?.roundEndsAt && currentTimeRemaining > 0 ? 
              formatTime(currentTimeRemaining)
              : status.session?.roundEndsAt ? '0:00' : '--'
            }
          </p>
          <p className="text-sm text-white/70">
            {status.session?.status === 'in_round' ? 'Until round ends' : 'Until break ends'}
          </p>
        </div>
      </div>

      {/* Attendance Status */}
      {!status.session && attendanceStats && (
        <div className="bg-white/10 rounded-xl p-6 border border-white/20 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Attendance Requirements</h3>
            <Users className="h-5 w-5 text-blue-400" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <button 
              onClick={handleShowAttendingUsers}
              className="text-center bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-all duration-200"
            >
              <p className="text-2xl font-bold text-white">{attendanceStats.attendingCount}</p>
              <p className="text-sm text-white/70">Marked Attending</p>
              <p className="text-xs text-white/40 mt-1">Click to view details</p>
            </button>
            <button 
              onClick={handleShowPresentUsers}
              className="text-center bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-all duration-200"
            >
              <p className="text-2xl font-bold text-green-400">{attendanceStats.presentCount || 0}</p>
              <p className="text-sm text-white/70">Actually Present</p>
              <p className="text-xs text-white/40 mt-1">Click to view details</p>
            </button>
            <div className="text-center bg-white/5 rounded-lg p-3">
              <p className="text-2xl font-bold text-cyan-400">{attendanceStats.minParticipants}</p>
              <p className="text-sm text-white/70">Minimum Required</p>
              <p className="text-xs text-white/40 mt-1">Auto-calculated</p>
            </div>
          </div>

          {!attendanceStats.canStart && (
            <div className="bg-yellow-600/20 border border-yellow-600/30 rounded-lg p-3 mb-4">
              <p className="text-yellow-200 text-sm">
                {attendanceStats.alreadyStarted 
                  ? "⚠️ Velvet Hour has already been run for this event. Use 'Reset Session' to run again."
                  : `⚠️ Need ${attendanceStats.minParticipants - (attendanceStats.presentCount || 0)} more users to be present and connected. (${attendanceStats.attendingCount - (attendanceStats.presentCount || 0)} marked attending but not connected)`
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4">
        {!status.session && (
          <div className="flex flex-col">
            <button
              onClick={onStartSession}
              disabled={!attendanceStats?.canStart}
              className={`
                flex items-center justify-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-sm sm:text-base whitespace-nowrap
                ${attendanceStats?.canStart
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-gray-600 cursor-not-allowed text-gray-300'
                }
                transition-colors duration-200
              `}
            >
              <Play className="h-4 w-4" />
              <span>Start Velvet Hour</span>
            </button>
            {!attendanceStats?.canStart && attendanceStats && (
              <p className="text-xs text-white/60 mt-2 max-w-xs">
                {attendanceStats.alreadyStarted 
                  ? "Session already completed"
                  : `Only ${attendanceStats.presentCount || 0} of ${attendanceStats.minParticipants} minimum users are present`
                }
              </p>
            )}
          </div>
        )}

        {status.session && status.canStartRound && (
          <>
            <div className="flex flex-col">
              {(() => {
                // Determine if we can start the round based on current matching state
                let canStartRound = false;
                let disabledReason = "";
                
                if (showMatchmaking) {
                  // In manual matchmaking mode - all rooms with people must be complete (2 people per room)
                  if (matchStats.incompleteMatches > 0) {
                    canStartRound = false;
                    disabledReason = `${matchStats.incompleteMatches} room${matchStats.incompleteMatches > 1 ? 's' : ''} incomplete - all rooms must have 2 people`;
                  } else if (matchStats.completeMatches > 0) {
                    canStartRound = true;
                    disabledReason = `${matchStats.completeMatches} room${matchStats.completeMatches > 1 ? 's' : ''} ready to start`;
                  } else {
                    canStartRound = false;
                    disabledReason = "No matches created - drag participants into rooms";
                  }
                } else {
                  // Default mode - need at least 2 participants for automatic matching
                  if (status.participants.length < 2) {
                    canStartRound = false;
                    disabledReason = "Need at least 2 participants to start a round";
                  } else {
                    canStartRound = true;
                    disabledReason = `${Math.floor(status.participants.length / 2)} complete rooms can be created${status.participants.length % 2 === 1 ? ' (1 participant will sit out)' : ''}`;
                  }
                }

                return (
                  <>
                    <button
                      onClick={handleStartRound}
                      disabled={!canStartRound}
                      className={`
                        flex items-center justify-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-sm sm:text-base whitespace-nowrap transition-colors duration-200
                        ${canStartRound
                          ? 'bg-blue-600 hover:bg-blue-500 text-white'
                          : 'bg-gray-600 cursor-not-allowed text-gray-300'
                        }
                      `}
                    >
                      <Play className="h-4 w-4" />
                      <span>Start Next Round</span>
                    </button>
                    <p className="text-xs text-white/60 mt-2 max-w-xs">
                      {disabledReason}
                    </p>
                  </>
                );
              })()}
            </div>
            
            <button
              onClick={() => setShowMatchmaking(!showMatchmaking)}
              className="flex items-center justify-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold text-sm sm:text-base whitespace-nowrap transition-colors duration-200"
            >
              <Target className="h-4 w-4" />
              <span>Matches</span>
            </button>
          </>
        )}

        {status.session && (
          <>
            {status.session.status === 'in_round' && (
              <button
                onClick={handleCloseRound}
                className="flex items-center justify-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold text-sm sm:text-base whitespace-nowrap transition-colors duration-200"
              >
                <Clock className="h-4 w-4" />
                <span>End Round</span>
              </button>
            )}

            {(status.session.status === 'break' || (status.session.status === 'waiting' && status.session.currentRound > 0)) && 
             status.session.currentRound < (status.config?.totalRounds || 4) && (
              <>
                <div className="flex flex-col">
                  {(() => {
                    // Check for validation errors when starting next round
                    let canStartRound = false;
                    let disabledReason = "";
                    
                    if (!showMatchmaking) {
                      // Default state: admin must use Preview Matches first
                      canStartRound = false;
                      disabledReason = "Click 'Preview Matches' to see and customize Round 2 pairings";
                    } else {
                      // In manual matchmaking mode - check all validation conditions
                      if (matchStats.duplicatePairings > 0) {
                        canStartRound = false;
                        disabledReason = `${matchStats.duplicatePairings} duplicate pairing${matchStats.duplicatePairings > 1 ? 's' : ''} found - these participants have already been matched`;
                      } else if (matchStats.incompleteMatches > 0) {
                        canStartRound = false;
                        disabledReason = `${matchStats.incompleteMatches} room${matchStats.incompleteMatches > 1 ? 's' : ''} incomplete - all rooms must have 2 people`;
                      } else if (matchStats.completeMatches > 0) {
                        canStartRound = true;
                        disabledReason = `${matchStats.completeMatches} room${matchStats.completeMatches > 1 ? 's' : ''} ready to start`;
                      } else {
                        canStartRound = false;
                        disabledReason = "No matches created - drag participants into rooms";
                      }
                    }

                    const handleStartNextRound = () => {
                      if (showMatchmaking && manualMatches.length > 0) {
                        // Using manual matches
                        onStartRound(manualMatches);
                      } else if (!showMatchmaking) {
                        // Using automatic matching
                        onStartRound();
                      }
                      setShowMatchmaking(false);
                      setManualMatches([]);
                      setMatchStats({ incompleteMatches: 0, completeMatches: 0, duplicatePairings: 0, validationErrors: [] });
                    };
                    
                    return (
                      <>
                        <button
                          onClick={handleStartNextRound}
                          disabled={!canStartRound}
                          className={`
                            flex items-center justify-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-sm sm:text-base whitespace-nowrap transition-colors duration-200
                            ${canStartRound
                              ? 'bg-green-600 hover:bg-green-500 text-white'
                              : 'bg-gray-600 cursor-not-allowed text-gray-300'
                            }
                          `}
                        >
                          <Play className="h-4 w-4" />
                          <span>Start Round {status.session.currentRound + 1}</span>
                        </button>
                        <p className="text-xs text-white/60 mt-2 max-w-xs text-center">
                          {disabledReason}
                        </p>
                      </>
                    );
                  })()}
                </div>
                
                <button
                  onClick={() => setShowMatchmaking(!showMatchmaking)}
                  className="flex items-center justify-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold text-sm sm:text-base whitespace-nowrap transition-colors duration-200"
                >
                  <Target className="h-4 w-4" />
                  <span>Preview Matches</span>
                </button>
              </>
            )}
            
            <button
              onClick={onEndSession}
              className="flex items-center justify-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold text-sm sm:text-base whitespace-nowrap transition-colors duration-200"
            >
              <Square className="h-4 w-4" />
              <span>End Session</span>
            </button>
          </>
        )}
      </div>

      {/* Manual Matchmaking */}
      {showMatchmaking && (
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">
            Matchmaking - Round {(status.session?.currentRound || 0) + 1}
          </h3>
          <DraggableMatchmaking
            participants={status.participants}
            onMatchesChange={setManualMatches}
            onMatchStatsChange={setMatchStats}
            maxMatches={maxMatches}
            eventId={eventId}
            previousMatches={getAllPreviousMatches()}
          />
          
          {/* Match Status moved below the draggable component */}
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white text-sm mt-4">
            <div className="flex flex-col space-y-2">
              <div className="flex justify-between items-center">
                <span>Match Status:</span>
                <span className={`font-semibold ${
                  matchStats.duplicatePairings > 0 ? 'text-red-400' :
                  matchStats.completeMatches > 0 && matchStats.incompleteMatches === 0 ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {matchStats.duplicatePairings > 0 ? '⚠️ Duplicate pairings detected' :
                   matchStats.completeMatches > 0 && matchStats.incompleteMatches === 0 ? 'All matches complete ✓' : 'Incomplete matches'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="text-center">
                  <div className="text-green-400 font-bold text-lg">{manualMatches.filter(match => match.user1Id && match.user2Id).length}</div>
                  <div className="text-white/70">Complete Matches</div>
                </div>
                <div className="text-center">
                  <div className="text-yellow-400 font-bold text-lg">{manualMatches.filter(match => !match.user1Id || !match.user2Id).length}</div>
                  <div className="text-white/70">Incomplete Matches</div>
                </div>
                <div className="text-center">
                  <div className="text-blue-400 font-bold text-lg">{status.participants.length - (manualMatches.filter(match => match.user1Id && match.user2Id).length * 2)}</div>
                  <div className="text-white/70">Unmatched Users</div>
                </div>
                <div className="text-center">
                  <div className="text-cyan-400 font-bold text-lg">{manualMatches.length}</div>
                  <div className="text-white/70">Active Zones</div>
                </div>
              </div>
              
              {/* Show validation errors */}
              {matchStats.validationErrors.length > 0 && (
                <div className="pt-2 border-t border-white/20">
                  <div className="text-red-300 text-xs font-semibold mb-2">⚠️ Validation Errors:</div>
                  <div className="space-y-1">
                    {matchStats.validationErrors.map((error, index) => (
                      <div key={index} className="text-red-200 text-xs">• {error}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Show general warnings if no validation errors */}
              {matchStats.validationErrors.length === 0 && !(matchStats.completeMatches > 0 && matchStats.incompleteMatches === 0) && (
                <div className="text-center pt-2 border-t border-white/20">
                  <span className="text-yellow-200 text-xs">
                    ⚠️ All rooms must have exactly 2 people to start the next round
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-4">
            <p className="text-sm text-white/70 text-center sm:text-left">
              {manualMatches.length} of {maxMatches} possible matches created
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setShowMatchmaking(false);
                  setManualMatches([]);
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors duration-200 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participants List */}
      <div className="bg-white/10 rounded-xl p-6 border border-white/20">
        <h3 className="text-lg font-semibold text-white mb-4">Participants ({status.participants.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {status.participants.map((participant) => (
            <div
              key={participant.id}
              className="bg-white/5 rounded-lg p-4 border border-white/10"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-white">{participant.userName}</h4>
                <div className={`
                  w-3 h-3 rounded-full
                  ${participant.status === 'waiting' ? 'bg-yellow-400' :
                    participant.status === 'matched' ? 'bg-blue-400' :
                    participant.status === 'in_round' ? 'bg-green-400' :
                    'bg-gray-400'
                  }
                `}></div>
              </div>
              <p className="text-xs text-white/60">{participant.userEmail}</p>
              <p className="text-sm text-white/70 capitalize">{participant.status}</p>
            </div>
          ))}
          {status.participants.length === 0 && (
            <div className="col-span-full text-center py-8">
              <p className="text-white/60">No participants yet</p>
              <p className="text-sm text-white/40">Users will appear here when they join</p>
            </div>
          )}
        </div>
      </div>

      {/* Current Matches */}
      {status.currentMatches.length > 0 && (
        <div className="bg-white/10 rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">
            {status.session?.status === 'in_round' ? 
              `Current Matches - Round ${status.session?.currentRound}` :
              `Awaiting Feedback from Round ${status.session?.currentRound}`
            }
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {status.currentMatches.map((match) => (
              <div
                key={match.id}
                className="bg-white/5 rounded-lg p-4 border border-white/10"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-white font-bold
                    ${match.matchColor === 'red' ? 'bg-red-500' :
                      match.matchColor === 'blue' ? 'bg-blue-500' :
                      match.matchColor === 'green' ? 'bg-green-500' :
                      match.matchColor === 'purple' ? 'bg-purple-500' :
                      match.matchColor === 'orange' ? 'bg-orange-500' :
                      match.matchColor === 'yellow' ? 'bg-yellow-500' :
                      match.matchColor === 'pink' ? 'bg-pink-500' :
                      'bg-cyan-500'
                    }
                  `}>
                    {match.matchNumber}
                  </div>
                  <div className="flex space-x-1">
                    <div className={`
                      w-3 h-3 rounded-full
                      ${match.user1FeedbackSubmitted ? 'bg-green-400' : 'bg-gray-400'}
                    `}></div>
                    <div className={`
                      w-3 h-3 rounded-full
                      ${match.user2FeedbackSubmitted ? 'bg-green-400' : 'bg-gray-400'}
                    `}></div>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className={`text-sm font-medium ${match.user1FeedbackSubmitted ? 'text-green-300' : 'text-white'}`}>
                    {match.user1Name}
                  </p>
                  <p className={`text-sm font-medium ${match.user2FeedbackSubmitted ? 'text-green-300' : 'text-white'}`}>
                    {match.user2Name}
                  </p>
                </div>
                <p className="text-xs text-white/60 mt-2">
                  {match.user1FeedbackSubmitted && match.user2FeedbackSubmitted ? 
                    'Feedback complete' : 
                    'Awaiting feedback'}
                </p>
              </div>
            ))}
          </div>
          
          {/* Note: Round ending is controlled by admin via "End Round" button in main controls */}
        </div>
      )}

      {/* Attending Users Modal */}
      {showAttendingModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAttendingModal(false);
            }
          }}
        >
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Users Marked as Attending</h3>
              <button
                onClick={() => setShowAttendingModal(false)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {attendingUsers.length > 0 ? (
                attendingUsers.map((user) => (
                  <div key={user.id} className="bg-white/5 rounded-lg p-3">
                    <p className="text-white font-medium">{user.name}</p>
                    <p className="text-white/60 text-sm">{user.email}</p>
                    <p className="text-white/40 text-xs">
                      {user.isOnboarded ? 'Onboarded' : 'Not onboarded'}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-white/60 text-center py-4">No users marked as attending</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Present Users Modal */}
      {showPresentModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPresentModal(false);
            }
          }}
        >
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Users Actually Present</h3>
              <button
                onClick={() => setShowPresentModal(false)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {presentUsers.length > 0 ? (
                presentUsers.map((user) => (
                  <div key={user.id} className="bg-white/5 rounded-lg p-3">
                    <p className="text-white font-medium">{user.name}</p>
                    <p className="text-white/60 text-sm">{user.email}</p>
                    <p className="text-white/40 text-xs">Connected via WebSocket</p>
                  </div>
                ))
              ) : (
                <p className="text-white/60 text-center py-4">No users currently connected</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clear Connections Confirmation Dialog */}
      {showClearDialog && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowClearDialog(false);
            }
          }}
        >
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 border border-red-400/30">
            <div className="flex items-center space-x-3 mb-4">
              <WifiOff className="h-6 w-6 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Disconnect All Users</h3>
            </div>
            <p className="text-white/80 mb-6">
              This will immediately disconnect all users from the WebSocket connection. 
              They will receive a notification and need to refresh their page to reconnect.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowClearDialog(false)}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition-all duration-200 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleClearConnections}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition-all duration-200 text-sm"
              >
                Disconnect All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Session Confirmation Dialog */}
      {showResetDialog && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowResetDialog(false);
            }
          }}
        >
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 border border-red-400/30">
            <div className="flex items-center space-x-3 mb-4">
              <RotateCcw className="h-6 w-6 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Reset Session</h3>
            </div>
            <p className="text-white/80 mb-6">
              This will permanently reset the entire Velvet Hour session, clearing all matches, rounds, and feedback. 
              All participants will be moved back to the joining page and notified of the reset. This action cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowResetDialog(false)}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition-all duration-200 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleResetSession}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition-all duration-200 text-sm"
              >
                Reset Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};