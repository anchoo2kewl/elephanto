import React, { useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import { DraggableMatchmakingProps, ManualMatch, MATCH_COLORS } from '@/types/velvet-hour';
import { X, RotateCcw, Users } from 'lucide-react';

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

export const DraggableMatchmaking: React.FC<DraggableMatchmakingProps> = ({
  participants,
  onMatchesChange,
  maxMatches
}) => {
  const [users, setUsers] = useState<DraggableUser[]>([]);
  const [matchZones, setMatchZones] = useState<MatchZone[]>([]);
  const [_draggedUser, _setDraggedUser] = useState<string | null>(null);

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

  // Update matches when zones change
  useEffect(() => {
    const matches: ManualMatch[] = matchZones
      .filter(zone => zone.users.length === 2)
      .map(zone => ({
        user1Id: zone.users[0].id,
        user2Id: zone.users[1].id,
        matchNumber: zone.number,
        matchColor: zone.color
      }));

    onMatchesChange(matches);
  }, [matchZones, onMatchesChange]);

  const handleUserDrag = (userId: string, data: any) => {
    setUsers(prev => prev.map(user => 
      user.id === userId 
        ? { ...user, position: { x: data.x, y: data.y } }
        : user
    ));
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
        setMatchZones(prev => prev.map(zone => 
          zone.id === targetZone.id 
            ? { ...zone, users: [...zone.users, { ...user, matchId: zone.id }] }
            : zone
        ));

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
    setMatchZones(prev => prev.map(zone => 
      zone.id === user.matchId
        ? { ...zone, users: zone.users.filter(u => u.id !== userId) }
        : zone
    ));

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
      <div className="absolute top-4 left-4 z-20">
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white text-sm max-w-xs">
          <p className="font-medium mb-1">Instructions:</p>
          <p>Drag participants from the left into match zones on the right. Each zone holds exactly 2 people.</p>
        </div>
      </div>

      {/* Reset button */}
      <div className="absolute top-4 right-4 z-20">
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
        <Draggable
          key={user.id}
          position={user.position}
          onDrag={(_e, data) => handleUserDrag(user.id, data)}
          onStop={(_e, data) => handleUserDrop(user.id, data)}
          disabled={user.isMatched}
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
          >
            <span className="truncate px-1">{user.name.split(' ')[0]}</span>
            {user.isMatched && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeUserFromMatch(user.id);
                }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center text-white"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </Draggable>
      ))}

      {/* Match zones */}
      {matchZones.map((zone) => (
        <div
          key={zone.id}
          className={`
            absolute w-40 h-28 rounded-lg border-2 border-dashed
            ${zone.users.length === 2 ? 'border-green-400 bg-green-400/10' : 
              zone.users.length === 1 ? 'border-yellow-400 bg-yellow-400/10' :
              'border-white/40 bg-white/5'
            }
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
              ${zone.color === 'red' ? 'bg-red-500' :
                zone.color === 'blue' ? 'bg-blue-500' :
                zone.color === 'green' ? 'bg-green-500' :
                zone.color === 'purple' ? 'bg-purple-500' :
                zone.color === 'orange' ? 'bg-orange-500' :
                zone.color === 'yellow' ? 'bg-yellow-500' :
                zone.color === 'pink' ? 'bg-pink-500' :
                'bg-cyan-500'
              }
            `}>
              {zone.number}
            </div>
            <span className="text-white/70 capitalize">{zone.color}</span>
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
    </div>
  );
};