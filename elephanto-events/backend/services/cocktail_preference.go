package services

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/google/uuid"

	"elephanto-events/models"
)

type CocktailPreferenceService struct {
	db *sql.DB
}

func NewCocktailPreferenceService(db *sql.DB) *CocktailPreferenceService {
	return &CocktailPreferenceService{db: db}
}

func (s *CocktailPreferenceService) GetPreference(userID uuid.UUID) (*models.CocktailPreference, error) {
	// Get preference for the active event
	var preference models.CocktailPreference
	
	query := `
		SELECT cp.id, cp.userId, cp.preference, cp.event_id, cp.createdAt, cp.updatedAt 
		FROM cocktail_preferences cp
		JOIN events e ON cp.event_id = e.id
		WHERE cp.userId = $1 AND e.is_active = true`
	err := s.db.QueryRow(query, userID).Scan(
		&preference.ID,
		&preference.UserID,
		&preference.Preference,
		&preference.EventID,
		&preference.CreatedAt,
		&preference.UpdatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // No preference found, return nil
		}
		return nil, fmt.Errorf("failed to get cocktail preference: %w", err)
	}
	
	return &preference, nil
}

func (s *CocktailPreferenceService) SavePreference(userID uuid.UUID, preferenceValue string) (*models.CocktailPreference, error) {
	// Validate preference value
	validPreferences := map[string]bool{
		"beer":          true,
		"wine":          true,
		"cocktail":      true,
		"non-alcoholic": true,
	}
	
	if !validPreferences[preferenceValue] {
		return nil, fmt.Errorf("invalid preference value: %s", preferenceValue)
	}
	
	// Get the active event ID
	var activeEventID uuid.UUID
	err := s.db.QueryRow("SELECT id FROM events WHERE is_active = true LIMIT 1").Scan(&activeEventID)
	if err != nil {
		return nil, fmt.Errorf("no active event found: %w", err)
	}
	
	// Try to update existing preference for this event
	updateQuery := `
		UPDATE cocktail_preferences 
		SET preference = $3, updatedAt = CURRENT_TIMESTAMP 
		WHERE userId = $1 AND event_id = $2
		RETURNING id, userId, preference, event_id, createdAt, updatedAt`
	
	var preference models.CocktailPreference
	err = s.db.QueryRow(updateQuery, userID, activeEventID, preferenceValue).Scan(
		&preference.ID,
		&preference.UserID,
		&preference.Preference,
		&preference.EventID,
		&preference.CreatedAt,
		&preference.UpdatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			// No existing preference for this event, create new one
			insertQuery := `
				INSERT INTO cocktail_preferences (userId, preference, event_id) 
				VALUES ($1, $2, $3) 
				RETURNING id, userId, preference, event_id, createdAt, updatedAt`
			
			err = s.db.QueryRow(insertQuery, userID, preferenceValue, activeEventID).Scan(
				&preference.ID,
				&preference.UserID,
				&preference.Preference,
				&preference.EventID,
				&preference.CreatedAt,
				&preference.UpdatedAt,
			)
			if err != nil {
				log.Printf("Failed to insert cocktail preference: %v", err)
				return nil, fmt.Errorf("failed to save cocktail preference: %w", err)
			}
		} else {
			log.Printf("Failed to update cocktail preference: %v", err)
			return nil, fmt.Errorf("failed to update cocktail preference: %w", err)
		}
	}
	
	return &preference, nil
}