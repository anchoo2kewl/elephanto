package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"

	"elephanto-events/middleware"
	"elephanto-events/services"
)

type CocktailPreferenceHandler struct {
	cocktailService *services.CocktailPreferenceService
}

func NewCocktailPreferenceHandler(db *sql.DB) *CocktailPreferenceHandler {
	return &CocktailPreferenceHandler{
		cocktailService: services.NewCocktailPreferenceService(db),
	}
}

type SavePreferenceRequest struct {
	Preference string `json:"preference"`
}

func (h *CocktailPreferenceHandler) GetPreference(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r)
	if !ok {
		http.Error(w, "User not authenticated", http.StatusUnauthorized)
		return
	}

	preference, err := h.cocktailService.GetPreference(user.ID)
	if err != nil {
		http.Error(w, "Failed to get preference", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	
	if preference == nil {
		// Return null if no preference exists
		w.Write([]byte("null"))
		return
	}
	
	json.NewEncoder(w).Encode(preference)
}

func (h *CocktailPreferenceHandler) SavePreference(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r)
	if !ok {
		http.Error(w, "User not authenticated", http.StatusUnauthorized)
		return
	}

	var req SavePreferenceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Preference == "" {
		http.Error(w, "Preference is required", http.StatusBadRequest)
		return
	}

	preference, err := h.cocktailService.SavePreference(user.ID, req.Preference)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(preference)
}

func (h *CocktailPreferenceHandler) RegisterRoutes(router *mux.Router, authMiddleware func(http.Handler) http.Handler) {
	router.Handle("/api/cocktail-preference", authMiddleware(http.HandlerFunc(h.GetPreference))).Methods("GET")
	router.Handle("/api/cocktail-preference", authMiddleware(http.HandlerFunc(h.SavePreference))).Methods("POST")
}