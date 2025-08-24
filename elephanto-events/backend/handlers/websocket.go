package handlers

import (
	"elephanto-events/middleware"
	"elephanto-events/services"
	"elephanto-events/utils"
	"log"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// WebSocketHandler handles WebSocket connections
type WebSocketHandler struct {
	hub            *services.Hub
	jwtSecret      string
	tokenValidator middleware.TokenValidator
}

// NewWebSocketHandler creates a new WebSocket handler
func NewWebSocketHandler(hub *services.Hub, jwtSecret string, tokenValidator middleware.TokenValidator) *WebSocketHandler {
	return &WebSocketHandler{
		hub:            hub,
		jwtSecret:      jwtSecret,
		tokenValidator: tokenValidator,
	}
}

// HandleWebSocket handles WebSocket connection requests
func (h *WebSocketHandler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventIDStr := vars["eventId"]
	
	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		http.Error(w, "Invalid event ID", http.StatusBadRequest)
		return
	}

	// Try to get user info from context first (set by auth middleware)
	user, ok := middleware.GetUserFromContext(r)
	
	// If context doesn't have user info, try token from query parameter
	if !ok {
		token := r.URL.Query().Get("token")
		if token == "" {
			http.Error(w, "Authentication required - provide token in header or query parameter", http.StatusUnauthorized)
			return
		}
		
		// Remove Bearer prefix if present
		token = strings.TrimPrefix(token, "Bearer ")
		
		// Check if this is a personal access token
		if strings.HasPrefix(token, "pat_") && h.tokenValidator != nil {
			patUser, err := h.tokenValidator.ValidatePersonalAccessToken(token)
			if err == nil {
				user = patUser
			}
		}
		
		// If not a valid PAT, try JWT validation
		if user == nil {
			claims, err := utils.ValidateJWT(token, h.jwtSecret)
			if err != nil {
				log.Printf("WebSocket token validation failed: %v", err)
				http.Error(w, "Invalid token", http.StatusUnauthorized)
				return
			}
			
			// Create user from claims
			user = &middleware.User{
				ID:    claims.UserID,
				Email: claims.Email,
				Role:  claims.Role,
			}
		}
	}

	isAdmin := user.Role == "admin"
	
	log.Printf("WebSocket connection request: EventID=%s, UserID=%s, IsAdmin=%v", eventID, user.ID, isAdmin)
	
	// Upgrade connection and handle WebSocket
	h.hub.HandleWebSocket(w, r, eventID, user.ID, isAdmin)
}

// GetHub returns the WebSocket hub instance
func (h *WebSocketHandler) GetHub() *services.Hub {
	return h.hub
}