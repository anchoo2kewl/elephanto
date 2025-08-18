package services

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/google/uuid"

	"elephanto-events/models"
)

type SurveyResponseService struct {
	db *sql.DB
}

func NewSurveyResponseService(db *sql.DB) *SurveyResponseService {
	return &SurveyResponseService{db: db}
}

func (s *SurveyResponseService) GetResponse(userID uuid.UUID) (*models.SurveyResponse, error) {
	// Get response for the active event
	var response models.SurveyResponse
	
	query := `
		SELECT sr.id, sr.userId, sr.fullName, sr.email, sr.age, sr.gender, sr.torontoMeaning, 
			   sr.personality, sr.connectionType, sr.instagramHandle, sr.howHeardAboutUs, 
			   sr.event_id, sr.createdAt, sr.updatedAt 
		FROM survey_responses sr
		JOIN events e ON sr.event_id = e.id
		WHERE sr.userId = $1 AND e.is_active = true`
	
	err := s.db.QueryRow(query, userID).Scan(
		&response.ID,
		&response.UserID,
		&response.FullName,
		&response.Email,
		&response.Age,
		&response.Gender,
		&response.TorontoMeaning,
		&response.Personality,
		&response.ConnectionType,
		&response.InstagramHandle,
		&response.HowHeardAboutUs,
		&response.EventID,
		&response.CreatedAt,
		&response.UpdatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // No response found, return nil
		}
		return nil, fmt.Errorf("failed to get survey response: %w", err)
	}
	
	return &response, nil
}

func (s *SurveyResponseService) CreateResponse(userID uuid.UUID, req *models.SurveyResponse) (*models.SurveyResponse, error) {
	// Check if user already has a response
	existing, err := s.GetResponse(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing response: %w", err)
	}
	
	if existing != nil {
		return nil, fmt.Errorf("survey already completed - responses cannot be modified")
	}
	
	// Validate required fields
	if req.FullName == "" || req.Email == "" || req.Age < 18 || req.Age > 100 {
		return nil, fmt.Errorf("invalid survey data provided")
	}
	
	// Validate enum values
	validGenders := map[string]bool{"Male": true, "Female": true, "Other": true}
	if !validGenders[req.Gender] {
		return nil, fmt.Errorf("invalid gender value")
	}
	
	validTorontoMeanings := map[string]bool{
		"new_beginning": true, "temporary_stop": true, "place_to_visit": true, 
		"land_of_opportunity": true, "home": true,
	}
	if !validTorontoMeanings[req.TorontoMeaning] {
		return nil, fmt.Errorf("invalid toronto meaning value")
	}
	
	validPersonalities := map[string]bool{
		"Ambitious": true, "Adventurous": true, "Balanced": true, 
		"Intentional": true, "Social": true,
	}
	if !validPersonalities[req.Personality] {
		return nil, fmt.Errorf("invalid personality value")
	}
	
	validConnectionTypes := map[string]bool{
		"Dating": true, "Friendship": true, "Professional": true,
	}
	if !validConnectionTypes[req.ConnectionType] {
		return nil, fmt.Errorf("invalid connection type value")
	}
	
	validHowHeard := map[string]bool{
		"Instagram": true, "Event Brite": true, "Friends/Family": true, "Facebook": true,
	}
	if !validHowHeard[req.HowHeardAboutUs] {
		return nil, fmt.Errorf("invalid how heard about us value")
	}
	
	// Get the active event ID
	var activeEventID uuid.UUID
	err = s.db.QueryRow("SELECT id FROM events WHERE is_active = true LIMIT 1").Scan(&activeEventID)
	if err != nil {
		return nil, fmt.Errorf("no active event found: %w", err)
	}
	
	// Insert new response
	insertQuery := `
		INSERT INTO survey_responses (
			userId, fullName, email, age, gender, torontoMeaning, 
			personality, connectionType, instagramHandle, howHeardAboutUs, event_id
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
		RETURNING id, userId, fullName, email, age, gender, torontoMeaning, 
				  personality, connectionType, instagramHandle, howHeardAboutUs, 
				  event_id, createdAt, updatedAt`
	
	var response models.SurveyResponse
	err = s.db.QueryRow(insertQuery, 
		userID, req.FullName, req.Email, req.Age, req.Gender, req.TorontoMeaning,
		req.Personality, req.ConnectionType, req.InstagramHandle, req.HowHeardAboutUs, activeEventID,
	).Scan(
		&response.ID,
		&response.UserID,
		&response.FullName,
		&response.Email,
		&response.Age,
		&response.Gender,
		&response.TorontoMeaning,
		&response.Personality,
		&response.ConnectionType,
		&response.InstagramHandle,
		&response.HowHeardAboutUs,
		&response.EventID,
		&response.CreatedAt,
		&response.UpdatedAt,
	)
	
	if err != nil {
		log.Printf("Failed to insert survey response: %v", err)
		return nil, fmt.Errorf("failed to save survey response: %w", err)
	}
	
	return &response, nil
}