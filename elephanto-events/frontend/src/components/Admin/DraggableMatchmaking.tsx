import React, { useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import { DraggableMatchmakingProps, ManualMatch, MATCH_COLORS } from '@/types/velvet-hour';
import { velvetHourApi } from '@/services/velvetHourApi';
import { useWebSocket, MESSAGE_TYPES } from '@/services/websocket';
import { X, RotateCcw, Users, Sparkles, Info } from 'lucide-react';

interface DraggableUser {
  id: string;
  name: string;
  position: { x: number; y: number };
  isMatched: boolean;
  matchId?: string;
}

interface MatchZone {
  id: string;
  number: number;
  color: string;
  users: DraggableUser[];
  position: { x: number; y: number };
}

// Helper function to get room color styling
const getRoomColorStyle = (color: string) => {
  const colorMap: { [key: string]: string } = {
    'red': 'bg-red-500',
    'blue': 'bg-blue-500',
    'green': 'bg-green-500',
    'purple': 'bg-purple-500',
    'orange': 'bg-orange-500',
    'yellow': 'bg-yellow-500',
    'pink': 'bg-pink-500',
    'cyan': 'bg-cyan-500',
    'indigo': 'bg-indigo-500',
    'teal': 'bg-teal-500',
    'lime': 'bg-lime-500',
    'rose': 'bg-rose-500',
    'amber': 'bg-amber-500',
    'emerald': 'bg-emerald-500',
    'violet': 'bg-violet-500',
    'sky': 'bg-sky-500',
    'slate': 'bg-slate-500',
    'gray': 'bg-gray-500',
    'zinc': 'bg-zinc-500',
    'neutral': 'bg-neutral-500',
    'stone': 'bg-stone-500',
    // Handle color variations
    'red-dark': 'bg-red-700',
    'blue-dark': 'bg-blue-700',
    'green-dark': 'bg-green-700',
    'purple-dark': 'bg-purple-700',
    'red-light': 'bg-red-300',
    'blue-light': 'bg-blue-300',
    'green-light': 'bg-green-300',
    'purple-light': 'bg-purple-300',
    'red-bright': 'bg-red-600',
    'blue-bright': 'bg-blue-600',
    'green-bright': 'bg-green-600',
    'purple-bright': 'bg-purple-600',
    'red-deep': 'bg-red-800',
    'blue-deep': 'bg-blue-800',
    'green-deep': 'bg-green-800',
    'purple-deep': 'bg-purple-800',
    'red-pale': 'bg-red-200',
    'blue-pale': 'bg-blue-200',
    'green-pale': 'bg-green-200',
    'purple-pale': 'bg-purple-200'
  };
  return colorMap[color] || 'bg-gray-500';
};

// Helper function to get border color for match zones based on room color
const getRoomBorderStyle = (color: string, userCount: number) => {
  let borderColor = 'border-white/40';
  
  if (userCount === 2) {
    borderColor = 'border-green-400';
  } else if (userCount === 1) {
    borderColor = 'border-yellow-400';
  } else {
    // Use room color for empty zones
    const colorToBorder: { [key: string]: string } = {
      'red': 'border-red-400',
      'blue': 'border-blue-400',
      'green': 'border-green-400',
      'purple': 'border-purple-400',
      'orange': 'border-orange-400',
      'yellow': 'border-yellow-400',
      'pink': 'border-pink-400',
      'cyan': 'border-cyan-400'
    };
    
    const baseColor = color.split('-')[0];
    borderColor = colorToBorder[baseColor] || 'border-white/40';
  }
  
  return borderColor;
};

// Helper function to get background style for match zones
const getRoomBackgroundStyle = (color: string, userCount: number) => {
  if (userCount === 2) {
    return 'bg-green-400/10';
  } else if (userCount === 1) {
    return 'bg-yellow-400/10';
  } else {
    // Use room color with low opacity for empty zones
    const colorToBackground: { [key: string]: string } = {
      'red': 'bg-red-400/5',
      'blue': 'bg-blue-400/5',
      'green': 'bg-green-400/5',
      'purple': 'bg-purple-400/5',
      'orange': 'bg-orange-400/5',
      'yellow': 'bg-yellow-400/5',
      'pink': 'bg-pink-400/5',
      'cyan': 'bg-cyan-400/5'
    };
    
    const baseColor = color.split('-')[0];
    return colorToBackground[baseColor] || 'bg-white/5';
  }
};

// Helper function to format room name
const formatRoomName = (color: string) => {
  return color.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') + ' Room';
};

export const DraggableMatchmaking: React.FC<DraggableMatchmakingProps> = ({
  participants,
  onMatchesChange,
  onMatchStatsChange,
  maxMatches,
  eventId,
  previousMatches = []
}) => {
  const [users, setUsers] = useState<DraggableUser[]>([]);
  const [matchZones, setMatchZones] = useState<MatchZone[]>([]);
  const [_draggedUser, _setDraggedUser] = useState<string | null>(null);
  const [instructionsVisible, setInstructionsVisible] = useState(true);
  const [instructionsCollapsed, setInstructionsCollapsed] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DraggableUser | null>(null);
  const [userPreferences, setUserPreferences] = useState<any>(null);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  
  const { sendMessage, subscribe } = useWebSocket(eventId);

  // Auto-hide instructions after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setInstructionsVisible(false);
      setTimeout(() => setInstructionsCollapsed(true), 300); // Allow fade animation
    }, 10000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Initialize users and match zones
  useEffect(() => {
    // Initialize users in a circle on the left
    const initialUsers: DraggableUser[] = participants.map((participant, index) => {
      const angle = (index / participants.length) * 2 * Math.PI;
      const radius = 120;
      return {
        id: participant.userId,
        name: participant.userName,
        position: {
          x: 200 + radius * Math.cos(angle),
          y: 200 + radius * Math.sin(angle)
        },
        isMatched: false
      };
    });

    // Initialize match zones on the right
    const initialZones: MatchZone[] = Array.from({ length: maxMatches }, (_, index) => ({
      id: `zone-${index + 1}`,
      number: index + 1,
      color: MATCH_COLORS[index % MATCH_COLORS.length],
      users: [],
      position: { x: 600 + (index % 3) * 200, y: 100 + Math.floor(index / 3) * 150 }
    }));

    setUsers(initialUsers);
    setMatchZones(initialZones);
  }, [participants, maxMatches]);
  
  // WebSocket event listeners for real-time sync
  useEffect(() => {
    if (!eventId) return;
    
    const unsubscribeDragUpdate = subscribe(MESSAGE_TYPES.VELVET_HOUR_ADMIN_DRAG_UPDATE, (data) => {
      console.log('Drag update received:', data);
      // Update user positions from other admins
      setUsers(prev => prev.map(user => 
        user.id === data.userId 
          ? { ...user, position: data.position }
          : user
      ));
    });
    
    const unsubscribeMatchUpdate = subscribe(MESSAGE_TYPES.VELVET_HOUR_ADMIN_MATCH_UPDATE, (data) => {
      console.log('Match update received:', data);
      // Sync match zones from other admins
      setMatchZones(prev => prev.map(zone =>
        zone.id === data.zoneId
          ? { ...zone, users: data.users }
          : zone
      ));
    });
    
    const unsubscribeAIMatches = subscribe(MESSAGE_TYPES.VELVET_HOUR_AI_MATCHES_GENERATED, (data) => {
      console.log('AI matches generated by another admin:', data);
      // Apply AI matches generated by other admin
      // This is already handled by the generateAIMatches function
    });
    
    return () => {
      unsubscribeDragUpdate();
      unsubscribeMatchUpdate();
      unsubscribeAIMatches();
    };
  }, [eventId, subscribe]);
  
  // Show user preferences
  const showUserPreferences = async (user: DraggableUser) => {
    try {
      setSelectedUser(user);
      const response = await velvetHourApi.getUserPreferences(eventId, user.id);
      setUserPreferences(response.data);
      setShowPreferencesModal(true);
    } catch (error) {
      console.error('Failed to fetch user preferences:', error);
    }
  };
  
  // Generate AI matches
  const generateAIMatches = async () => {
    try {
      const response = await velvetHourApi.generateAIMatches(eventId);
      const aiMatches = response.data;
      
      // Clear current matches first
      resetMatches();
      
      // Apply AI matches to randomly selected rooms from available 100 rooms
      setTimeout(() => {
        // Create array of available room indices and shuffle for random assignment
        const availableRooms = [...Array(Math.min(matchZones.length, 100))].map((_, i) => i);
        for (let i = availableRooms.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [availableRooms[i], availableRooms[j]] = [availableRooms[j], availableRooms[i]];
        }
        
        aiMatches.forEach((match: ManualMatch, index: number) => {
          if (index >= availableRooms.length) return; // Skip if no more rooms available
          
          const user1 = users.find(u => u.id === match.user1Id);
          const user2 = users.find(u => u.id === match.user2Id);
          const zoneIndex = availableRooms[index]; // Use shuffled room assignment
          const zone = matchZones[zoneIndex];
          
          if (user1 && user2 && zone) {
            // Add users to zone
            setMatchZones(prev => prev.map(z => 
              z.id === zone.id 
                ? { ...z, users: [user1, user2] }
                : z
            ));
            
            // Update user positions and status
            setUsers(prev => prev.map(user => {
              if (user.id === user1.id) {
                return {
                  ...user,
                  isMatched: true,
                  matchId: zone.id,
                  position: { x: zone.position.x + 10, y: zone.position.y + 40 }
                };
              } else if (user.id === user2.id) {
                return {
                  ...user,
                  isMatched: true,
                  matchId: zone.id,
                  position: { x: zone.position.x + 90, y: zone.position.y + 40 }
                };
              }
              return user;
            }));
          }
        });
      }, 100);
      
      // Send WebSocket update
      sendMessage(MESSAGE_TYPES.VELVET_HOUR_AI_MATCHES_GENERATED, { matches: aiMatches });
      
    } catch (error) {
      console.error('Failed to generate AI matches:', error);
    }
  };

  // Update matches when zones change - only count zones with exactly 2 users
  useEffect(() => {
    const completeMatches: ManualMatch[] = matchZones
      .filter(zone => zone.users.length === 2)
      .map(zone => ({
        user1Id: zone.users[0].id,
        user2Id: zone.users[1].id,
        matchNumber: zone.number,
        matchColor: zone.color
      }));

    onMatchesChange(completeMatches);

    // Validate against previous matches and calculate statistics
    if (onMatchStatsChange) {
      const incompleteMatches = matchZones.filter(zone => zone.users.length === 1).length;
      const completeMatchesCount = matchZones.filter(zone => zone.users.length === 2).length;
      
      // Check for duplicate pairings
      let duplicatePairings = 0;
      const validationErrors: string[] = [];
      
      completeMatches.forEach(currentMatch => {
        const isDuplicate = previousMatches.some(prevMatch => {
          return (
            (prevMatch.user1Id === currentMatch.user1Id && prevMatch.user2Id === currentMatch.user2Id) ||
            (prevMatch.user1Id === currentMatch.user2Id && prevMatch.user2Id === currentMatch.user1Id)
          );
        });
        
        if (isDuplicate) {
          duplicatePairings++;
          // Find user names for better error message
          const user1 = participants.find(p => p.userId === currentMatch.user1Id);
          const user2 = participants.find(p => p.userId === currentMatch.user2Id);
          if (user1 && user2) {
            validationErrors.push(`${user1.userName} and ${user2.userName} have already been matched in a previous round`);
          }
        }
      });
      
      onMatchStatsChange({ 
        incompleteMatches, 
        completeMatches: completeMatchesCount,
        duplicatePairings,
        validationErrors
      });
    }
  }, [matchZones, onMatchesChange, onMatchStatsChange, previousMatches, participants]);
  
  // Calculate match statistics for display (commented out to avoid TypeScript warnings)
  // const matchStats = {
  //   totalZonesWithPeople: matchZones.filter(zone => zone.users.length > 0).length,
  //   completeMatches: matchZones.filter(zone => zone.users.length === 2).length,
  //   incompleteMatches: matchZones.filter(zone => zone.users.length === 1).length,
  //   emptyZones: matchZones.filter(zone => zone.users.length === 0).length,
  //   unmatchedUsers: users.filter(user => !user.isMatched).length,
  //   allUsersMatched: users.filter(user => !user.isMatched).length === 0,
  //   allMatchesComplete: matchZones.filter(zone => zone.users.length === 1).length === 0 && users.filter(user => !user.isMatched).length === 0
  // };

  const handleUserDrag = (userId: string, data: any) => {
    const newPosition = { x: data.x, y: data.y };
    setUsers(prev => prev.map(user => 
      user.id === userId 
        ? { ...user, position: newPosition }
        : user
    ));
    
    // Send WebSocket update for real-time sync
    sendMessage(MESSAGE_TYPES.VELVET_HOUR_ADMIN_DRAG_UPDATE, {
      userId,
      position: newPosition
    });
  };

  const handleUserDrop = (userId: string, data: any) => {
    const dropX = data.x + 50; // Account for user element center
    const dropY = data.y + 25;

    // Check if dropped on a match zone
    const targetZone = matchZones.find(zone => {
      const zoneX = zone.position.x;
      const zoneY = zone.position.y;
      return dropX >= zoneX && dropX <= zoneX + 160 && 
             dropY >= zoneY && dropY <= zoneY + 120;
    });

    if (targetZone && targetZone.users.length < 2) {
      // Add user to zone
      const user = users.find(u => u.id === userId);
      if (user && !user.isMatched) {
        const updatedZone = { ...targetZone, users: [...targetZone.users, { ...user, matchId: targetZone.id }] };
        setMatchZones(prev => prev.map(zone => 
          zone.id === targetZone.id 
            ? updatedZone
            : zone
        ));
        
        // Send WebSocket update for real-time sync
        sendMessage(MESSAGE_TYPES.VELVET_HOUR_ADMIN_MATCH_UPDATE, {
          zoneId: targetZone.id,
          users: updatedZone.users
        });

        setUsers(prev => prev.map(user => 
          user.id === userId 
            ? { 
                ...user, 
                isMatched: true, 
                matchId: targetZone.id,
                position: { 
                  x: targetZone.position.x + (targetZone.users.length * 80) + 10, 
                  y: targetZone.position.y + 40 
                }
              }
            : user
        ));
      }
    }
  };

  const removeUserFromMatch = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user || !user.matchId) return;

    // Remove from match zone
    const updatedUsers = matchZones.find(z => z.id === user.matchId)?.users.filter(u => u.id !== userId) || [];
    setMatchZones(prev => prev.map(zone => 
      zone.id === user.matchId
        ? { ...zone, users: updatedUsers }
        : zone
    ));
    
    // Send WebSocket update for real-time sync
    sendMessage(MESSAGE_TYPES.VELVET_HOUR_ADMIN_MATCH_UPDATE, {
      zoneId: user.matchId,
      users: updatedUsers
    });

    // Reset user position and status
    const originalIndex = participants.findIndex(p => p.userId === userId);
    const angle = (originalIndex / participants.length) * 2 * Math.PI;
    const radius = 120;

    setUsers(prev => prev.map(u => 
      u.id === userId 
        ? { 
            ...u, 
            isMatched: false, 
            matchId: undefined,
            position: {
              x: 200 + radius * Math.cos(angle),
              y: 200 + radius * Math.sin(angle)
            }
          }
        : u
    ));
  };

  const resetMatches = () => {
    // Reset all match zones
    setMatchZones(prev => prev.map(zone => ({ ...zone, users: [] })));

    // Reset all users
    setUsers(prev => prev.map((user, index) => {
      const angle = (index / prev.length) * 2 * Math.PI;
      const radius = 120;
      return {
        ...user,
        isMatched: false,
        matchId: undefined,
        position: {
          x: 200 + radius * Math.cos(angle),
          y: 200 + radius * Math.sin(angle)
        }
      };
    }));
  };

  return (
    <div className="relative w-full h-96 bg-white/5 rounded-lg border border-white/20 overflow-hidden">
      {/* Instructions */}
      {/* Instructions - collapsible */}
      <div className="absolute top-4 left-4 z-20">
        {!instructionsCollapsed && (
          <div className={`bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white text-sm max-w-xs transition-opacity duration-300 ${
            instructionsVisible ? 'opacity-100' : 'opacity-0'
          }`}>
            <p className="font-medium mb-1">Instructions:</p>
            <p>Drag participants from the left into match zones on the right. Each zone holds exactly 2 people.</p>
          </div>
        )}
        
        {instructionsCollapsed && (
          <button
            onClick={() => {
              setInstructionsCollapsed(false);
              setInstructionsVisible(true);
              setTimeout(() => {
                setInstructionsVisible(false);
                setTimeout(() => setInstructionsCollapsed(true), 300);
              }, 10000);
            }}
            className="w-10 h-10 bg-blue-500/80 hover:bg-blue-500 rounded-full flex items-center justify-center text-white transition-colors duration-200"
            title="Show instructions"
          >
            <Info className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Control buttons */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <button
          onClick={generateAIMatches}
          className="flex items-center space-x-2 px-3 py-2 bg-green-500/80 hover:bg-green-500 rounded-lg text-white text-sm transition-colors duration-200"
        >
          <Sparkles className="h-4 w-4" />
          <span>AI Match</span>
        </button>
        
        <button
          onClick={resetMatches}
          className="flex items-center space-x-2 px-3 py-2 bg-red-500/80 hover:bg-red-500 rounded-lg text-white text-sm transition-colors duration-200"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Reset</span>
        </button>
      </div>

      {/* Participants section label */}
      <div className="absolute top-16 left-4 z-10">
        <div className="flex items-center space-x-2 text-white/70 text-sm">
          <Users className="h-4 w-4" />
          <span>Participants</span>
        </div>
      </div>

      {/* Match zones section label */}
      <div className="absolute top-16 right-4 z-10">
        <div className="flex items-center space-x-2 text-white/70 text-sm">
          <span>Match Zones</span>
        </div>
      </div>

      {/* Draggable users */}
      {users.map((user) => (
        <div key={user.id}>
          <Draggable
            position={user.position}
            onDrag={(_e, data) => handleUserDrag(user.id, data)}
            onStop={(_e, data) => handleUserDrop(user.id, data)}
            disabled={user.isMatched}
            cancel=".no-drag"
          >
            <div
              className={`
                absolute w-20 h-12 rounded-lg flex items-center justify-center text-xs font-medium text-white cursor-move
                ${user.isMatched 
                  ? 'bg-green-600/80 cursor-default' 
                  : 'bg-blue-600/80 hover:bg-blue-500/80 shadow-lg'
                }
                border border-white/30 transition-colors duration-200
              `}
              onClick={(e) => {
                e.stopPropagation();
                showUserPreferences(user);
              }}
            >
              <span className="truncate px-1">{user.name.split(' ')[0]}</span>
            </div>
          </Draggable>
          {user.isMatched && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeUserFromMatch(user.id);
              }}
              className="absolute w-4 h-4 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center text-white z-50 cursor-pointer"
              style={{ 
                left: user.position.x + 76,
                top: user.position.y - 4,
                pointerEvents: 'auto'
              }}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}

      {/* Match zones */}
      {matchZones.map((zone) => (
        <div
          key={zone.id}
          className={`
            absolute w-40 h-28 rounded-lg border-2 border-dashed
            ${getRoomBorderStyle(zone.color, zone.users.length)} ${getRoomBackgroundStyle(zone.color, zone.users.length)}
          `}
          style={{
            left: zone.position.x,
            top: zone.position.y,
          }}
        >
          {/* Zone header */}
          <div className={`
            absolute -top-6 left-0 flex items-center space-x-2 text-sm
          `}>
            <div className={`
              w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs
              ${getRoomColorStyle(zone.color)}
            `}>
              {zone.number}
            </div>
            <span className="text-white/70">{formatRoomName(zone.color)}</span>
          </div>

          {/* Zone content */}
          <div className="w-full h-full flex items-center justify-center">
            {zone.users.length === 0 && (
              <div className="text-white/40 text-xs text-center">
                Drop participants<br />here
              </div>
            )}
          </div>

          {/* Zone status */}
          <div className="absolute -bottom-6 left-0 text-xs text-white/60">
            {zone.users.length}/2 matched
          </div>
        </div>
      ))}

      {/* Guidelines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeOpacity="0.05" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <line x1="400" y1="0" x2="400" y2="100%" stroke="white" strokeOpacity="0.1" strokeWidth="2" strokeDasharray="5,5" />
      </svg>

      {/* User Preferences Modal */}
      {showPreferencesModal && selectedUser && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPreferencesModal(false);
            }
          }}
        >
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">User Preferences</h3>
              <button
                onClick={() => setShowPreferencesModal(false)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">{selectedUser.name}</h4>
                
                {userPreferences ? (
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-white/70">Primary Interest: </span>
                      <span className="text-white">{userPreferences.primaryInterest || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="text-white/70">Why Here: </span>
                      <span className="text-white">{userPreferences.whyHere || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="text-white/70">Professional Background: </span>
                      <span className="text-white">{userPreferences.professionalBackground || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="text-white/70">Interests: </span>
                      <span className="text-white">{userPreferences.interests?.join(', ') || 'Not specified'}</span>
                    </div>
                    {userPreferences.lookingFor && (
                      <div>
                        <span className="text-white/70">Looking For: </span>
                        <span className="text-white">{userPreferences.lookingFor}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-white/60 text-center py-4">
                    Loading preferences...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};