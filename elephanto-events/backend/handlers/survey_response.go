package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"elephanto-events/middleware"
	"elephanto-events/models"
	"elephanto-events/services"
)

type SurveyResponseHandler struct {
	surveyService *services.SurveyResponseService
}

func NewSurveyResponseHandler(db *sql.DB) *SurveyResponseHandler {
	return &SurveyResponseHandler{
		surveyService: services.NewSurveyResponseService(db),
	}
}

type CreateSurveyRequest struct {
	FullName         string  `json:"fullName"`
	Email            string  `json:"email"`
	Age              int     `json:"age"`
	Gender           string  `json:"gender"`
	TorontoMeaning   string  `json:"torontoMeaning"`
	Personality      string  `json:"personality"`
	ConnectionType   string  `json:"connectionType"`
	InstagramHandle  *string `json:"instagramHandle"`
	HowHeardAboutUs  string  `json:"howHeardAboutUs"`
}

func (h *SurveyResponseHandler) GetSurveyResponse(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r)
	if !ok {
		http.Error(w, "User not authenticated", http.StatusUnauthorized)
		return
	}

	response, err := h.surveyService.GetResponse(user.ID)
	if err != nil {
		http.Error(w, "Failed to get survey response", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	
	if response == nil {
		// Return null if no response exists
		w.Write([]byte("null"))
		return
	}
	
	json.NewEncoder(w).Encode(response)
}

func (h *SurveyResponseHandler) CreateSurveyResponse(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r)
	if !ok {
		http.Error(w, "User not authenticated", http.StatusUnauthorized)
		return
	}

	var req CreateSurveyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.FullName == "" || req.Email == "" || req.Gender == "" || 
	   req.TorontoMeaning == "" || req.Personality == "" || 
	   req.ConnectionType == "" || req.HowHeardAboutUs == "" {
		http.Error(w, "All required fields must be provided", http.StatusBadRequest)
		return
	}

	// Create survey response model
	surveyReq := &models.SurveyResponse{
		FullName:         req.FullName,
		Email:            req.Email,
		Age:              req.Age,
		Gender:           req.Gender,
		TorontoMeaning:   req.TorontoMeaning,
		Personality:      req.Personality,
		ConnectionType:   req.ConnectionType,
		InstagramHandle:  req.InstagramHandle,
		HowHeardAboutUs:  req.HowHeardAboutUs,
	}

	response, err := h.surveyService.CreateResponse(user.ID, surveyReq)
	if err != nil {
		if err.Error() == "survey already completed - responses cannot be modified" {
			http.Error(w, err.Error(), http.StatusConflict)
			return
		}
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}