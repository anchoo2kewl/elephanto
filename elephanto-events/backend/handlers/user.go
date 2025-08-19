package handlers

import (
	"database/sql"
	"elephanto-events/middleware"
	"encoding/json"
	"fmt"
	"log"
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
	log.Printf("UpdateProfile: Starting request")
	
	user, ok := middleware.GetUserFromContext(r)
	if !ok {
		log.Printf("UpdateProfile: User not found in context")
		http.Error(w, "User not found", http.StatusInternalServerError)
		return
	}
	log.Printf("UpdateProfile: User found - ID: %v, Email: %s", user.ID, user.Email)

	var req UpdateProfileRequestForm
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("UpdateProfile: Failed to decode request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	log.Printf("UpdateProfile: Request decoded - Name: %v", req.Name)

	query := `
		UPDATE users 
		SET name = $1, isonboarded = TRUE, updatedat = CURRENT_TIMESTAMP
		WHERE id = $2
		RETURNING id, email, name, role, isonboarded, createdat, updatedat
	`

	var updatedUser struct {
		ID          string  `json:"id"`
		Email       string  `json:"email"`
		Name        *string `json:"name"`
		Role        string  `json:"role"`
		IsOnboarded bool    `json:"isOnboarded"`
		CreatedAt   string  `json:"createdAt"`
		UpdatedAt   string  `json:"updatedAt"`
	}

	log.Printf("UpdateProfile: Executing query with Name: %v, UserID: %v", req.Name, user.ID)
	err := h.db.QueryRow(query, req.Name, user.ID).Scan(
		&updatedUser.ID, &updatedUser.Email, &updatedUser.Name, 
		&updatedUser.Role, &updatedUser.IsOnboarded, 
		&updatedUser.CreatedAt, &updatedUser.UpdatedAt,
	)
	if err != nil {
		log.Printf("UpdateProfile: Database error: %v", err)
		http.Error(w, fmt.Sprintf("Failed to update profile: %v", err), http.StatusInternalServerError)
		return
	}
	log.Printf("UpdateProfile: Successfully updated user")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedUser)
}