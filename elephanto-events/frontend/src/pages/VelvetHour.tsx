import React, { useState, useEffect } from 'react';
import { VelvetHourWaiting } from '@/components/VelvetHour/VelvetHourWaiting';
import { VelvetHourMatch } from '@/components/VelvetHour/VelvetHourMatch';
import { VelvetHourRound } from '@/components/VelvetHour/VelvetHourRound';
import { VelvetHourFeedback } from '@/components/VelvetHour/VelvetHourFeedback';
import { VelvetHourComplete } from '@/components/VelvetHour/VelvetHourComplete';
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

  // Initial status check (replaces polling)
  useEffect(() => {
    checkStatus();
    // No more polling - WebSocket will handle real-time updates
  }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && gameState === 'in_round') {
      // Round ended, move to feedback
      setGameState('feedback');
    } else if (timeLeft === 0 && gameState === 'break') {
      // Break ended, check for next round
      checkStatus();
    }
  }, [timeLeft, gameState]);

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
      unsubscribeParticipantJoined();
      unsubscribeStatusUpdate();
    };
  }, [isConnected, eventId, subscribe, showToast]);

  const checkStatus = async () => {
    try {
      const response = await velvetHourApi.getStatus();
      const statusData = response.data;
      setStatus(statusData);

      // Extract eventId from session for WebSocket connection
      if (statusData.session?.eventId && eventId !== statusData.session.eventId) {
        setEventId(statusData.session.eventId);
      }

      // Update configuration if available
      if (statusData.config) {
        setTotalRounds(statusData.config.totalRounds);
        setRoundDuration(statusData.config.roundDuration);
      }

      if (!statusData.isActive) {
        setGameState('not_active');
        return;
      }

      if (statusData.session) {
        setCurrentRound(statusData.session.currentRound || 1);
        
        // Update time left if provided
        if (statusData.timeLeft) {
          setTimeLeft(statusData.timeLeft);
        }

        // Determine game state based on session status
        if (statusData.session.status === 'completed') {
          setGameState('completed');
        } else if (statusData.session.status === 'break') {
          setGameState('break');
          if (statusData.timeLeft) {
            setTimeLeft(statusData.timeLeft);
          }
        } else if (statusData.session.status === 'in_round') {
          if (statusData.currentMatch) {
            const match = statusData.currentMatch;
            
            if (match.confirmedUser1 && match.confirmedUser2) {
              setGameState('in_round');
              if (statusData.timeLeft) {
                setTimeLeft(statusData.timeLeft);
              }
            } else {
              setGameState('matched');
            }
          } else {
            setGameState('waiting');
          }
        } else {
          // waiting for round to start
          setGameState(statusData.participant ? 'waiting' : 'waiting');
        }
      } else {
        setGameState('not_active');
      }
    } catch (error) {
      console.error('Failed to get Velvet Hour status:', error);
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

  const handleConfirmMatch = async (matchId: string) => {
    try {
      await velvetHourApi.confirmMatch(matchId);
      showToast('Match confirmed! Round will start soon.', 'success');
      checkStatus();
    } catch (error) {
      console.error('Failed to confirm match:', error);
      showToast('Failed to confirm match. Please try again.', 'error');
    }
  };

  const handleSubmitFeedback = async (matchId: string, wantToConnect: boolean, feedbackReason: string) => {
    try {
      await velvetHourApi.submitFeedback(matchId, wantToConnect, feedbackReason);
      showToast('Feedback submitted! Thank you.', 'success');
      checkStatus();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      showToast('Failed to submit feedback. Please try again.', 'error');
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
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
    return (
      <WithDisconnectBanner>
        <VelvetHourWaiting
          hasJoined={true}
          participantCount={0} // This could be enhanced with participant count from status
          isConnected={isConnected}
          config={status?.config}
        />
      </WithDisconnectBanner>
    );
  }

  if (gameState === 'matched' && status?.currentMatch) {
    return (
      <WithDisconnectBanner>
        <VelvetHourMatch
          match={status.currentMatch}
          onConfirm={() => handleConfirmMatch(status.currentMatch!.id)}
          isConnected={isConnected}
        />
      </WithDisconnectBanner>
    );
  }

  if (gameState === 'in_round' && status?.currentMatch) {
    return (
      <WithDisconnectBanner>
        <VelvetHourRound
          match={status.currentMatch}
          timeLeft={timeLeft}
          formatTime={formatTime}
          currentRound={currentRound}
          totalRounds={totalRounds}
          isConnected={isConnected}
        />
      </WithDisconnectBanner>
    );
  }

  if (gameState === 'feedback' && status?.currentMatch) {
    return (
      <WithDisconnectBanner>
        <VelvetHourFeedback
          match={status.currentMatch}
          onSubmit={(wantToConnect: boolean, reason: string) => 
            handleSubmitFeedback(status.currentMatch!.id, wantToConnect, reason)
          }
          isConnected={isConnected}
        />
      </WithDisconnectBanner>
    );
  }

  if (gameState === 'break') {
    return (
      <WithDisconnectBanner>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-4">Round Complete!</h1>
            <p className="text-xl mb-8">Break time - next round starts in:</p>
            <div className="text-6xl font-mono font-bold mb-8">
              {formatTime(timeLeft)}
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-sm">{isConnected ? 'Connected' : 'Connecting...'}</span>
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