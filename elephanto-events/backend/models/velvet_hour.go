package models

import (
	"time"

	"github.com/google/uuid"
)

// VelvetHourSession represents a Velvet Hour session
type VelvetHourSession struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	EventID        uuid.UUID  `json:"eventId" db:"event_id"`
	StartedAt      time.Time  `json:"startedAt" db:"started_at"`
	EndedAt        *time.Time `json:"endedAt" db:"ended_at"`
	IsActive       bool       `json:"isActive" db:"is_active"`
	CurrentRound   int        `json:"currentRound" db:"current_round"`
	RoundStartedAt *time.Time `json:"roundStartedAt" db:"round_started_at"`
	RoundEndsAt    *time.Time `json:"roundEndsAt" db:"round_ends_at"`
	Status         string     `json:"status" db:"status"` // waiting, in_round, break, completed
	CreatedAt      time.Time  `json:"createdAt" db:"created_at"`
	UpdatedAt      time.Time  `json:"updatedAt" db:"updated_at"`
}

// VelvetHourParticipant represents a user participating in Velvet Hour
type VelvetHourParticipant struct {
	ID        uuid.UUID `json:"id" db:"id"`
	SessionID uuid.UUID `json:"sessionId" db:"session_id"`
	UserID    uuid.UUID `json:"userId" db:"user_id"`
	JoinedAt  time.Time `json:"joinedAt" db:"joined_at"`
	Status    string    `json:"status" db:"status"` // waiting, matched, in_round, completed
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`
	
	// Joined user information
	UserName  string `json:"userName" db:"user_name"`
	UserEmail string `json:"userEmail" db:"user_email"`
}

// VelvetHourMatch represents a match between two users
type VelvetHourMatch struct {
	ID            uuid.UUID  `json:"id" db:"id"`
	SessionID     uuid.UUID  `json:"sessionId" db:"session_id"`
	RoundNumber   int        `json:"roundNumber" db:"round_number"`
	User1ID       uuid.UUID  `json:"user1Id" db:"user1_id"`
	User2ID       uuid.UUID  `json:"user2Id" db:"user2_id"`
	MatchNumber   int        `json:"matchNumber" db:"match_number"`
	MatchColor    string     `json:"matchColor" db:"match_color"`
	StartedAt     *time.Time `json:"startedAt" db:"started_at"`
	ConfirmedUser1 bool      `json:"confirmedUser1" db:"confirmed_user1"`
	ConfirmedUser2 bool      `json:"confirmedUser2" db:"confirmed_user2"`
	ConfirmedAt   *time.Time `json:"confirmedAt" db:"confirmed_at"`
	CreatedAt     time.Time  `json:"createdAt" db:"created_at"`
	UpdatedAt     time.Time  `json:"updatedAt" db:"updated_at"`
	
	// Joined user information
	User1Name string `json:"user1Name" db:"user1_name"`
	User2Name string `json:"user2Name" db:"user2_name"`
}

// VelvetHourFeedback represents feedback from one user about another
type VelvetHourFeedback struct {
	ID             uuid.UUID `json:"id" db:"id"`
	MatchID        uuid.UUID `json:"matchId" db:"match_id"`
	FromUserID     uuid.UUID `json:"fromUserId" db:"from_user_id"`
	ToUserID       uuid.UUID `json:"toUserId" db:"to_user_id"`
	WantToConnect  bool      `json:"wantToConnect" db:"want_to_connect"`
	FeedbackReason string    `json:"feedbackReason" db:"feedback_reason"`
	SubmittedAt    time.Time `json:"submittedAt" db:"submitted_at"`
	CreatedAt      time.Time `json:"createdAt" db:"created_at"`
}

// VelvetHourQuestion represents configurable questions for Velvet Hour
type VelvetHourQuestion struct {
	ID           uuid.UUID `json:"id" db:"id"`
	EventID      uuid.UUID `json:"eventId" db:"event_id"`
	QuestionType string    `json:"questionType" db:"question_type"`
	QuestionText string    `json:"questionText" db:"question_text"`
	Options      string    `json:"options" db:"options"` // JSON string for options
	DisplayOrder int       `json:"displayOrder" db:"display_order"`
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

// Request/Response models for Velvet Hour

type CreateVelvetHourSessionRequest struct {
	EventID uuid.UUID `json:"eventId" validate:"required"`
}

type VelvetHourSessionResponse struct {
	Session      *VelvetHourSession      `json:"session"`
	Participants []VelvetHourParticipant `json:"participants"`
	CurrentMatch *VelvetHourMatch        `json:"currentMatch,omitempty"`
}

type JoinVelvetHourRequest struct {
	// No additional fields needed - user comes from auth context
}

type VelvetHourStatusResponse struct {
	IsActive     bool                   `json:"isActive"`
	Session      *VelvetHourSession     `json:"session,omitempty"`
	Participant  *VelvetHourParticipant `json:"participant,omitempty"`
	CurrentMatch *VelvetHourMatch       `json:"currentMatch,omitempty"`
	TimeLeft     *int                   `json:"timeLeft,omitempty"` // seconds remaining
}

type ConfirmMatchRequest struct {
	MatchID uuid.UUID `json:"matchId" validate:"required"`
}

type SubmitFeedbackRequest struct {
	MatchID        uuid.UUID `json:"matchId" validate:"required"`
	WantToConnect  bool      `json:"wantToConnect"`
	FeedbackReason string    `json:"feedbackReason" validate:"required"`
}

type AdminVelvetHourStatusResponse struct {
	Session         *VelvetHourSession      `json:"session"`
	Participants    []VelvetHourParticipant `json:"participants"`
	CurrentMatches  []VelvetHourMatch       `json:"currentMatches"`
	CompletedRounds int                     `json:"completedRounds"`
	CanStartRound   bool                    `json:"canStartRound"`
}

type StartRoundRequest struct {
	Matches []ManualMatch `json:"matches,omitempty"` // Optional manual matches
}

type ManualMatch struct {
	User1ID     uuid.UUID `json:"user1Id"`
	User2ID     uuid.UUID `json:"user2Id"`
	MatchNumber int       `json:"matchNumber"`
	MatchColor  string    `json:"matchColor"`
}

type UpdateVelvetHourConfigRequest struct {
	RoundDuration     *int `json:"roundDuration"`
	BreakDuration     *int `json:"breakDuration"`
	TotalRounds       *int `json:"totalRounds"`
	MinParticipants   *int `json:"minParticipants"`
}