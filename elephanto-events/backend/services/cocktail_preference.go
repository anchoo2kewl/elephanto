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
	var preference models.CocktailPreference
	
	query := `SELECT id, userId, preference, createdAt, updatedAt FROM cocktail_preferences WHERE userId = $1`
	err := s.db.QueryRow(query, userID).Scan(
		&preference.ID,
		&preference.UserID,
		&preference.Preference,
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
	
	// Try to update existing preference first
	updateQuery := `
		UPDATE cocktail_preferences 
		SET preference = $2, updatedAt = CURRENT_TIMESTAMP 
		WHERE userId = $1 
		RETURNING id, userId, preference, createdAt, updatedAt`
	
	var preference models.CocktailPreference
	err := s.db.QueryRow(updateQuery, userID, preferenceValue).Scan(
		&preference.ID,
		&preference.UserID,
		&preference.Preference,
		&preference.CreatedAt,
		&preference.UpdatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			// No existing preference, create new one
			insertQuery := `
				INSERT INTO cocktail_preferences (userId, preference) 
				VALUES ($1, $2) 
				RETURNING id, userId, preference, createdAt, updatedAt`
			
			err = s.db.QueryRow(insertQuery, userID, preferenceValue).Scan(
				&preference.ID,
				&preference.UserID,
				&preference.Preference,
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