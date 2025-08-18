package models

import (
	"time"

	"github.com/google/uuid"
)

type CocktailPreference struct {
	ID         uuid.UUID `json:"id" db:"id"`
	UserID     uuid.UUID `json:"userId" db:"userId"`
	Preference string    `json:"preference" db:"preference"`
	CreatedAt  time.Time `json:"createdAt" db:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt" db:"updatedAt"`
}