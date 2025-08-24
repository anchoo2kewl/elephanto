package handlers

import (
	"database/sql"
	"elephanto-events/middleware"
	"elephanto-events/models"
	"elephanto-events/services"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

type VelvetHourHandler struct {
	db  *sql.DB
	hub *services.Hub
}

func NewVelvetHourHandler(db *sql.DB) *VelvetHourHandler {
	return &VelvetHourHandler{db: db}
}

// SetWebSocketHub sets the WebSocket hub for broadcasting messages
func (h *VelvetHourHandler) SetWebSocketHub(hub *services.Hub) {
	h.hub = hub
}

// GetStatus returns the current Velvet Hour status for a user
func (h *VelvetHourHandler) GetStatus(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r)
	if !ok {
		http.Error(w, "User not found", http.StatusInternalServerError)
		return
	}

	// Check if user is attending the active event
	var eventID uuid.UUID
	var attending bool
	err := h.db.QueryRow(`
		SELECT e.id, COALESCE(ea.attending, false)
		FROM events e
		LEFT JOIN event_attendance ea ON e.id = ea.event_id AND ea.user_id = $1
		WHERE e.is_active = true AND e.the_hour_enabled = true
	`, user.ID).Scan(&eventID, &attending)
	
	if err == sql.ErrNoRows {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(models.VelvetHourStatusResponse{IsActive: false})
		return
	}
	if err != nil {
		log.Printf("Failed to check event attendance: %v", err)
		http.Error(w, "Failed to check event status", http.StatusInternalServerError)
		return
	}

	if !attending {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(models.VelvetHourStatusResponse{IsActive: false})
		return
	}

	// Get active session
	var session models.VelvetHourSession
	err = h.db.QueryRow(`
		SELECT id, event_id, started_at, ended_at, is_active, current_round, 
			   round_started_at, round_ends_at, status, created_at, updated_at
		FROM velvet_hour_sessions 
		WHERE event_id = $1 AND is_active = true
	`, eventID).Scan(
		&session.ID, &session.EventID, &session.StartedAt, &session.EndedAt,
		&session.IsActive, &session.CurrentRound, &session.RoundStartedAt,
		&session.RoundEndsAt, &session.Status, &session.CreatedAt, &session.UpdatedAt,
	)
	
	if err == sql.ErrNoRows {
		// No active session, but user is attending - allow them to wait/connect
		// Get event configuration even when no session exists
		var config models.VelvetHourConfig
		err = h.db.QueryRow(`
			SELECT the_hour_round_duration, the_hour_break_duration, 
				   the_hour_total_rounds
			FROM events 
			WHERE id = $1
		`, eventID).Scan(
			&config.RoundDuration, &config.BreakDuration,
			&config.TotalRounds,
		)
		if err != nil {
			log.Printf("Failed to get event config: %v", err)
			// Use default values if config fetch fails
			config = models.VelvetHourConfig{
				RoundDuration:   10,
				BreakDuration:   5,
				TotalRounds:     4,
			}
		}
		
		// Calculate minimum participants based on total rounds (round-robin formula)
		if config.TotalRounds%2 == 0 {
			config.MinParticipants = config.TotalRounds + 1
		} else {
			config.MinParticipants = config.TotalRounds
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(models.VelvetHourStatusResponse{
			IsActive: true, // Allow connection for presence tracking
			Session: &models.VelvetHourSession{
				EventID: eventID, // Provide eventId for WebSocket connection
			},
			Config: &config,
		})
		return
	}
	if err != nil {
		log.Printf("Failed to get active session: %v", err)
		http.Error(w, "Failed to get session status", http.StatusInternalServerError)
		return
	}

	// Get participant status
	var participant models.VelvetHourParticipant
	err = h.db.QueryRow(`
		SELECT p.id, p.session_id, p.user_id, p.joined_at, p.status, 
			   p.created_at, p.updated_at, u.name, u.email
		FROM velvet_hour_participants p
		JOIN users u ON p.user_id = u.id
		WHERE p.session_id = $1 AND p.user_id = $2
	`, session.ID, user.ID).Scan(
		&participant.ID, &participant.SessionID, &participant.UserID,
		&participant.JoinedAt, &participant.Status, &participant.CreatedAt,
		&participant.UpdatedAt, &participant.UserName, &participant.UserEmail,
	)
	
	var participantPtr *models.VelvetHourParticipant
	if err != sql.ErrNoRows {
		if err != nil {
			log.Printf("Failed to get participant: %v", err)
			http.Error(w, "Failed to get participant status", http.StatusInternalServerError)
			return
		}
		participantPtr = &participant
	}

	// Get current match if participant exists
	var currentMatch *models.VelvetHourMatch
	if participantPtr != nil {
		var match models.VelvetHourMatch
		err = h.db.QueryRow(`
			SELECT m.id, m.session_id, m.round_number, m.user1_id, m.user2_id,
				   m.match_number, m.match_color, m.started_at, m.confirmed_user1,
				   m.confirmed_user2, m.confirmed_at, m.created_at, m.updated_at,
				   u1.name, u2.name
			FROM velvet_hour_matches m
			JOIN users u1 ON m.user1_id = u1.id
			JOIN users u2 ON m.user2_id = u2.id
			WHERE m.session_id = $1 AND m.round_number = $2 
			  AND (m.user1_id = $3 OR m.user2_id = $3)
		`, session.ID, session.CurrentRound, user.ID).Scan(
			&match.ID, &match.SessionID, &match.RoundNumber, &match.User1ID,
			&match.User2ID, &match.MatchNumber, &match.MatchColor, &match.StartedAt,
			&match.ConfirmedUser1, &match.ConfirmedUser2, &match.ConfirmedAt,
			&match.CreatedAt, &match.UpdatedAt, &match.User1Name, &match.User2Name,
		)
		if err == nil {
			currentMatch = &match
		}
	}

	// Calculate time left
	var timeLeft *int
	if session.RoundEndsAt != nil {
		remaining := int(time.Until(*session.RoundEndsAt).Seconds())
		if remaining > 0 {
			timeLeft = &remaining
		}
	}

	// Get event configuration
	var config models.VelvetHourConfig
	err = h.db.QueryRow(`
		SELECT the_hour_round_duration, the_hour_break_duration, 
			   the_hour_total_rounds
		FROM events 
		WHERE id = $1
	`, eventID).Scan(
		&config.RoundDuration, &config.BreakDuration,
		&config.TotalRounds,
	)
	if err != nil {
		log.Printf("Failed to get event config: %v", err)
		// Use default values if config fetch fails
		config = models.VelvetHourConfig{
			RoundDuration:   10,
			BreakDuration:   5,
			TotalRounds:     4,
		}
	}
	
	// Calculate minimum participants based on total rounds (round-robin formula)
	if config.TotalRounds%2 == 0 {
		config.MinParticipants = config.TotalRounds + 1
	} else {
		config.MinParticipants = config.TotalRounds
	}

	response := models.VelvetHourStatusResponse{
		IsActive:     true,
		Session:      &session,
		Participant:  participantPtr,
		CurrentMatch: currentMatch,
		TimeLeft:     timeLeft,
		Config:       &config,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// JoinSession allows a user to join the current Velvet Hour session
func (h *VelvetHourHandler) JoinSession(w http.ResponseWriter, r *http.Request) {
	log.Printf("DEBUG: JoinSession called")
	user, ok := middleware.GetUserFromContext(r)
	if !ok {
		http.Error(w, "User not found", http.StatusInternalServerError)
		return
	}
	log.Printf("DEBUG: User found: %s (%s)", user.Name, user.ID)

	// Check if user is attending the active event
	var eventID uuid.UUID
	var attending bool
	err := h.db.QueryRow(`
		SELECT e.id, COALESCE(ea.attending, false)
		FROM events e
		LEFT JOIN event_attendance ea ON e.id = ea.event_id AND ea.user_id = $1
		WHERE e.is_active = true AND e.the_hour_enabled = true
	`, user.ID).Scan(&eventID, &attending)
	
	if err != nil || !attending {
		http.Error(w, "User not attending active event", http.StatusForbidden)
		return
	}

	// Get active session
	var sessionID uuid.UUID
	err = h.db.QueryRow(`
		SELECT id FROM velvet_hour_sessions 
		WHERE event_id = $1 AND is_active = true
	`, eventID).Scan(&sessionID)
	
	if err == sql.ErrNoRows {
		http.Error(w, "No active Velvet Hour session", http.StatusBadRequest)
		return
	}
	if err != nil {
		log.Printf("Failed to get active session: %v", err)
		http.Error(w, "Failed to join session", http.StatusInternalServerError)
		return
	}

	// Add participant (or update if already exists)
	_, err = h.db.Exec(`
		INSERT INTO velvet_hour_participants (session_id, user_id, status)
		VALUES ($1, $2, 'waiting')
		ON CONFLICT (session_id, user_id) 
		DO UPDATE SET status = 'waiting', updated_at = CURRENT_TIMESTAMP
	`, sessionID, user.ID)
	
	if err != nil {
		log.Printf("Failed to add participant: %v", err)
		http.Error(w, "Failed to join session", http.StatusInternalServerError)
		return
	}

	// Broadcast participant joined event
	if h.hub != nil {
		h.hub.BroadcastToEvent(eventID, services.MessageTypeVelvetHourParticipantJoined, map[string]interface{}{
			"userId":    user.ID,
			"userName":  user.Name,
			"userEmail": user.Email,
			"sessionId": sessionID,
		})
		
		// Also broadcast attendance stats update to admin users
		// Get current present user count for real-time admin dashboard updates
		presentCount := h.hub.GetPresentUserCount(eventID)
		h.hub.BroadcastToAdmins(eventID, services.MessageTypeAttendanceStatsUpdate, map[string]interface{}{
			"presentCount": presentCount,
			"eventId":      eventID,
			"type":         "presence_update",
		})
		log.Printf("DEBUG: Broadcasted attendance stats update after Velvet Hour join - presentCount: %d for event: %s", presentCount, eventID)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Successfully joined Velvet Hour session"})
}

// ConfirmMatch allows a user to confirm they found their match partner
func (h *VelvetHourHandler) ConfirmMatch(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r)
	if !ok {
		http.Error(w, "User not found", http.StatusInternalServerError)
		return
	}

	var req models.ConfirmMatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get match details and confirm user is part of this match
	var match models.VelvetHourMatch
	err := h.db.QueryRow(`
		SELECT id, session_id, user1_id, user2_id, confirmed_user1, confirmed_user2
		FROM velvet_hour_matches
		WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)
	`, req.MatchID, user.ID).Scan(
		&match.ID, &match.SessionID, &match.User1ID, &match.User2ID,
		&match.ConfirmedUser1, &match.ConfirmedUser2,
	)
	
	if err == sql.ErrNoRows {
		http.Error(w, "Match not found or user not part of match", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("Failed to get match: %v", err)
		http.Error(w, "Failed to confirm match", http.StatusInternalServerError)
		return
	}

	// Update confirmation status
	var updateQuery string
	if match.User1ID == user.ID {
		updateQuery = `
			UPDATE velvet_hour_matches 
			SET confirmed_user1 = true, updated_at = CURRENT_TIMESTAMP
			WHERE id = $1
		`
	} else {
		updateQuery = `
			UPDATE velvet_hour_matches 
			SET confirmed_user2 = true, updated_at = CURRENT_TIMESTAMP
			WHERE id = $1
		`
	}

	_, err = h.db.Exec(updateQuery, req.MatchID)
	if err != nil {
		log.Printf("Failed to update match confirmation: %v", err)
		http.Error(w, "Failed to confirm match", http.StatusInternalServerError)
		return
	}

	// Check if both users have confirmed
	err = h.db.QueryRow(`
		SELECT confirmed_user1, confirmed_user2
		FROM velvet_hour_matches
		WHERE id = $1
	`, req.MatchID).Scan(&match.ConfirmedUser1, &match.ConfirmedUser2)
	
	if err != nil {
		log.Printf("Failed to check confirmation status: %v", err)
		http.Error(w, "Failed to check confirmation", http.StatusInternalServerError)
		return
	}

	// Get event ID for WebSocket broadcasting
	var eventID uuid.UUID
	err = h.db.QueryRow(`
		SELECT event_id FROM velvet_hour_sessions WHERE id = $1
	`, match.SessionID).Scan(&eventID)
	
	if err != nil {
		log.Printf("Failed to get event ID for WebSocket: %v", err)
	}

	// Broadcast match confirmation
	if h.hub != nil {
		h.hub.BroadcastToEvent(eventID, services.MessageTypeVelvetHourMatchConfirmed, map[string]interface{}{
			"matchId":  req.MatchID,
			"userId":   user.ID,
			"user1Id":  match.User1ID,
			"user2Id":  match.User2ID,
			"bothConfirmed": (match.User1ID == user.ID && match.ConfirmedUser2) || (match.User2ID == user.ID && match.ConfirmedUser1),
		})
	}

	// If both confirmed, start the round timer
	if (match.User1ID == user.ID && match.ConfirmedUser2) || 
	   (match.User2ID == user.ID && match.ConfirmedUser1) {
		
		// Get event configuration
		var roundDuration int
		err = h.db.QueryRow(`
			SELECT the_hour_round_duration
			FROM events e
			JOIN velvet_hour_sessions s ON e.id = s.event_id
			WHERE s.id = $1
		`, match.SessionID).Scan(&roundDuration)
		
		if err != nil {
			log.Printf("Failed to get round duration: %v", err)
			roundDuration = 10 // Default to 10 minutes
		}

		roundEnd := time.Now().Add(time.Duration(roundDuration) * time.Minute)
		
		// Update match and session with timer
		_, err = h.db.Exec(`
			UPDATE velvet_hour_matches 
			SET confirmed_at = CURRENT_TIMESTAMP, started_at = CURRENT_TIMESTAMP
			WHERE id = $1
		`, req.MatchID)
		
		if err != nil {
			log.Printf("Failed to update match start time: %v", err)
		}

		// Update session round timer
		_, err = h.db.Exec(`
			UPDATE velvet_hour_sessions
			SET round_started_at = CURRENT_TIMESTAMP, round_ends_at = $1, 
				status = 'in_round', updated_at = CURRENT_TIMESTAMP
			WHERE id = $2
		`, roundEnd, match.SessionID)
		
		if err != nil {
			log.Printf("Failed to update session round timer: %v", err)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Match confirmed successfully"})
}

// SubmitFeedback allows a user to submit feedback about their match
func (h *VelvetHourHandler) SubmitFeedback(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r)
	if !ok {
		http.Error(w, "User not found", http.StatusInternalServerError)
		return
	}

	var req models.SubmitFeedbackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get match details to determine the other user
	var match models.VelvetHourMatch
	err := h.db.QueryRow(`
		SELECT id, user1_id, user2_id
		FROM velvet_hour_matches
		WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)
	`, req.MatchID, user.ID).Scan(&match.ID, &match.User1ID, &match.User2ID)
	
	if err == sql.ErrNoRows {
		http.Error(w, "Match not found or user not part of match", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("Failed to get match: %v", err)
		http.Error(w, "Failed to submit feedback", http.StatusInternalServerError)
		return
	}

	// Determine the other user
	var toUserID uuid.UUID
	if match.User1ID == user.ID {
		toUserID = match.User2ID
	} else {
		toUserID = match.User1ID
	}

	// Insert feedback
	_, err = h.db.Exec(`
		INSERT INTO velvet_hour_feedback 
		(match_id, from_user_id, to_user_id, want_to_connect, feedback_reason)
		VALUES ($1, $2, $3, $4, $5)
	`, req.MatchID, user.ID, toUserID, req.WantToConnect, req.FeedbackReason)
	
	if err != nil {
		log.Printf("Failed to insert feedback: %v", err)
		http.Error(w, "Failed to submit feedback", http.StatusInternalServerError)
		return
	}

	// Get event ID for WebSocket broadcasting
	var eventID uuid.UUID
	err = h.db.QueryRow(`
		SELECT s.event_id 
		FROM velvet_hour_sessions s
		JOIN velvet_hour_matches m ON s.id = m.session_id
		WHERE m.id = $1
	`, req.MatchID).Scan(&eventID)
	
	if err != nil {
		log.Printf("Failed to get event ID for WebSocket: %v", err)
	} else {
		// Broadcast feedback submission
		if h.hub != nil {
			h.hub.BroadcastToEvent(eventID, services.MessageTypeVelvetHourFeedbackSubmitted, map[string]interface{}{
				"matchId":        req.MatchID,
				"fromUserId":     user.ID,
				"toUserId":       toUserID,
				"wantToConnect":  req.WantToConnect,
				"feedbackReason": req.FeedbackReason,
			})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Feedback submitted successfully"})
}

// Admin endpoints

// GetAdminStatus returns the admin view of Velvet Hour status
func (h *VelvetHourHandler) GetAdminStatus(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventIDStr := vars["eventId"]
	
	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}

	// Get session
	var session models.VelvetHourSession
	err = h.db.QueryRow(`
		SELECT id, event_id, started_at, ended_at, is_active, current_round,
			   round_started_at, round_ends_at, status, created_at, updated_at
		FROM velvet_hour_sessions
		WHERE event_id = $1 AND is_active = true
	`, eventID).Scan(
		&session.ID, &session.EventID, &session.StartedAt, &session.EndedAt,
		&session.IsActive, &session.CurrentRound, &session.RoundStartedAt,
		&session.RoundEndsAt, &session.Status, &session.CreatedAt, &session.UpdatedAt,
	)
	
	var sessionPtr *models.VelvetHourSession
	if err == nil {
		sessionPtr = &session
	}

	// Get participants (only attending users)
	participants := []models.VelvetHourParticipant{}
	if sessionPtr != nil {
		rows, err := h.db.Query(`
			SELECT p.id, p.session_id, p.user_id, p.joined_at, p.status,
				   p.created_at, p.updated_at, u.name, u.email
			FROM velvet_hour_participants p
			JOIN users u ON p.user_id = u.id
			JOIN event_attendance ea ON ea.user_id = u.id AND ea.event_id = $1
			WHERE p.session_id = $2 AND ea.attending = true
			ORDER BY p.joined_at
		`, eventID, sessionPtr.ID)
		
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var p models.VelvetHourParticipant
				err := rows.Scan(
					&p.ID, &p.SessionID, &p.UserID, &p.JoinedAt, &p.Status,
					&p.CreatedAt, &p.UpdatedAt, &p.UserName, &p.UserEmail,
				)
				if err != nil {
					log.Printf("Failed to scan participant: %v", err)
					continue
				}
				participants = append(participants, p)
			}
		}
	}

	// Get current round matches
	currentMatches := []models.VelvetHourMatch{}
	if sessionPtr != nil {
		rows, err := h.db.Query(`
			SELECT m.id, m.session_id, m.round_number, m.user1_id, m.user2_id,
				   m.match_number, m.match_color, m.started_at, m.confirmed_user1,
				   m.confirmed_user2, m.confirmed_at, m.created_at, m.updated_at,
				   u1.name, u2.name
			FROM velvet_hour_matches m
			JOIN users u1 ON m.user1_id = u1.id
			JOIN users u2 ON m.user2_id = u2.id
			WHERE m.session_id = $1 AND m.round_number = $2
		`, sessionPtr.ID, sessionPtr.CurrentRound)
		
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var m models.VelvetHourMatch
				err := rows.Scan(
					&m.ID, &m.SessionID, &m.RoundNumber, &m.User1ID, &m.User2ID,
					&m.MatchNumber, &m.MatchColor, &m.StartedAt, &m.ConfirmedUser1,
					&m.ConfirmedUser2, &m.ConfirmedAt, &m.CreatedAt, &m.UpdatedAt,
					&m.User1Name, &m.User2Name,
				)
				if err != nil {
					log.Printf("Failed to scan match: %v", err)
					continue
				}
				currentMatches = append(currentMatches, m)
			}
		}
	}

	// Get event configuration
	var config models.VelvetHourConfig
	err = h.db.QueryRow(`
		SELECT the_hour_round_duration, the_hour_break_duration, 
			   the_hour_total_rounds
		FROM events 
		WHERE id = $1
	`, eventID).Scan(
		&config.RoundDuration, &config.BreakDuration,
		&config.TotalRounds,
	)
	if err != nil {
		log.Printf("Failed to get event config: %v", err)
		// Use default values if config fetch fails
		config = models.VelvetHourConfig{
			RoundDuration:   10,
			BreakDuration:   5,
			TotalRounds:     4,
		}
	}
	
	// Calculate minimum participants based on total rounds (round-robin formula)
	// For R rounds: n_min = R if R is odd, R+1 if R is even
	if config.TotalRounds%2 == 0 {
		config.MinParticipants = config.TotalRounds + 1
	} else {
		config.MinParticipants = config.TotalRounds
	}

	// Determine if admin can start next round
	canStartRound := false
	if sessionPtr != nil && sessionPtr.Status == "waiting" {
		// Can start if we have enough participants
		canStartRound = len(participants) >= 2
	}

	response := models.AdminVelvetHourStatusResponse{
		Session:         sessionPtr,
		Participants:    participants,
		CurrentMatches:  currentMatches,
		CompletedRounds: 0,
		CanStartRound:   canStartRound,
		Config:          config,
	}

	// Calculate completed rounds
	if sessionPtr != nil {
		response.CompletedRounds = sessionPtr.CurrentRound
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// StartSession creates a new Velvet Hour session
func (h *VelvetHourHandler) StartSession(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventIDStr := vars["eventId"]
	
	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}

	// Check if Velvet Hour has already been run for this event (one-time execution)
	var theHourStarted bool
	var totalRounds int
	err = h.db.QueryRow(`
		SELECT the_hour_started, the_hour_total_rounds 
		FROM events 
		WHERE id = $1
	`, eventID).Scan(&theHourStarted, &totalRounds)
	
	// Calculate minimum participants based on total rounds (round-robin formula)
	var minParticipants int
	if totalRounds%2 == 0 {
		minParticipants = totalRounds + 1
	} else {
		minParticipants = totalRounds
	}
	
	if err != nil {
		log.Printf("Failed to get event info: %v", err)
		http.Error(w, "Event not found", http.StatusNotFound)
		return
	}
	
	if theHourStarted {
		http.Error(w, "Velvet Hour has already been run for this event. Use reset to run again.", http.StatusConflict)
		return
	}

	// Check attendance requirements - count attending users
	var attendingCount int
	err = h.db.QueryRow(`
		SELECT COUNT(*) 
		FROM event_attendance ea 
		JOIN users u ON ea.user_id = u.id 
		WHERE ea.event_id = $1 AND ea.attending = true AND u.isonboarded = true
	`, eventID).Scan(&attendingCount)
	
	if err != nil {
		log.Printf("Failed to count attending users: %v", err)
		http.Error(w, "Failed to check attendance", http.StatusInternalServerError)
		return
	}
	
	// Check present users (actually connected via WebSocket)
	presentCount := 0
	if h.hub != nil {
		presentCount = h.hub.GetPresentUserCount(eventID)
	}
	
	// For unique pairings across rounds, use calculated minimum participants
	// Round-robin formula: n_min = R if R is odd, R+1 if R is even
	requiredAttending := minParticipants
	
	// Require that users are actually present (connected), not just marked as attending
	if presentCount < requiredAttending {
		http.Error(w, fmt.Sprintf("Not enough users present. Need at least %d users connected and ready, but only %d are currently present. (%d marked attending but not connected)", requiredAttending, presentCount, attendingCount-presentCount), http.StatusBadRequest)
		return
	}

	// Check if session already exists
	var existingID uuid.UUID
	err = h.db.QueryRow(`
		SELECT id FROM velvet_hour_sessions 
		WHERE event_id = $1 AND is_active = true
	`, eventID).Scan(&existingID)
	
	if err == nil {
		http.Error(w, "Session already active", http.StatusConflict)
		return
	}

	// Create new session
	var sessionID uuid.UUID
	err = h.db.QueryRow(`
		INSERT INTO velvet_hour_sessions (event_id, status)
		VALUES ($1, 'waiting')
		RETURNING id
	`, eventID).Scan(&sessionID)
	
	if err != nil {
		log.Printf("Failed to create session: %v", err)
		http.Error(w, "Failed to start session", http.StatusInternalServerError)
		return
	}

	// Update event to mark Velvet Hour as started
	_, err = h.db.Exec(`
		UPDATE events SET the_hour_started = true WHERE id = $1
	`, eventID)
	
	if err != nil {
		log.Printf("Failed to update event status: %v", err)
	}

	// Broadcast session started event
	if h.hub != nil {
		h.hub.BroadcastToEvent(eventID, services.MessageTypeVelvetHourSessionStarted, map[string]interface{}{
			"sessionId":       sessionID,
			"eventId":         eventID,
			"status":          "waiting",
			"attendingCount":  attendingCount,
			"requiredCount":   requiredAttending,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":   "Velvet Hour session started successfully",
		"sessionId": sessionID,
	})
}

// StartRound starts a new round with matches
func (h *VelvetHourHandler) StartRound(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventIDStr := vars["eventId"]
	
	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}

	var req models.StartRoundRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get active session
	var sessionID uuid.UUID
	var currentRound int
	err = h.db.QueryRow(`
		SELECT id, current_round FROM velvet_hour_sessions 
		WHERE event_id = $1 AND is_active = true
	`, eventID).Scan(&sessionID, &currentRound)
	
	if err != nil {
		http.Error(w, "No active session", http.StatusBadRequest)
		return
	}

	nextRound := currentRound + 1

	// If manual matches provided, use them
	if len(req.Matches) > 0 {
		for _, match := range req.Matches {
			_, err = h.db.Exec(`
				INSERT INTO velvet_hour_matches 
				(session_id, round_number, user1_id, user2_id, match_number, match_color)
				VALUES ($1, $2, $3, $4, $5, $6)
			`, sessionID, nextRound, match.User1ID, match.User2ID, match.MatchNumber, match.MatchColor)
			
			if err != nil {
				log.Printf("Failed to create manual match: %v", err)
				http.Error(w, "Failed to create matches", http.StatusInternalServerError)
				return
			}
		}
	} else {
		// Generate automatic matches
		err = h.generateMatches(sessionID, nextRound)
		if err != nil {
			log.Printf("Failed to generate matches: %v", err)
			http.Error(w, "Failed to generate matches", http.StatusInternalServerError)
			return
		}
	}

	// Update session to new round
	_, err = h.db.Exec(`
		UPDATE velvet_hour_sessions 
		SET current_round = $1, status = 'waiting', updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`, nextRound, sessionID)
	
	if err != nil {
		log.Printf("Failed to update session round: %v", err)
		http.Error(w, "Failed to start round", http.StatusInternalServerError)
		return
	}

	// Broadcast round started event
	if h.hub != nil {
		h.hub.BroadcastToEvent(eventID, services.MessageTypeVelvetHourRoundStarted, map[string]interface{}{
			"sessionId":   sessionID,
			"roundNumber": nextRound,
			"status":      "waiting",
			"matchCount":  len(req.Matches),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": fmt.Sprintf("Round %d started successfully", nextRound),
		"round":   nextRound,
	})
}

// generateMatches creates automatic matches for a round ensuring unique pairings
func (h *VelvetHourHandler) generateMatches(sessionID uuid.UUID, roundNumber int) error {
	// Get active participants
	participants := []uuid.UUID{}
	rows, err := h.db.Query(`
		SELECT user_id FROM velvet_hour_participants 
		WHERE session_id = $1 AND status != 'completed'
		ORDER BY joined_at
	`, sessionID)
	
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var userID uuid.UUID
		if err := rows.Scan(&userID); err != nil {
			continue
		}
		participants = append(participants, userID)
	}

	// Get previous matches to avoid repeating pairs
	previousPairs := make(map[string]bool)
	pairRows, err := h.db.Query(`
		SELECT user1_id, user2_id FROM velvet_hour_matches 
		WHERE session_id = $1 AND round_number < $2
	`, sessionID, roundNumber)
	
	if err != nil {
		return err
	}
	defer pairRows.Close()

	for pairRows.Next() {
		var user1, user2 uuid.UUID
		if err := pairRows.Scan(&user1, &user2); err != nil {
			continue
		}
		// Store both directions to ensure no repeat pairings
		key1 := user1.String() + "_" + user2.String()
		key2 := user2.String() + "_" + user1.String()
		previousPairs[key1] = true
		previousPairs[key2] = true
	}

	// Generate unique pairings using a greedy algorithm
	matches, err := h.findUniquePairings(participants, previousPairs)
	if err != nil {
		return err
	}

	// Create matches in database
	colors := []string{"red", "blue", "green", "purple", "orange", "yellow", "pink", "cyan"}
	for i, match := range matches {
		matchNumber := i + 1
		color := colors[matchNumber%len(colors)]
		
		_, err = h.db.Exec(`
			INSERT INTO velvet_hour_matches 
			(session_id, round_number, user1_id, user2_id, match_number, match_color)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, sessionID, roundNumber, match[0], match[1], matchNumber, color)
		
		if err != nil {
			return err
		}
	}

	return nil
}

// findUniquePairings implements a greedy algorithm for unique pairing across rounds
func (h *VelvetHourHandler) findUniquePairings(participants []uuid.UUID, previousPairs map[string]bool) ([][2]uuid.UUID, error) {
	n := len(participants)
	if n < 2 {
		return [][2]uuid.UUID{}, nil
	}

	var matches [][2]uuid.UUID
	used := make(map[uuid.UUID]bool)
	
	// Shuffle participants for randomization
	rand.Seed(time.Now().UnixNano())
	shuffled := make([]uuid.UUID, len(participants))
	copy(shuffled, participants)
	for i := range shuffled {
		j := rand.Intn(i + 1)
		shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
	}

	// Greedy matching: for each unused person, find first available partner they haven't met
	for _, user1 := range shuffled {
		if used[user1] {
			continue
		}
		
		// Find a partner this user hasn't met yet
		for _, user2 := range shuffled {
			if used[user2] || user1 == user2 {
				continue
			}
			
			// Check if this pair has met before
			key := user1.String() + "_" + user2.String()
			if !previousPairs[key] {
				// Found a valid pair
				matches = append(matches, [2]uuid.UUID{user1, user2})
				used[user1] = true
				used[user2] = true
				break
			}
		}
	}

	return matches, nil
}

// EndSession ends the current Velvet Hour session
func (h *VelvetHourHandler) EndSession(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventIDStr := vars["eventId"]
	
	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}

	// Get session ID before ending it
	var sessionID uuid.UUID
	err = h.db.QueryRow(`
		SELECT id FROM velvet_hour_sessions 
		WHERE event_id = $1 AND is_active = true
	`, eventID).Scan(&sessionID)
	
	if err != nil {
		log.Printf("Failed to get session ID: %v", err)
		http.Error(w, "No active session found", http.StatusNotFound)
		return
	}

	// Update session to inactive
	_, err = h.db.Exec(`
		UPDATE velvet_hour_sessions 
		SET is_active = false, ended_at = CURRENT_TIMESTAMP, 
			status = 'completed', updated_at = CURRENT_TIMESTAMP
		WHERE event_id = $1 AND is_active = true
	`, eventID)
	
	if err != nil {
		log.Printf("Failed to end session: %v", err)
		http.Error(w, "Failed to end session", http.StatusInternalServerError)
		return
	}

	// Update event status
	_, err = h.db.Exec(`
		UPDATE events SET the_hour_started = false WHERE id = $1
	`, eventID)
	
	if err != nil {
		log.Printf("Failed to update event status: %v", err)
	}

	// Broadcast session ended event
	if h.hub != nil {
		h.hub.BroadcastToEvent(eventID, services.MessageTypeVelvetHourSessionEnded, map[string]interface{}{
			"sessionId": sessionID,
			"eventId":   eventID,
			"status":    "completed",
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Velvet Hour session ended successfully"})
}

// UpdateEventConfig updates Velvet Hour configuration for an event
func (h *VelvetHourHandler) UpdateEventConfig(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventIDStr := vars["eventId"]
	
	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}

	var req models.UpdateVelvetHourConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Build dynamic update query
	updates := []string{}
	args := []interface{}{}
	argIndex := 1

	if req.RoundDuration != nil {
		updates = append(updates, fmt.Sprintf("the_hour_round_duration = $%d", argIndex))
		args = append(args, *req.RoundDuration)
		argIndex++
	}
	if req.BreakDuration != nil {
		updates = append(updates, fmt.Sprintf("the_hour_break_duration = $%d", argIndex))
		args = append(args, *req.BreakDuration)
		argIndex++
	}
	if req.TotalRounds != nil {
		updates = append(updates, fmt.Sprintf("the_hour_total_rounds = $%d", argIndex))
		args = append(args, *req.TotalRounds)
		argIndex++
	}
	// MinParticipants is auto-calculated based on TotalRounds, not user-configurable

	if len(updates) == 0 {
		http.Error(w, "No fields to update", http.StatusBadRequest)
		return
	}

	// Add eventID and updated_at to args
	args = append(args, eventID)
	query := fmt.Sprintf(
		"UPDATE events SET %s, updated_at = CURRENT_TIMESTAMP WHERE id = $%d",
		joinStrings(updates, ", "), argIndex,
	)

	_, err = h.db.Exec(query, args...)
	if err != nil {
		log.Printf("Failed to update event config: %v", err)
		http.Error(w, "Failed to update configuration", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Configuration updated successfully"})
}

// ResetSession deletes all Velvet Hour data for an event
func (h *VelvetHourHandler) ResetSession(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventIDStr := vars["eventId"]
	
	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}

	// Start transaction
	tx, err := h.db.Begin()
	if err != nil {
		log.Printf("Failed to start transaction: %v", err)
		http.Error(w, "Failed to reset session", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Get active session ID first
	var sessionID uuid.UUID
	err = tx.QueryRow(`
		SELECT id FROM velvet_hour_sessions WHERE event_id = $1 AND is_active = true
	`, eventID).Scan(&sessionID)
	
	// If no session exists, that's fine - nothing to reset
	if err != nil && err != sql.ErrNoRows {
		log.Printf("Failed to get session ID: %v", err)
		http.Error(w, "Failed to reset session", http.StatusInternalServerError)
		return
	}
	
	// If session exists, delete all related data
	if err != sql.ErrNoRows {
		// Delete feedback (references matches)
		_, err = tx.Exec(`
			DELETE FROM velvet_hour_feedback 
			WHERE match_id IN (
				SELECT id FROM velvet_hour_matches WHERE session_id = $1
			)
		`, sessionID)
		if err != nil {
			log.Printf("Failed to delete feedback: %v", err)
			http.Error(w, "Failed to reset session", http.StatusInternalServerError)
			return
		}

		// Delete matches
		_, err = tx.Exec(`DELETE FROM velvet_hour_matches WHERE session_id = $1`, sessionID)
		if err != nil {
			log.Printf("Failed to delete matches: %v", err)
			http.Error(w, "Failed to reset session", http.StatusInternalServerError)
			return
		}

		// Delete participants
		_, err = tx.Exec(`DELETE FROM velvet_hour_participants WHERE session_id = $1`, sessionID)
		if err != nil {
			log.Printf("Failed to delete participants: %v", err)
			http.Error(w, "Failed to reset session", http.StatusInternalServerError)
			return
		}

		// Delete session
		_, err = tx.Exec(`DELETE FROM velvet_hour_sessions WHERE id = $1`, sessionID)
		if err != nil {
			log.Printf("Failed to delete session: %v", err)
			http.Error(w, "Failed to reset session", http.StatusInternalServerError)
			return
		}
	}

	// Reset event's the_hour_started flag
	_, err = tx.Exec(`
		UPDATE events 
		SET the_hour_started = false, updated_at = CURRENT_TIMESTAMP 
		WHERE id = $1
	`, eventID)
	if err != nil {
		log.Printf("Failed to reset event flag: %v", err)
		http.Error(w, "Failed to reset session", http.StatusInternalServerError)
		return
	}

	// Commit transaction
	err = tx.Commit()
	if err != nil {
		log.Printf("Failed to commit transaction: %v", err)
		http.Error(w, "Failed to reset session", http.StatusInternalServerError)
		return
	}

	// Broadcast session reset to all participants and admins
	if h.hub != nil {
		// Broadcast session reset notification to all users
		h.hub.BroadcastToEvent(eventID, services.MessageTypeVelvetHourSessionReset, map[string]interface{}{
			"eventId": eventID,
			"message": "The admin has reset the Velvet Hour session. Please refresh your page and rejoin if you'd like to participate.",
			"timestamp": time.Now().Unix(),
		})
		
		// Also broadcast status update for admins
		h.hub.BroadcastToAdmins(eventID, services.MessageTypeVelvetHourStatusUpdate, map[string]interface{}{
			"eventId":        eventID,
			"status":         "reset",
			"sessionActive":  false,
			"theHourStarted": false,
		})
		
		log.Printf("Broadcasted session reset for event %s", eventID)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Velvet Hour session reset successfully"})
}

// GetAttendanceStats returns attendance statistics for the admin panel
func (h *VelvetHourHandler) GetAttendanceStats(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventIDStr := vars["eventId"]
	
	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}

	// Get event configuration
	var totalRounds int
	var theHourStarted bool
	err = h.db.QueryRow(`
		SELECT the_hour_total_rounds, the_hour_started 
		FROM events 
		WHERE id = $1
	`, eventID).Scan(&totalRounds, &theHourStarted)
	
	// Calculate minimum participants based on total rounds (round-robin formula)
	var minParticipants int
	if totalRounds%2 == 0 {
		minParticipants = totalRounds + 1
	} else {
		minParticipants = totalRounds
	}
	
	if err != nil {
		log.Printf("Failed to get event info: %v", err)
		http.Error(w, "Event not found", http.StatusNotFound)
		return
	}

	// Count attending users
	var attendingCount int
	err = h.db.QueryRow(`
		SELECT COUNT(*) 
		FROM event_attendance ea 
		JOIN users u ON ea.user_id = u.id 
		WHERE ea.event_id = $1 AND ea.attending = true AND u.isonboarded = true
	`, eventID).Scan(&attendingCount)
	
	if err != nil {
		log.Printf("Failed to count attending users: %v", err)
		http.Error(w, "Failed to check attendance", http.StatusInternalServerError)
		return
	}

	// Get count of users actually present (WebSocket connected)
	presentCount := 0
	if h.hub != nil {
		presentCount = h.hub.GetPresentUserCount(eventID)
		log.Printf("DEBUG GetAttendanceStats: Hub returned present count: %d for event %s", presentCount, eventID)
	} else {
		log.Printf("DEBUG GetAttendanceStats: Hub is nil for event %s", eventID)
	}

	// Can start when we have minimum participants present AND session hasn't started
	canStart := presentCount >= minParticipants && !theHourStarted

	response := map[string]interface{}{
		"attendingCount":    attendingCount,     // Users marked as attending in DB
		"presentCount":      presentCount,       // Users actually present (WebSocket connected)
		"minParticipants":   minParticipants,    // Minimum needed for round-robin
		"canStart":          canStart,           // Can start when present >= minimum
		"alreadyStarted":    theHourStarted,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetAttendingUsers returns list of users marked as attending
func (h *VelvetHourHandler) GetAttendingUsers(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventIDStr := vars["eventId"]
	
	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}

	// Get users marked as attending
	rows, err := h.db.Query(`
		SELECT u.id, u.name, u.email, u.isonboarded
		FROM event_attendance ea 
		JOIN users u ON ea.user_id = u.id 
		WHERE ea.event_id = $1 AND ea.attending = true AND u.isonboarded = true
		ORDER BY u.name
	`, eventID)
	
	if err != nil {
		log.Printf("Failed to get attending users: %v", err)
		http.Error(w, "Failed to fetch attending users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []map[string]interface{}
	for rows.Next() {
		var user map[string]interface{} = make(map[string]interface{})
		var id uuid.UUID
		var name, email string
		var isOnboarded bool
		
		err := rows.Scan(&id, &name, &email, &isOnboarded)
		if err != nil {
			log.Printf("Failed to scan attending user: %v", err)
			continue
		}
		
		user["id"] = id.String()
		user["name"] = name
		user["email"] = email
		user["isOnboarded"] = isOnboarded
		users = append(users, user)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

// GetPresentUsers returns list of users actually present (WebSocket connected)
func (h *VelvetHourHandler) GetPresentUsers(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventIDStr := vars["eventId"]
	
	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}

	var users []map[string]interface{}
	
	if h.hub != nil {
		// Get list of present user IDs from WebSocket hub
		presentUserIDs := h.hub.GetPresentUsers(eventID)
		
		if len(presentUserIDs) > 0 {
			// Convert UUIDs to strings for the query
			userIDStrings := make([]string, len(presentUserIDs))
			for i, id := range presentUserIDs {
				userIDStrings[i] = id.String()
			}
			
			// Build query with placeholders
			placeholders := make([]string, len(userIDStrings))
			args := make([]interface{}, len(userIDStrings))
			for i, idStr := range userIDStrings {
				placeholders[i] = fmt.Sprintf("$%d", i+1)
				args[i] = idStr
			}
			
			query := fmt.Sprintf(`
				SELECT id, name, email, isonboarded
				FROM users 
				WHERE id IN (%s)
				ORDER BY name
			`, strings.Join(placeholders, ","))
			
			rows, err := h.db.Query(query, args...)
			if err != nil {
				log.Printf("Failed to get present users: %v", err)
				http.Error(w, "Failed to fetch present users", http.StatusInternalServerError)
				return
			}
			defer rows.Close()

			for rows.Next() {
				var user map[string]interface{} = make(map[string]interface{})
				var id uuid.UUID
				var name, email string
				var isOnboarded bool
				
				err := rows.Scan(&id, &name, &email, &isOnboarded)
				if err != nil {
					log.Printf("Failed to scan present user: %v", err)
					continue
				}
				
				user["id"] = id.String()
				user["name"] = name
				user["email"] = email
				user["isOnboarded"] = isOnboarded
				users = append(users, user)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

// ClearWebSocketConnections clears all WebSocket connections for an event (admin only)
func (h *VelvetHourHandler) ClearWebSocketConnections(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventIDStr := vars["eventId"]
	
	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}
	
	if h.hub != nil {
		disconnectedCount := h.hub.ClearAllConnections(eventID)
		
		response := map[string]interface{}{
			"success": true,
			"message": fmt.Sprintf("Cleared %d WebSocket connections", disconnectedCount),
			"disconnectedCount": disconnectedCount,
		}
		
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	} else {
		http.Error(w, "WebSocket hub not available", http.StatusInternalServerError)
	}
}

// GetWebSocketConnections returns current WebSocket connection info for debugging (admin only)
func (h *VelvetHourHandler) GetWebSocketConnections(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventIDStr := vars["eventId"]
	
	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}
	
	if h.hub != nil {
		connectionInfo := h.hub.GetConnectionInfo(eventID)
		
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(connectionInfo)
	} else {
		http.Error(w, "WebSocket hub not available", http.StatusInternalServerError)
	}
}

// TestPresenceUpdate manually triggers a presence update broadcast for testing
func (h *VelvetHourHandler) TestPresenceUpdate(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventIDStr := vars["eventId"]
	
	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}
	
	if h.hub != nil {
		presentCount := h.hub.GetPresentUserCount(eventID)
		log.Printf("DEBUG TestPresenceUpdate: Manual test - eventID: %s, presentCount: %d", eventID, presentCount)
		
		h.hub.BroadcastToAdmins(eventID, services.MessageTypeAttendanceStatsUpdate, map[string]interface{}{
			"presentCount": presentCount,
			"eventId":      eventID,
			"type":         "presence_update",
		})
		
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "Test presence update sent",
			"presentCount": presentCount,
		})
	} else {
		http.Error(w, "WebSocket hub not available", http.StatusInternalServerError)
	}
}

// Helper function to join strings
func joinStrings(strs []string, sep string) string {
	if len(strs) == 0 {
		return ""
	}
	if len(strs) == 1 {
		return strs[0]
	}
	result := strs[0]
	for i := 1; i < len(strs); i++ {
		result += sep + strs[i]
	}
	return result
}