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

	// Extract origin from request for domain-specific magic links
	origin := r.Header.Get("Origin")
	if origin == "" {
		// Fallback to Referer header if Origin is not present
		referer := r.Header.Get("Referer")
		if referer != "" {
			// Extract domain from referer URL
			if len(referer) > 8 && referer[:8] == "https://" {
				if endPos := len(referer); endPos > 8 {
					for i := 8; i < len(referer); i++ {
						if referer[i] == '/' || referer[i] == '?' || referer[i] == '#' {
							endPos = i
							break
						}
					}
					origin = referer[:endPos]
				}
			}
		}
	}

	fmt.Printf("AUTH HANDLER: Processing login request for email: %s from origin: %s\n", req.Email, origin)
	if err := h.authService.RequestLogin(req.Email, origin); err != nil {
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

