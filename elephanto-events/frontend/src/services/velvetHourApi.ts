import api from './api';
import { 
  VelvetHourStatusResponse,
  SubmitFeedbackRequest,
  AdminVelvetHourStatusResponse,
  StartRoundRequest,
  UpdateVelvetHourConfigRequest
} from '@/types/velvet-hour';

export const velvetHourApi = {
  // User endpoints
  getStatus: () => 
    api.get<VelvetHourStatusResponse>('/velvet-hour/status'),
    
  joinSession: () => 
    api.post('/velvet-hour/join'),
    
  confirmMatch: (matchId: string) => 
    api.post('/velvet-hour/confirm-match', { matchId }),
    
  submitFeedback: (data: SubmitFeedbackRequest) => 
    api.post('/velvet-hour/feedback', data),

  // Admin endpoints
  getAdminStatus: (eventId: string) => 
    api.get<AdminVelvetHourStatusResponse>(`/admin/events/${eventId}/velvet-hour/status`),
    
  getAttendanceStats: (eventId: string) => 
    api.get<{
      attendingCount: number;
      presentCount: number;
      minParticipants: number;
      canStart: boolean;
      alreadyStarted: boolean;
    }>(`/admin/events/${eventId}/velvet-hour/attendance`),
    
  startSession: (eventId: string) => 
    api.post(`/admin/events/${eventId}/velvet-hour/start`),
    
  startRound: (eventId: string, data?: StartRoundRequest) => 
    api.post(`/admin/events/${eventId}/velvet-hour/start-round`, data || {}),
    
  endSession: (eventId: string) => 
    api.post(`/admin/events/${eventId}/velvet-hour/end`),
    
  updateConfig: (eventId: string, config: UpdateVelvetHourConfigRequest) => 
    api.put(`/admin/events/${eventId}/velvet-hour/config`, config),
    
  resetSession: (eventId: string) => 
    api.post(`/admin/events/${eventId}/velvet-hour/reset`),
    
  getAttendingUsers: (eventId: string) => 
    api.get(`/admin/events/${eventId}/velvet-hour/attending-users`),
    
  getPresentUsers: (eventId: string) => 
    api.get(`/admin/events/${eventId}/velvet-hour/present-users`),
    
  clearWebSocketConnections: (eventId: string) => 
    api.post(`/admin/events/${eventId}/velvet-hour/clear-connections`),
    
  getWebSocketConnectionInfo: (eventId: string) => 
    api.get(`/admin/events/${eventId}/velvet-hour/connection-info`),
};