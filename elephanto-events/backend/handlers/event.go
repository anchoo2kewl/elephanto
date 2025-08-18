package handlers

import (
	"database/sql"
	"elephanto-events/middleware"
	"elephanto-events/models"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

type EventHandler struct {
	db *sql.DB
}

func NewEventHandler(db *sql.DB) *EventHandler {
	return &EventHandler{db: db}
}

// GetActiveEvent returns the currently active event for public consumption
func (h *EventHandler) GetActiveEvent(w http.ResponseWriter, r *http.Request) {
	var event models.Event
	err := h.db.QueryRow(`
		SELECT id, title, tagline, date, time, entry_time, location, address, attire, age_range, 
		       description, is_active, ticket_url, google_maps_enabled, countdown_enabled, 
		       cocktail_selection_enabled, survey_enabled, the_hour_enabled, the_hour_active_date,
		       created_at, updated_at, created_by
		FROM events 
		WHERE is_active = true
	`).Scan(
		&event.ID, &event.Title, &event.Tagline, &event.Date, &event.Time, &event.EntryTime,
		&event.Location, &event.Address, &event.Attire, &event.AgeRange, &event.Description,
		&event.IsActive, &event.TicketURL, &event.GoogleMapsEnabled, &event.CountdownEnabled,
		&event.CocktailSelectionEnabled, &event.SurveyEnabled, &event.TheHourEnabled,
		&event.TheHourActiveDate, &event.CreatedAt, &event.UpdatedAt, &event.CreatedBy,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "No active event found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to fetch active event", http.StatusInternalServerError)
		return
	}

	// Get event details
	details, err := h.getEventDetails(event.ID)
	if err != nil {
		http.Error(w, "Failed to fetch event details", http.StatusInternalServerError)
		return
	}

	// Get event FAQs
	faqs, err := h.getEventFAQs(event.ID)
	if err != nil {
		http.Error(w, "Failed to fetch event FAQs", http.StatusInternalServerError)
		return
	}

	response := models.EventWithDetails{
		Event:   event,
		Details: details,
		FAQs:    faqs,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Admin-only endpoints below

// GetEvents returns all events (admin only)
func (h *EventHandler) GetEvents(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(`
		SELECT id, title, tagline, date, time, entry_time, location, address, attire, age_range, 
		       description, is_active, ticket_url, google_maps_enabled, countdown_enabled, 
		       cocktail_selection_enabled, survey_enabled, the_hour_enabled, the_hour_active_date, the_hour_link,
		       created_at, updated_at, created_by
		FROM events 
		ORDER BY created_at DESC
	`)
	if err != nil {
		http.Error(w, "Failed to fetch events", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var events []models.Event
	for rows.Next() {
		var event models.Event
		err := rows.Scan(
			&event.ID, &event.Title, &event.Tagline, &event.Date, &event.Time, &event.EntryTime,
			&event.Location, &event.Address, &event.Attire, &event.AgeRange, &event.Description,
			&event.IsActive, &event.TicketURL, &event.GoogleMapsEnabled, &event.CountdownEnabled,
			&event.CocktailSelectionEnabled, &event.SurveyEnabled, &event.TheHourEnabled,
			&event.TheHourActiveDate, &event.TheHourLink, &event.CreatedAt, &event.UpdatedAt, &event.CreatedBy,
		)
		if err != nil {
			http.Error(w, "Failed to scan event", http.StatusInternalServerError)
			return
		}
		events = append(events, event)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}

// GetEvent returns a single event with details (admin only)
func (h *EventHandler) GetEvent(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventID, err := uuid.Parse(vars["id"])
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}

	var event models.Event
	err = h.db.QueryRow(`
		SELECT id, title, tagline, date, time, entry_time, location, address, attire, age_range, 
		       description, is_active, ticket_url, google_maps_enabled, countdown_enabled, 
		       cocktail_selection_enabled, survey_enabled, the_hour_enabled, the_hour_active_date,
		       created_at, updated_at, created_by
		FROM events 
		WHERE id = $1
	`, eventID).Scan(
		&event.ID, &event.Title, &event.Tagline, &event.Date, &event.Time, &event.EntryTime,
		&event.Location, &event.Address, &event.Attire, &event.AgeRange, &event.Description,
		&event.IsActive, &event.TicketURL, &event.GoogleMapsEnabled, &event.CountdownEnabled,
		&event.CocktailSelectionEnabled, &event.SurveyEnabled, &event.TheHourEnabled,
		&event.TheHourActiveDate, &event.CreatedAt, &event.UpdatedAt, &event.CreatedBy,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Event not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to fetch event", http.StatusInternalServerError)
		return
	}

	// Get event details
	details, err := h.getEventDetails(event.ID)
	if err != nil {
		http.Error(w, "Failed to fetch event details", http.StatusInternalServerError)
		return
	}

	// Get event FAQs
	faqs, err := h.getEventFAQs(event.ID)
	if err != nil {
		http.Error(w, "Failed to fetch event FAQs", http.StatusInternalServerError)
		return
	}

	response := models.EventWithDetails{
		Event:   event,
		Details: details,
		FAQs:    faqs,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// CreateEvent creates a new event (admin only)
func (h *EventHandler) CreateEvent(w http.ResponseWriter, r *http.Request) {
	admin, ok := middleware.GetUserFromContext(r)
	if !ok {
		http.Error(w, "Admin not found", http.StatusInternalServerError)
		return
	}

	var req models.CreateEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Parse date
	eventDate, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		http.Error(w, "Invalid date format. Use YYYY-MM-DD", http.StatusBadRequest)
		return
	}

	eventID := uuid.New()

	// Insert event
	_, err = h.db.Exec(`
		INSERT INTO events (
			id, title, tagline, date, time, entry_time, location, address, attire, age_range,
			description, ticket_url, google_maps_enabled, countdown_enabled,
			cocktail_selection_enabled, survey_enabled, the_hour_enabled, the_hour_active_date,
			created_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
	`, eventID, req.Title, req.Tagline, eventDate, req.Time, req.EntryTime, req.Location,
		req.Address, req.Attire, req.AgeRange, req.Description, req.TicketURL,
		req.GoogleMapsEnabled, req.CountdownEnabled, req.CocktailSelectionEnabled,
		req.SurveyEnabled, req.TheHourEnabled, req.TheHourActiveDate, admin.ID)

	if err != nil {
		http.Error(w, "Failed to create event", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":      eventID,
		"message": "Event created successfully",
	})
}

// UpdateEvent updates an existing event (admin only)
func (h *EventHandler) UpdateEvent(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventID, err := uuid.Parse(vars["id"])
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}

	var req models.UpdateEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Build dynamic update query
	setParts := []string{}
	args := []interface{}{}
	argIndex := 1

	if req.Title != nil {
		setParts = append(setParts, "title = $"+strconv.Itoa(argIndex))
		args = append(args, *req.Title)
		argIndex++
	}
	if req.Tagline != nil {
		setParts = append(setParts, "tagline = $"+strconv.Itoa(argIndex))
		args = append(args, *req.Tagline)
		argIndex++
	}
	if req.Date != nil {
		eventDate, err := time.Parse("2006-01-02", *req.Date)
		if err != nil {
			http.Error(w, "Invalid date format. Use YYYY-MM-DD", http.StatusBadRequest)
			return
		}
		setParts = append(setParts, "date = $"+strconv.Itoa(argIndex))
		args = append(args, eventDate)
		argIndex++
	}
	if req.Time != nil {
		setParts = append(setParts, "time = $"+strconv.Itoa(argIndex))
		args = append(args, *req.Time)
		argIndex++
	}
	if req.EntryTime != nil {
		setParts = append(setParts, "entry_time = $"+strconv.Itoa(argIndex))
		args = append(args, *req.EntryTime)
		argIndex++
	}
	if req.Location != nil {
		setParts = append(setParts, "location = $"+strconv.Itoa(argIndex))
		args = append(args, *req.Location)
		argIndex++
	}
	if req.Address != nil {
		setParts = append(setParts, "address = $"+strconv.Itoa(argIndex))
		args = append(args, *req.Address)
		argIndex++
	}
	if req.Attire != nil {
		setParts = append(setParts, "attire = $"+strconv.Itoa(argIndex))
		args = append(args, *req.Attire)
		argIndex++
	}
	if req.AgeRange != nil {
		setParts = append(setParts, "age_range = $"+strconv.Itoa(argIndex))
		args = append(args, *req.AgeRange)
		argIndex++
	}
	if req.Description != nil {
		setParts = append(setParts, "description = $"+strconv.Itoa(argIndex))
		args = append(args, *req.Description)
		argIndex++
	}
	if req.TicketURL != nil {
		setParts = append(setParts, "ticket_url = $"+strconv.Itoa(argIndex))
		args = append(args, *req.TicketURL)
		argIndex++
	}
	if req.GoogleMapsEnabled != nil {
		setParts = append(setParts, "google_maps_enabled = $"+strconv.Itoa(argIndex))
		args = append(args, *req.GoogleMapsEnabled)
		argIndex++
	}
	if req.CountdownEnabled != nil {
		setParts = append(setParts, "countdown_enabled = $"+strconv.Itoa(argIndex))
		args = append(args, *req.CountdownEnabled)
		argIndex++
	}
	if req.CocktailSelectionEnabled != nil {
		setParts = append(setParts, "cocktail_selection_enabled = $"+strconv.Itoa(argIndex))
		args = append(args, *req.CocktailSelectionEnabled)
		argIndex++
	}
	if req.SurveyEnabled != nil {
		setParts = append(setParts, "survey_enabled = $"+strconv.Itoa(argIndex))
		args = append(args, *req.SurveyEnabled)
		argIndex++
	}
	if req.TheHourEnabled != nil {
		setParts = append(setParts, "the_hour_enabled = $"+strconv.Itoa(argIndex))
		args = append(args, *req.TheHourEnabled)
		argIndex++
	}
	if req.TheHourActiveDate != nil {
		setParts = append(setParts, "the_hour_active_date = $"+strconv.Itoa(argIndex))
		args = append(args, *req.TheHourActiveDate)
		argIndex++
	}

	if len(setParts) == 0 {
		http.Error(w, "No fields to update", http.StatusBadRequest)
		return
	}

	// Add updated_at timestamp
	setParts = append(setParts, "updated_at = CURRENT_TIMESTAMP")
	
	// Add eventID to args for WHERE clause
	args = append(args, eventID)
	whereClauseIndex := argIndex

	query := "UPDATE events SET " + setParts[0]
	for i := 1; i < len(setParts)-1; i++ {
		query += ", " + setParts[i]
	}
	query += ", " + setParts[len(setParts)-1] + " WHERE id = $" + strconv.Itoa(whereClauseIndex)

	// Debug logging
	fmt.Printf("Update query: %s\n", query)
	fmt.Printf("Update args: %v\n", args)
	
	_, err = h.db.Exec(query, args...)
	if err != nil {
		fmt.Printf("Database error: %v\n", err)
		http.Error(w, "Failed to update event", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Event updated successfully",
	})
}

// DeleteEvent deletes an event (admin only)
func (h *EventHandler) DeleteEvent(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventID, err := uuid.Parse(vars["id"])
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}

	// Check if event exists
	var exists bool
	err = h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM events WHERE id = $1)", eventID).Scan(&exists)
	if err != nil {
		http.Error(w, "Failed to check event", http.StatusInternalServerError)
		return
	}
	if !exists {
		http.Error(w, "Event not found", http.StatusNotFound)
		return
	}

	// Delete event (CASCADE will handle details and FAQs)
	_, err = h.db.Exec("DELETE FROM events WHERE id = $1", eventID)
	if err != nil {
		http.Error(w, "Failed to delete event", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Event deleted successfully",
	})
}

// ActivateEvent sets an event as the active one (admin only)
func (h *EventHandler) ActivateEvent(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventID, err := uuid.Parse(vars["id"])
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Deactivate all events
	_, err = tx.Exec("UPDATE events SET is_active = false")
	if err != nil {
		http.Error(w, "Failed to deactivate events", http.StatusInternalServerError)
		return
	}

	// Activate the specified event
	result, err := tx.Exec("UPDATE events SET is_active = true WHERE id = $1", eventID)
	if err != nil {
		http.Error(w, "Failed to activate event", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Event not found", http.StatusNotFound)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Event activated successfully",
	})
}

// Helper functions
func (h *EventHandler) getEventDetails(eventID uuid.UUID) ([]models.EventDetail, error) {
	rows, err := h.db.Query(`
		SELECT id, event_id, section_type, title, content, icon, display_order, color_scheme, created_at
		FROM event_details 
		WHERE event_id = $1 
		ORDER BY section_type, display_order
	`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var details []models.EventDetail
	for rows.Next() {
		var detail models.EventDetail
		err := rows.Scan(
			&detail.ID, &detail.EventID, &detail.SectionType, &detail.Title,
			&detail.Content, &detail.Icon, &detail.DisplayOrder, &detail.ColorScheme, &detail.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		details = append(details, detail)
	}

	return details, nil
}

func (h *EventHandler) getEventFAQs(eventID uuid.UUID) ([]models.EventFAQ, error) {
	rows, err := h.db.Query(`
		SELECT id, event_id, question, answer, display_order, color_gradient, created_at
		FROM event_faqs 
		WHERE event_id = $1 
		ORDER BY display_order
	`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var faqs []models.EventFAQ
	for rows.Next() {
		var faq models.EventFAQ
		err := rows.Scan(
			&faq.ID, &faq.EventID, &faq.Question, &faq.Answer,
			&faq.DisplayOrder, &faq.ColorGradient, &faq.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		faqs = append(faqs, faq)
	}

	return faqs, nil
}