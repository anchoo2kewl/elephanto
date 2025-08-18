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

type EventFAQHandler struct {
	db *sql.DB
}

func NewEventFAQHandler(db *sql.DB) *EventFAQHandler {
	return &EventFAQHandler{db: db}
}

// CreateEventFAQ creates a new event FAQ (admin only)
func (h *EventFAQHandler) CreateEventFAQ(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventID, err := uuid.Parse(vars["eventId"])
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}

	var req models.CreateEventFAQRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	faqID := uuid.New()

	_, err = h.db.Exec(`
		INSERT INTO event_faqs (id, event_id, question, answer, display_order, color_gradient)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, faqID, eventID, req.Question, req.Answer, req.DisplayOrder, req.ColorGradient)

	if err != nil {
		http.Error(w, "Failed to create event FAQ", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":      faqID,
		"message": "Event FAQ created successfully",
	})
}

// UpdateEventFAQ updates an existing event FAQ (admin only)
func (h *EventFAQHandler) UpdateEventFAQ(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventID, err := uuid.Parse(vars["eventId"])
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}
	faqID, err := uuid.Parse(vars["faqId"])
	if err != nil {
		http.Error(w, "Invalid FAQ ID", http.StatusBadRequest)
		return
	}

	var req models.UpdateEventFAQRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Build dynamic update query
	setParts := []string{}
	args := []interface{}{}
	argIndex := 1

	if req.Question != nil {
		setParts = append(setParts, "question = $"+strconv.Itoa(argIndex))
		args = append(args, *req.Question)
		argIndex++
	}
	if req.Answer != nil {
		setParts = append(setParts, "answer = $"+strconv.Itoa(argIndex))
		args = append(args, *req.Answer)
		argIndex++
	}
	if req.DisplayOrder != nil {
		setParts = append(setParts, "display_order = $"+strconv.Itoa(argIndex))
		args = append(args, *req.DisplayOrder)
		argIndex++
	}
	if req.ColorGradient != nil {
		setParts = append(setParts, "color_gradient = $"+strconv.Itoa(argIndex))
		args = append(args, *req.ColorGradient)
		argIndex++
	}

	if len(setParts) == 0 {
		http.Error(w, "No fields to update", http.StatusBadRequest)
		return
	}

	// Add eventID and faqID to args
	args = append(args, eventID, faqID)

	query := "UPDATE event_faqs SET " + setParts[0]
	for i := 1; i < len(setParts); i++ {
		query += ", " + setParts[i]
	}
	query += " WHERE event_id = $" + strconv.Itoa(argIndex) + " AND id = $" + strconv.Itoa(argIndex+1)

	result, err := h.db.Exec(query, args...)
	if err != nil {
		http.Error(w, "Failed to update event FAQ", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Event FAQ not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Event FAQ updated successfully",
	})
}

// DeleteEventFAQ deletes an event FAQ (admin only)
func (h *EventFAQHandler) DeleteEventFAQ(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventID, err := uuid.Parse(vars["eventId"])
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}
	faqID, err := uuid.Parse(vars["faqId"])
	if err != nil {
		http.Error(w, "Invalid FAQ ID", http.StatusBadRequest)
		return
	}

	result, err := h.db.Exec("DELETE FROM event_faqs WHERE event_id = $1 AND id = $2", eventID, faqID)
	if err != nil {
		http.Error(w, "Failed to delete event FAQ", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Event FAQ not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Event FAQ deleted successfully",
	})
}