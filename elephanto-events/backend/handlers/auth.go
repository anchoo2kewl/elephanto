package handlers

import (
	"elephanto-events/middleware"
	"elephanto-events/models"
	"elephanto-events/services"
	"encoding/json"
	"fmt"
	"net/http"
)

type AuthHandler struct {
	authService *services.AuthService
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (h *AuthHandler) RequestLogin(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Email == "" {
		http.Error(w, "Email is required", http.StatusBadRequest)
		return
	}

	fmt.Printf("AUTH HANDLER: Processing login request for email: %s\n", req.Email)
	if err := h.authService.RequestLogin(req.Email); err != nil {
		fmt.Printf("AUTH HANDLER: Error from auth service: %v\n", err)
		http.Error(w, "Failed to send login link", http.StatusInternalServerError)
		return
	}
	fmt.Printf("AUTH HANDLER: Login request completed successfully\n")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Login link sent to your email",
	})
}

func (h *AuthHandler) VerifyToken(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		http.Error(w, "Token is required", http.StatusBadRequest)
		return
	}

	ipAddress := getClientIP(r)
	userAgent := r.Header.Get("User-Agent")

	user, jwtToken, err := h.authService.VerifyToken(token, ipAddress, userAgent)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user":  user,
		"token": jwtToken,
	})
}

func (h *AuthHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r)
	if !ok {
		http.Error(w, "User not found", http.StatusInternalServerError)
		return
	}

	// Fetch fresh user data from database
	freshUser, err := h.authService.GetUserByID(user.ID.String())
	if err != nil {
		http.Error(w, "Failed to fetch user data", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(freshUser)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Logged out successfully",
	})
}

func getClientIP(r *http.Request) string {
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		return xff
	}
	
	xri := r.Header.Get("X-Real-IP")
	if xri != "" {
		return xri
	}
	
	return r.RemoteAddr
}