import React, { useState, useEffect } from 'react';
import { AdminVelvetHourControlProps, ManualMatch } from '@/types/velvet-hour';
import { velvetHourApi } from '@/services/velvetHourApi';
import { DraggableMatchmaking } from './DraggableMatchmaking';
import { Play, Square, Settings, Users, Clock, Target, Calendar, RotateCcw } from 'lucide-react';

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
  const [showConfig, setShowConfig] = useState(false);
  const [showMatchmaking, setShowMatchmaking] = useState(false);
  const [manualMatches, setManualMatches] = useState<ManualMatch[]>([]);
  const [config, setConfig] = useState({
    roundDuration: 10,
    breakDuration: 5,
    totalRounds: 4,
    minParticipants: 4
  });
  const [attendanceStats, setAttendanceStats] = useState<{
    attendingCount: number;
    requiredCount: number;
    minParticipants: number;
    canStart: boolean;
    alreadyStarted: boolean;
  } | null>(null);

  // Fetch attendance stats
  useEffect(() => {
    const fetchAttendanceStats = async () => {
      try {
        const response = await velvetHourApi.getAttendanceStats(eventId);
        setAttendanceStats(response.data);
      } catch (error) {
        console.error('Failed to fetch attendance stats:', error);
      }
    };

    if (eventId) {
      fetchAttendanceStats();
    }
  }, [eventId, status.session?.status]); // Re-fetch when session status changes

  // Calculate max possible matches
  const maxMatches = Math.floor(status.participants.length / 2);

  const handleStartRound = () => {
    if (showMatchmaking && manualMatches.length > 0) {
      onStartRound(manualMatches);
    } else {
      onStartRound();
    }
    setShowMatchmaking(false);
    setManualMatches([]);
  };

  const handleUpdateConfig = () => {
    onUpdateConfig(config);
    setShowConfig(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Velvet Hour Control</h2>
          <div className="flex items-center space-x-4 text-white/70 mb-2">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">{eventTitle}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>{new Date(eventDate).toLocaleDateString()} at {eventTime}</span>
            </div>
          </div>
          <p className="text-white/60 text-sm">
            Manage the interactive matching experience for attendees
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {status.session && onResetSession && (
            <button
              onClick={onResetSession}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-200 rounded-lg border border-red-400/30 transition-all duration-200"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset Session</span>
            </button>
          )}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg border border-white/20 transition-all duration-200"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="bg-white/10 rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Velvet Hour Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
            <div>
              <label className="block text-sm text-white/70 mb-2">Minimum Participants</label>
              <input
                type="number"
                value={config.minParticipants}
                onChange={(e) => setConfig({ ...config, minParticipants: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white"
                min="2"
                max="20"
              />
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleUpdateConfig}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors duration-200"
            >
              Save Configuration
            </button>
            <button
              onClick={() => setShowConfig(false)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Session Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            {status.session?.currentRound || 0} / {config.totalRounds}
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
            {status.session?.roundEndsAt ? 
              `${Math.max(0, Math.floor((new Date(status.session.roundEndsAt).getTime() - Date.now()) / 60000))} min`
              : '--'
            }
          </p>
          <p className="text-sm text-white/70">
            Until round ends
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{attendanceStats.attendingCount}</p>
              <p className="text-sm text-white/70">Users Attending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{attendanceStats.requiredCount}</p>
              <p className="text-sm text-white/70">Required to Start</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{attendanceStats.minParticipants}</p>
              <p className="text-sm text-white/70">Min Participants</p>
            </div>
          </div>

          {!attendanceStats.canStart && (
            <div className="bg-yellow-600/20 border border-yellow-600/30 rounded-lg p-3 mb-4">
              <p className="text-yellow-200 text-sm">
                {attendanceStats.alreadyStarted 
                  ? "⚠️ Velvet Hour has already been run for this event. Use 'Reset Session' to run again."
                  : `⚠️ Need ${attendanceStats.requiredCount - attendanceStats.attendingCount} more attending users to start Velvet Hour.`
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex flex-wrap gap-4">
        {!status.session && (
          <div className="flex flex-col">
            <button
              onClick={onStartSession}
              disabled={!attendanceStats?.canStart}
              className={`
                flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold
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
                  : `Only ${attendanceStats.attendingCount} of ${attendanceStats.requiredCount} required users are attending`
                }
              </p>
            )}
          </div>
        )}

        {status.session && status.canStartRound && (
          <>
            <button
              onClick={handleStartRound}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors duration-200"
            >
              <Play className="h-4 w-4" />
              <span>Start Next Round</span>
            </button>
            
            <button
              onClick={() => setShowMatchmaking(!showMatchmaking)}
              className="flex items-center space-x-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-colors duration-200"
            >
              <Target className="h-4 w-4" />
              <span>Custom Matches</span>
            </button>
          </>
        )}

        {status.session && (
          <button
            onClick={onEndSession}
            className="flex items-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition-colors duration-200"
          >
            <Square className="h-4 w-4" />
            <span>End Session</span>
          </button>
        )}
      </div>

      {/* Manual Matchmaking */}
      {showMatchmaking && (
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">
            Custom Matchmaking - Round {(status.session?.currentRound || 0) + 1}
          </h3>
          <DraggableMatchmaking
            participants={status.participants}
            onMatchesChange={setManualMatches}
            maxMatches={maxMatches}
          />
          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-white/70">
              {manualMatches.length} of {maxMatches} possible matches created
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowMatchmaking(false);
                  setManualMatches([]);
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors duration-200"
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
            Current Matches - Round {status.session?.currentRound}
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
                      ${match.confirmedUser1 ? 'bg-green-400' : 'bg-gray-400'}
                    `}></div>
                    <div className={`
                      w-3 h-3 rounded-full
                      ${match.confirmedUser2 ? 'bg-green-400' : 'bg-gray-400'}
                    `}></div>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">{match.user1Name}</p>
                  <p className="text-sm font-medium text-white">{match.user2Name}</p>
                </div>
                <p className="text-xs text-white/60 mt-2">
                  {match.confirmedUser1 && match.confirmedUser2 ? 
                    'Both confirmed' : 
                    'Waiting for confirmation'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};