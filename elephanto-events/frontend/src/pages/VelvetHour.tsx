import React, { useState, useEffect } from 'react';
import { VelvetHourWaiting } from '@/components/VelvetHour/VelvetHourWaiting';
import { VelvetHourMatch } from '@/components/VelvetHour/VelvetHourMatch';
import { VelvetHourRound } from '@/components/VelvetHour/VelvetHourRound';
import { VelvetHourFeedback } from '@/components/VelvetHour/VelvetHourFeedback';
import { VelvetHourComplete } from '@/components/VelvetHour/VelvetHourComplete';
import { useToast } from '@/components/Toast';
import { velvetHourApi } from '@/services/velvetHourApi';
import { VelvetHourStatusResponse } from '@/types/velvet-hour';

type GameState = 'loading' | 'not_active' | 'waiting' | 'matched' | 'in_round' | 'feedback' | 'break' | 'completed';

export const VelvetHour: React.FC = () => {
  const { showToast } = useToast();
  const [gameState, setGameState] = useState<GameState>('loading');
  const [status, setStatus] = useState<VelvetHourStatusResponse | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [totalRounds, _setTotalRounds] = useState<number>(4);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 3000); // Check status every 3 seconds
    return () => clearInterval(interval);
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

  const checkStatus = async () => {
    try {
      const response = await velvetHourApi.getStatus();
      const statusData = response.data;
      setStatus(statusData);

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
    } catch (error) {
      console.error('Failed to join session:', error);
      showToast('Failed to join Velvet Hour session', 'error');
    }
  };

  const handleConfirmMatch = async (matchId: string) => {
    try {
      await velvetHourApi.confirmMatch(matchId);
      showToast('Match confirmed! Waiting for partner...', 'success');
      checkStatus();
    } catch (error) {
      console.error('Failed to confirm match:', error);
      showToast('Failed to confirm match', 'error');
    }
  };

  const handleSubmitFeedback = async (matchId: string, wantToConnect: boolean, reason: string) => {
    try {
      await velvetHourApi.submitFeedback({
        matchId,
        wantToConnect,
        feedbackReason: reason
      });
      
      showToast('Feedback submitted!', 'success');
      
      // Check if this was the last round
      if (currentRound >= totalRounds) {
        setGameState('completed');
      } else {
        setGameState('break');
        setTimeLeft(300); // 5 minute break default
      }
      
      setTimeout(() => checkStatus(), 2000);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      showToast('Failed to submit feedback', 'error');
    }
  };

  if (gameState === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (gameState === 'not_active') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 flex items-center justify-center px-4">
        <div className="text-center text-white">
          <div className="text-6xl mb-6">⏰</div>
          <h1 className="text-2xl font-bold mb-4">Velvet Hour Not Started</h1>
          <p className="text-lg text-white/80 mb-6">
            The Velvet Hour hasn't started yet or you're not attending this event.
          </p>
          <p className="text-sm text-white/60">
            Check back later or contact the event organizers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800">
      {gameState === 'waiting' && (
        <VelvetHourWaiting 
          onJoin={handleJoin}
          participantCount={0} // We'll add this to status response
          hasJoined={!!status?.participant}
        />
      )}
      
      {gameState === 'matched' && status?.currentMatch && (
        <VelvetHourMatch
          match={status.currentMatch}
          onConfirmMatch={handleConfirmMatch}
          currentUserId={status.participant?.userId || ''}
        />
      )}
      
      {gameState === 'in_round' && status?.currentMatch && (
        <VelvetHourRound
          match={status.currentMatch}
          timeLeft={timeLeft}
          currentRound={currentRound}
          totalRounds={totalRounds}
          currentUserId={status.participant?.userId || ''}
        />
      )}
      
      {gameState === 'feedback' && status?.currentMatch && (
        <VelvetHourFeedback
          match={status.currentMatch}
          onSubmitFeedback={handleSubmitFeedback}
          currentUserId={status.participant?.userId || ''}
        />
      )}
      
      {gameState === 'break' && (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center text-white">
            <div className="text-6xl mb-6">☕</div>
            <h1 className="text-3xl font-bold mb-4">Take a Break!</h1>
            <p className="text-xl mb-6">
              Round {currentRound} of {totalRounds} complete
            </p>
            <p className="text-lg text-white/80 mb-4">
              Next round starts in:
            </p>
            <div className="text-4xl font-mono font-bold">
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          </div>
        </div>
      )}
      
      {gameState === 'completed' && (
        <VelvetHourComplete />
      )}
    </div>
  );
};