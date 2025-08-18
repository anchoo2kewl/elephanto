package handlers

import (
	"database/sql"
	"elephanto-events/models"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

type EventDetailHandler struct {
	db *sql.DB
}

func NewEventDetailHandler(db *sql.DB) *EventDetailHandler {
	return &EventDetailHandler{db: db}
}

// CreateEventDetail creates a new event detail section (admin only)
func (h *EventDetailHandler) CreateEventDetail(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventID, err := uuid.Parse(vars["eventId"])
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}

	var req models.CreateEventDetailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	detailID := uuid.New()

	_, err = h.db.Exec(`
		INSERT INTO event_details (id, event_id, section_type, title, content, icon, display_order, color_scheme)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, detailID, eventID, req.SectionType, req.Title, req.Content, req.Icon, req.DisplayOrder, req.ColorScheme)

	if err != nil {
		http.Error(w, "Failed to create event detail", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":      detailID,
		"message": "Event detail created successfully",
	})
}

// UpdateEventDetail updates an existing event detail (admin only)
func (h *EventDetailHandler) UpdateEventDetail(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventID, err := uuid.Parse(vars["eventId"])
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}
	detailID, err := uuid.Parse(vars["detailId"])
	if err != nil {
		http.Error(w, "Invalid detail ID", http.StatusBadRequest)
		return
	}

	var req models.UpdateEventDetailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Build dynamic update query
	setParts := []string{}
	args := []interface{}{}
	argIndex := 1

	if req.SectionType != nil {
		setParts = append(setParts, "section_type = $"+strconv.Itoa(argIndex))
		args = append(args, *req.SectionType)
		argIndex++
	}
	if req.Title != nil {
		setParts = append(setParts, "title = $"+strconv.Itoa(argIndex))
		args = append(args, *req.Title)
		argIndex++
	}
	if req.Content != nil {
		setParts = append(setParts, "content = $"+strconv.Itoa(argIndex))
		args = append(args, *req.Content)
		argIndex++
	}
	if req.Icon != nil {
		setParts = append(setParts, "icon = $"+strconv.Itoa(argIndex))
		args = append(args, *req.Icon)
		argIndex++
	}
	if req.DisplayOrder != nil {
		setParts = append(setParts, "display_order = $"+strconv.Itoa(argIndex))
		args = append(args, *req.DisplayOrder)
		argIndex++
	}
	if req.ColorScheme != nil {
		setParts = append(setParts, "color_scheme = $"+strconv.Itoa(argIndex))
		args = append(args, *req.ColorScheme)
		argIndex++
	}

	if len(setParts) == 0 {
		http.Error(w, "No fields to update", http.StatusBadRequest)
		return
	}

	// Add eventID and detailID to args
	args = append(args, eventID, detailID)

	query := "UPDATE event_details SET " + setParts[0]
	for i := 1; i < len(setParts); i++ {
		query += ", " + setParts[i]
	}
	query += " WHERE event_id = $" + strconv.Itoa(argIndex) + " AND id = $" + strconv.Itoa(argIndex+1)

	result, err := h.db.Exec(query, args...)
	if err != nil {
		http.Error(w, "Failed to update event detail", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Event detail not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Event detail updated successfully",
	})
}

// DeleteEventDetail deletes an event detail (admin only)
func (h *EventDetailHandler) DeleteEventDetail(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventID, err := uuid.Parse(vars["eventId"])
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}
	detailID, err := uuid.Parse(vars["detailId"])
	if err != nil {
		http.Error(w, "Invalid detail ID", http.StatusBadRequest)
		return
	}

	result, err := h.db.Exec("DELETE FROM event_details WHERE event_id = $1 AND id = $2", eventID, detailID)
	if err != nil {
		http.Error(w, "Failed to delete event detail", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Event detail not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Event detail deleted successfully",
	})
}