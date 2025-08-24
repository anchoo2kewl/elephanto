import React, { useState, useEffect } from 'react';
import { VelvetHourWaiting } from '@/components/VelvetHour/VelvetHourWaiting';
import { VelvetHourRound } from '@/components/VelvetHour/VelvetHourRound';
import { VelvetHourFeedback } from '@/components/VelvetHour/VelvetHourFeedback';
import { VelvetHourComplete } from '@/components/VelvetHour/VelvetHourComplete';
import { VelvetHourTimeline } from '@/components/VelvetHour/VelvetHourTimeline';
import { VelvetHourTimer } from '@/components/VelvetHour/VelvetHourTimer';
import { useToast } from '@/components/Toast';
import { velvetHourApi } from '@/services/velvetHourApi';
import { useWebSocket, MESSAGE_TYPES } from '@/services/websocket';
import { VelvetHourStatusResponse } from '@/types/velvet-hour';
import { WifiOff } from 'lucide-react';

type GameState = 'loading' | 'not_active' | 'waiting' | 'matched' | 'in_round' | 'feedback' | 'break' | 'completed';

export const VelvetHour: React.FC = () => {
  const { showToast } = useToast();
  const [gameState, setGameState] = useState<GameState>('loading');
  const [status, setStatus] = useState<VelvetHourStatusResponse | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [totalRounds, setTotalRounds] = useState<number>(4);
  const [roundDuration, setRoundDuration] = useState<number>(10);
  const [eventId, setEventId] = useState<string | null>(null);
  const [disconnectMessage, setDisconnectMessage] = useState<string | null>(null);
  
  // Add rate limiting to prevent infinite loops
  const [lastStatusCheck, setLastStatusCheck] = useState<number>(0);

  // WebSocket connection for real-time updates (only connect when we have eventId)
  const { isConnected, subscribe, websocketService } = useWebSocket(eventId || undefined);

  // Set up disconnect notification handler
  useEffect(() => {
    if (websocketService) {
      websocketService.setDisconnectCallback((message: string) => {
        setDisconnectMessage(message);
        showToast('You have been disconnected by an administrator', 'error');
      });
    }
  }, [websocketService, showToast]);

  // Initial status check (only once)
  useEffect(() => {
    checkStatus();
  }, []);
  
  // Periodic sync during active rounds (separate effect to avoid infinite loop)
  useEffect(() => {
    if (gameState === 'in_round' || gameState === 'break') {
      console.log('🔄 VelvetHour: Setting up periodic sync to prevent timer drift');
      const syncInterval = setInterval(() => {
        console.log('🔄 VelvetHour: Periodic sync to prevent timer drift');
        checkStatus();
      }, 30000); // Sync every 30 seconds during active states
      
      return () => {
        console.log('🔄 VelvetHour: Clearing periodic sync interval');
        clearInterval(syncInterval);
      };
    }
  }, [gameState]);

  useEffect(() => {
    if (timeLeft > 0) {
      console.log('⏱️ VelvetHour: Timer effect - timeLeft:', timeLeft, 'gameState:', gameState);
      const timer = setTimeout(() => {
        const newTimeLeft = timeLeft - 1;
        console.log('⏱️ VelvetHour: Timer countdown - setting timeLeft to:', newTimeLeft);
        setTimeLeft(newTimeLeft);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && gameState === 'in_round' && status?.currentMatch) {
      console.log('🏁 VelvetHour: Round ended (timeLeft=0), moving to feedback');
      // Round ended, move to feedback
      setGameState('feedback');
    } else if (timeLeft === 0 && gameState === 'break') {
      console.log('🔄 VelvetHour: Break ended (timeLeft=0), checking status for next round');
      // Break ended, check for next round
      checkStatus();
    } else if (timeLeft === 0) {
      console.log('⚠️ VelvetHour: Timer at 0 but gameState is:', gameState, 'hasMatch:', !!status?.currentMatch);
    }
  }, [timeLeft, gameState, status?.currentMatch]);

  // WebSocket event listeners for real-time updates
  useEffect(() => {
    if (!isConnected || !eventId) return;

    console.log('Setting up WebSocket listeners for Velvet Hour');

    const unsubscribeSessionStarted = subscribe(MESSAGE_TYPES.VELVET_HOUR_SESSION_STARTED, (data) => {
      console.log('Velvet Hour session started:', data);
      checkStatus(); // Refresh status when session starts
    });

    const unsubscribeRoundStarted = subscribe(MESSAGE_TYPES.VELVET_HOUR_ROUND_STARTED, (data) => {
      console.log('Velvet Hour round started:', data);
      checkStatus(); // Refresh status for new round
    });

    const unsubscribeMatchConfirmed = subscribe(MESSAGE_TYPES.VELVET_HOUR_MATCH_CONFIRMED, (data) => {
      console.log('Match confirmed:', data);
      checkStatus(); // Refresh to show round timer
    });

    const unsubscribeFeedbackSubmitted = subscribe(MESSAGE_TYPES.VELVET_HOUR_FEEDBACK_SUBMITTED, (data) => {
      console.log('Feedback submitted:', data);
      // Could show toast notification about partner feedback
    });

    const unsubscribeSessionEnded = subscribe(MESSAGE_TYPES.VELVET_HOUR_SESSION_ENDED, (data) => {
      console.log('Velvet Hour session ended:', data);
      checkStatus(); // Refresh to show completed state
    });

    const unsubscribeSessionReset = subscribe(MESSAGE_TYPES.VELVET_HOUR_SESSION_RESET, (data) => {
      console.log('Velvet Hour session reset by admin:', data);
      // Show admin reset notification
      showToast(data.message || 'The Velvet Hour session has been reset by an admin. Please refresh and rejoin.', 'error');
      // Reset to initial state and force status check
      setGameState('loading');
      setStatus(null);
      setTimeout(() => {
        checkStatus(); // Refresh after short delay to show reset state
      }, 1000);
    });

    const unsubscribeParticipantJoined = subscribe(MESSAGE_TYPES.VELVET_HOUR_PARTICIPANT_JOINED, (data) => {
      console.log('New participant joined:', data);
      // Show notification that someone joined
      if (data.userName) {
        showToast(`${data.userName} joined the Velvet Hour!`, 'info');
      }
    });

    const unsubscribeStatusUpdate = subscribe(MESSAGE_TYPES.VELVET_HOUR_STATUS_UPDATE, (data) => {
      console.log('Velvet Hour status update:', data);
      checkStatus(); // Refresh status on any general update
    });

    // Cleanup subscriptions
    return () => {
      unsubscribeSessionStarted();
      unsubscribeRoundStarted();
      unsubscribeMatchConfirmed();
      unsubscribeFeedbackSubmitted();
      unsubscribeSessionEnded();
      unsubscribeSessionReset();
      unsubscribeParticipantJoined();
      unsubscribeStatusUpdate();
    };
  }, [isConnected, eventId, subscribe, showToast]);

  const checkStatus = async () => {
    // Rate limiting: prevent calls more frequent than every 2 seconds
    const now = Date.now();
    if (now - lastStatusCheck < 2000) {
      console.log('⏸️ VelvetHour: Skipping status check due to rate limiting');
      return;
    }
    setLastStatusCheck(now);
    
    try {
      console.log('🔍 VelvetHour: Checking status...');
      const response = await velvetHourApi.getStatus();
      const statusData = response.data;
      console.log('📊 VelvetHour: Status response:', {
        isActive: statusData.isActive,
        sessionStatus: statusData.session?.status,
        currentRound: statusData.session?.currentRound,
        timeLeft: statusData.timeLeft,
        hasMatch: !!statusData.currentMatch,
        hasParticipant: !!statusData.participant
      });
      setStatus(statusData);

      // Extract eventId from session for WebSocket connection
      if (statusData.session?.eventId && eventId !== statusData.session.eventId) {
        console.log('🔗 VelvetHour: Setting eventId for WebSocket:', statusData.session.eventId);
        setEventId(statusData.session.eventId);
      }

      // Update configuration if available
      if (statusData.config) {
        console.log('⚙️ VelvetHour: Updating config:', statusData.config);
        setTotalRounds(statusData.config.totalRounds);
        setRoundDuration(statusData.config.roundDuration);
      }

      if (!statusData.isActive) {
        console.log('❌ VelvetHour: Not active, setting not_active state');
        setGameState('not_active');
        return;
      }

      if (statusData.session) {
        console.log('🎮 VelvetHour: Session found, processing status');
        setCurrentRound(statusData.session.currentRound || 1);
        
        // Always update time left if provided to prevent drift
        if (statusData.timeLeft !== undefined && statusData.timeLeft !== null) {
          console.log('⏱️ VelvetHour: Setting timeLeft to:', statusData.timeLeft);
          setTimeLeft(statusData.timeLeft);
        } else {
          console.log('⚠️ VelvetHour: No timeLeft provided in status');
        }

        // Determine game state based on session status
        if (statusData.session.status === 'completed') {
          console.log('✅ VelvetHour: Session completed');
          setGameState('completed');
        } else if (statusData.session.status === 'break') {
          console.log('☕ VelvetHour: Session in break');
          setGameState('break');
          if (statusData.timeLeft) {
            setTimeLeft(statusData.timeLeft);
          }
        } else if (statusData.session.status === 'in_round') {
          console.log('🔄 VelvetHour: Session in round');
          // Set timeLeft for all in_round scenarios
          if (statusData.timeLeft) {
            console.log('⏱️ VelvetHour: In round - setting timeLeft to:', statusData.timeLeft);
            setTimeLeft(statusData.timeLeft);
          } else {
            console.log('⚠️ VelvetHour: In round but no timeLeft provided!');
          }
          
          if (statusData.currentMatch) {
            console.log('👥 VelvetHour: User has match, setting in_round state');
            // Users are automatically matched - no confirmation needed
            setGameState('in_round');
          } else {
            console.log('👤 VelvetHour: User in round but no match, setting waiting state');
            // User is in round but no match (unmatched participant)
            setGameState('waiting');
          }
        } else {
          console.log('⏳ VelvetHour: Session waiting for round to start');
          // waiting for round to start
          setGameState(statusData.participant ? 'waiting' : 'waiting');
        }
      } else {
        console.log('❌ VelvetHour: No session found, setting not_active');
        setGameState('not_active');
      }
    } catch (error) {
      console.error('❌ VelvetHour: Failed to get Velvet Hour status:', error);
      setGameState('not_active');
    }
  };

  const handleJoin = async () => {
    try {
      await velvetHourApi.joinSession();
      showToast('Successfully joined Velvet Hour!', 'success');
      checkStatus();
    } catch (error: any) {
      console.error('Failed to join session:', error);
      // Check if it's a "session not ready" type error
      const errorMessage = error?.response?.data?.error || error?.message || '';
      if (errorMessage.includes('not ready') || errorMessage.includes('not started') || errorMessage.includes('not enough')) {
        showToast('Please wait, we\'re not ready yet! The organizer will start rounds soon.', 'info');
      } else {
        showToast('Unable to join right now. Please try again in a moment.', 'error');
      }
    }
  };


  const handleSubmitFeedback = async (matchId: string, wantToConnect: boolean, feedbackReason: string) => {
    try {
      await velvetHourApi.submitFeedback({
        matchId,
        wantToConnect,
        feedbackReason
      });
      showToast('Feedback submitted! Thank you.', 'success');
      // After feedback submission, transition to waiting state
      setGameState('waiting');
      // Also check status to get updated server state
      checkStatus();
    } catch (error: any) {
      console.error('Failed to submit feedback:', error);
      // Check if it's a duplicate submission error
      if (error.response?.status === 409 || error.message?.includes('already submitted')) {
        showToast('You have already submitted feedback for this match.', 'info');
        setGameState('waiting');
      } else {
        showToast('Failed to submit feedback. Please try again.', 'error');
      }
    }
  };


  // Wrapper component to add disconnect banner to all content
  const WithDisconnectBanner: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="relative">
      {disconnectMessage && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-4 text-center z-50 shadow-lg">
          <div className="flex items-center justify-center space-x-3">
            <WifiOff className="h-5 w-5" />
            <span className="font-semibold">{disconnectMessage}</span>
            <button 
              onClick={() => window.location.reload()} 
              className="ml-4 px-3 py-1 bg-white text-red-600 rounded font-semibold hover:bg-gray-100"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )}
      <div className={disconnectMessage ? 'pt-20' : ''}>
        {children}
      </div>
    </div>
  );

  if (gameState === 'loading') {
    return (
      <WithDisconnectBanner>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <div className="text-white text-xl">Loading Velvet Hour...</div>
        </div>
      </WithDisconnectBanner>
    );
  }

  if (gameState === 'not_active') {
    return (
      <WithDisconnectBanner>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-4">Velvet Hour</h1>
            <p className="text-xl mb-8">No active session found</p>
            <p className="text-gray-300">Check back later or contact the event organizer.</p>
          </div>
        </div>
      </WithDisconnectBanner>
    );
  }

  if (gameState === 'waiting' && !status?.participant) {
    return (
      <WithDisconnectBanner>
        <VelvetHourWaiting
          onJoin={handleJoin}
          participantCount={0}
          hasJoined={false}
          isConnected={isConnected}
          config={status?.config}
        />
      </WithDisconnectBanner>
    );
  }

  if (gameState === 'waiting') {
    const isInActiveRound = status?.session?.status === 'in_round';
    
    return (
      <WithDisconnectBanner>
        <VelvetHourWaiting
          onJoin={() => {}} // No-op since already joined
          hasJoined={true}
          participantCount={0} // This could be enhanced with participant count from status
          isConnected={isConnected}
          config={status?.config}
          isInActiveRound={isInActiveRound}
          currentRound={status?.session?.currentRound}
          timeLeft={isInActiveRound ? timeLeft : undefined}
        />
      </WithDisconnectBanner>
    );
  }

  // Note: 'matched' state removed - users go directly to 'in_round'

  if (gameState === 'in_round' && status?.currentMatch) {
    return (
      <WithDisconnectBanner>
        <VelvetHourRound
          match={status.currentMatch}
          timeLeft={timeLeft}
          currentRound={currentRound}
          totalRounds={totalRounds}
          currentUserId={status?.participant?.userId || ''}
          roundDuration={roundDuration}
        />
      </WithDisconnectBanner>
    );
  }

  if (gameState === 'feedback' && status?.currentMatch) {
    return (
      <WithDisconnectBanner>
        <VelvetHourFeedback
          match={status.currentMatch}
          onSubmitFeedback={(matchId: string, wantToConnect: boolean, reason: string) => 
            handleSubmitFeedback(matchId, wantToConnect, reason)
          }
          currentUserId={status?.participant?.userId || ''}
        />
      </WithDisconnectBanner>
    );
  }

  if (gameState === 'break') {
    // Calculate total break time in seconds
    const totalBreakTime = (status?.config?.breakDuration || 5) * 60;
    
    return (
      <WithDisconnectBanner>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
          <div className="text-center text-white max-w-lg mx-auto">
            {/* Timeline showing progress through rounds */}
            <VelvetHourTimeline 
              currentRound={currentRound} 
              totalRounds={totalRounds}
              showOnlyDuringRounds={false}
            />

            {/* Timer with integrated progress ring */}
            <VelvetHourTimer 
              timeLeft={timeLeft}
              totalTime={totalBreakTime}
              title="BREAK TIME"
              subtitle="NEXT ROUND STARTS"
            />

            {/* Break info and status */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-4">Round Complete!</h1>
              <p className="text-xl mb-6">Take a break, stretch, grab a drink!</p>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h2 className="text-lg font-semibold mb-3">What to do during break:</h2>
                <div className="space-y-2 text-sm text-white/90 text-left">
                  <p>• Reflect on your previous conversation</p>
                  <p>• Grab a refreshment or visit the restroom</p>
                  <p>• Meet other attendees in the lounge area</p>
                  <p>• Prepare for your next match</p>
                  <p>• Stay connected for the next round notification</p>
                </div>
              </div>
            </div>

            {/* Connection status */}
            <div className="bg-blue-500/20 border-2 border-blue-400/50 rounded-xl p-4">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-sm font-medium">{isConnected ? 'Connected' : 'Connecting...'}</span>
              </div>
              <p className="font-medium">
                💫 Stay connected for the next round!
              </p>
              <p className="text-xs text-white/70 mt-1">
                You'll be automatically matched when the break ends
              </p>
            </div>
          </div>
        </div>
      </WithDisconnectBanner>
    );
  }

  if (gameState === 'completed') {
    return (
      <WithDisconnectBanner>
        <VelvetHourComplete />
      </WithDisconnectBanner>
    );
  }

  // Fallback
  return (
    <WithDisconnectBanner>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Something went wrong. Please refresh the page.</div>
      </div>
    </WithDisconnectBanner>
  );
};