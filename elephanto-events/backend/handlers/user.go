package handlers

import (
	"database/sql"
	"elephanto-events/middleware"
	"encoding/json"
	"net/http"
	"time"
)

type UserHandler struct {
	db *sql.DB
}

func NewUserHandler(db *sql.DB) *UserHandler {
	return &UserHandler{db: db}
}

type UpdateProfileRequestForm struct {
	Name        *string `json:"name"`
	DateOfBirth *string `json:"dateOfBirth"` // Accept as string from frontend
	CurrentCity *string `json:"currentCity"`
}

func (h *UserHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r)
	if !ok {
		http.Error(w, "User not found", http.StatusInternalServerError)
		return
	}

	var req UpdateProfileRequestForm
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Convert string date to time.Time if provided
	var dateOfBirth *time.Time
	if req.DateOfBirth != nil && *req.DateOfBirth != "" {
		if parsed, err := time.Parse("2006-01-02", *req.DateOfBirth); err == nil {
			dateOfBirth = &parsed
		} else {
			http.Error(w, "Invalid date format. Use YYYY-MM-DD", http.StatusBadRequest)
			return
		}
	}

	query := `
		UPDATE users 
		SET name = $1, dateOfBirth = $2, currentCity = $3, isOnboarded = TRUE, updatedAt = CURRENT_TIMESTAMP
		WHERE id = $4
		RETURNING name, dateOfBirth, currentCity, isOnboarded, updatedAt
	`

	err := h.db.QueryRow(query, req.Name, dateOfBirth, req.CurrentCity, user.ID).Scan(
		&user.Name, &user.DateOfBirth, &user.CurrentCity, &user.IsOnboarded, &user.UpdatedAt,
	)
	if err != nil {
		http.Error(w, "Failed to update profile", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}