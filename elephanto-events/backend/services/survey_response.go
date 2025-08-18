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
	var response models.SurveyResponse
	
	query := `
		SELECT id, userId, fullName, email, age, gender, torontoMeaning, 
			   personality, connectionType, instagramHandle, howHeardAboutUs, 
			   createdAt, updatedAt 
		FROM survey_responses 
		WHERE userId = $1`
	
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
	
	// Insert new response
	insertQuery := `
		INSERT INTO survey_responses (
			userId, fullName, email, age, gender, torontoMeaning, 
			personality, connectionType, instagramHandle, howHeardAboutUs
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
		RETURNING id, userId, fullName, email, age, gender, torontoMeaning, 
				  personality, connectionType, instagramHandle, howHeardAboutUs, 
				  createdAt, updatedAt`
	
	var response models.SurveyResponse
	err = s.db.QueryRow(insertQuery, 
		userID, req.FullName, req.Email, req.Age, req.Gender, req.TorontoMeaning,
		req.Personality, req.ConnectionType, req.InstagramHandle, req.HowHeardAboutUs,
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
		&response.CreatedAt,
		&response.UpdatedAt,
	)
	
	if err != nil {
		log.Printf("Failed to insert survey response: %v", err)
		return nil, fmt.Errorf("failed to save survey response: %w", err)
	}
	
	return &response, nil
}