// Velvet Hour types

export interface VelvetHourSession {
  id: string;
  eventId: string;
  startedAt: string;
  endedAt?: string;
  isActive: boolean;
  currentRound: number;
  roundStartedAt?: string;
  roundEndsAt?: string;
  status: string; // waiting, in_round, break, completed
  createdAt: string;
  updatedAt: string;
}

export interface VelvetHourParticipant {
  id: string;
  sessionId: string;
  userId: string;
  joinedAt: string;
  status: string; // waiting, matched, in_round, completed
  createdAt: string;
  updatedAt: string;
  userName: string;
  userEmail: string;
}

export interface VelvetHourMatch {
  id: string;
  sessionId: string;
  roundNumber: number;
  user1Id: string;
  user2Id: string;
  matchNumber: number;
  matchColor: string;
  startedAt?: string;
  confirmedUser1: boolean;
  confirmedUser2: boolean;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
  user1Name: string;
  user2Name: string;
  user1FeedbackSubmitted?: boolean;
  user2FeedbackSubmitted?: boolean;
}

export interface VelvetHourFeedback {
  id: string;
  matchId: string;
  fromUserId: string;
  toUserId: string;
  wantToConnect: boolean;
  feedbackReason: string;
  submittedAt: string;
  createdAt: string;
}

// API Request/Response types

export interface VelvetHourStatusResponse {
  isActive: boolean;
  session?: VelvetHourSession;
  participant?: VelvetHourParticipant;
  currentMatch?: VelvetHourMatch;
  timeLeft?: number; // seconds remaining
  config?: VelvetHourConfig;
}

export interface SubmitFeedbackRequest {
  matchId: string;
  wantToConnect: boolean;
  feedbackReason: string; // humor, confidence, listening, no_connection
}

export interface VelvetHourConfig {
  roundDuration: number;
  breakDuration: number;
  totalRounds: number;
  minParticipants: number;
}

export interface AdminVelvetHourStatusResponse {
  session?: VelvetHourSession;
  participants: VelvetHourParticipant[];
  currentMatches: VelvetHourMatch[];
  completedRounds: number;
  canStartRound: boolean;
  config: VelvetHourConfig;
}

export interface StartRoundRequest {
  matches?: ManualMatch[];
}

export interface ManualMatch {
  user1Id: string;
  user2Id: string;
  matchNumber: number;
  matchColor: string;
}

export interface UpdateVelvetHourConfigRequest {
  roundDuration?: number;
  breakDuration?: number;
  totalRounds?: number;
  // minParticipants is auto-calculated based on totalRounds
}

// Frontend component props types

export interface VelvetHourWaitingProps {
  onJoin: () => void;
  participantCount: number;
  hasJoined: boolean;
  isConnected: boolean;
  config?: VelvetHourConfig;
  isInActiveRound?: boolean;
  currentRound?: number;
  timeLeft?: number;
  partnerName?: string;
  matchNumber?: number;
  matchColor?: string;
}

export interface VelvetHourMatchProps {
  match: VelvetHourMatch;
  onConfirmMatch: (matchId: string) => void;
  currentUserId: string;
}

export interface VelvetHourRoundProps {
  match: VelvetHourMatch;
  timeLeft: number;
  currentRound: number;
  totalRounds: number;
  currentUserId: string;
  roundDuration?: number; // Optional, defaults to 10 minutes
}

export interface VelvetHourFeedbackProps {
  match: VelvetHourMatch;
  onSubmitFeedback: (matchId: string, wantToConnect: boolean, reason: string) => void;
  currentUserId: string;
}

export interface VelvetHourCompleteProps {
  // Add props if needed for showing connections/results
}

// Admin component props

export interface AdminVelvetHourControlProps {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  status: AdminVelvetHourStatusResponse;
  onStartSession: () => void;
  onStartRound: (matches?: ManualMatch[]) => void;
  onEndSession: () => void;
  onUpdateConfig: (config: UpdateVelvetHourConfigRequest) => void;
  onResetSession?: () => void;
}

export interface DraggableMatchmakingProps {
  participants: VelvetHourParticipant[];
  onMatchesChange: (matches: ManualMatch[]) => void;
  onMatchStatsChange?: (stats: { incompleteMatches: number; completeMatches: number; duplicatePairings: number; validationErrors: string[] }) => void;
  maxMatches: number;
  eventId: string;
  previousMatches?: VelvetHourMatch[]; // All previous matches to check for duplicates
}

// Color options for matches (supports up to 100 rooms)
export const MATCH_COLORS = [
  'red', 'blue', 'green', 'purple', 'orange', 'yellow', 'pink', 'cyan',
  'indigo', 'teal', 'lime', 'rose', 'amber', 'emerald', 'violet', 'sky',
  'slate', 'gray', 'zinc', 'neutral', 'stone', 'red-dark', 'rose-dark', 'pink-dark',
  'fuchsia', 'purple-dark', 'violet-dark', 'indigo-dark', 'blue-dark', 'sky-dark',
  'cyan-dark', 'teal-dark', 'emerald-dark', 'green-dark', 'lime-dark', 'yellow-dark',
  'amber-dark', 'orange-dark', 'red-light', 'rose-light', 'pink-light', 'fuchsia-light',
  'purple-light', 'violet-light', 'indigo-light', 'blue-light', 'sky-light', 'cyan-light',
  'teal-light', 'emerald-light', 'green-light', 'lime-light', 'yellow-light', 'amber-light',
  'orange-light', 'red-bright', 'rose-bright', 'pink-bright', 'fuchsia-bright', 'purple-bright',
  'violet-bright', 'indigo-bright', 'blue-bright', 'sky-bright', 'cyan-bright', 'teal-bright',
  'emerald-bright', 'green-bright', 'lime-bright', 'yellow-bright', 'amber-bright', 'orange-bright',
  'red-deep', 'rose-deep', 'pink-deep', 'fuchsia-deep', 'purple-deep', 'violet-deep',
  'indigo-deep', 'blue-deep', 'sky-deep', 'cyan-deep', 'teal-deep', 'emerald-deep',
  'green-deep', 'lime-deep', 'yellow-deep', 'amber-deep', 'orange-deep', 'brown',
  'tan', 'beige', 'cream', 'ivory', 'pearl', 'silver', 'gold', 'bronze',
  'copper', 'rust', 'maroon', 'crimson', 'scarlet', 'burgundy', 'wine', 'navy'
] as const;

export type MatchColor = typeof MATCH_COLORS[number];

// Feedback reasons
export const FEEDBACK_REASONS = [
  { value: 'humor', label: 'Their sense of humor' },
  { value: 'confidence', label: 'Their confidence and presence' },
  { value: 'listening', label: 'The way they listened and engaged' },
  { value: 'no_connection', label: "We didn't really connect" }
] as const;