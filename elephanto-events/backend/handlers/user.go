package handlers

import (
	"database/sql"
	"elephanto-events/middleware"
	"encoding/json"
	"net/http"
)

type UserHandler struct {
	db *sql.DB
}

func NewUserHandler(db *sql.DB) *UserHandler {
	return &UserHandler{db: db}
}

type UpdateProfileRequestForm struct {
	Name        *string `json:"name"`
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

	query := `
		UPDATE users 
		SET name = $1, isOnboarded = TRUE, updatedAt = CURRENT_TIMESTAMP
		WHERE id = $2
		RETURNING name, isOnboarded, updatedAt
	`

	err := h.db.QueryRow(query, req.Name, user.ID).Scan(
		&user.Name, &user.IsOnboarded, &user.UpdatedAt,
	)
	if err != nil {
		http.Error(w, "Failed to update profile", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}