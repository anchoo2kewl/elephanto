package models

import (
	"time"

	"github.com/google/uuid"
)

type SurveyResponse struct {
	ID               uuid.UUID `json:"id" db:"id"`
	UserID           uuid.UUID `json:"userId" db:"userId"`
	FullName         string    `json:"fullName" db:"fullName"`
	Email            string    `json:"email" db:"email"`
	Age              int       `json:"age" db:"age"`
	Gender           string    `json:"gender" db:"gender"`
	TorontoMeaning   string    `json:"torontoMeaning" db:"torontoMeaning"`
	Personality      string    `json:"personality" db:"personality"`
	ConnectionType   string    `json:"connectionType" db:"connectionType"`
	InstagramHandle  *string   `json:"instagramHandle" db:"instagramHandle"`
	HowHeardAboutUs  string     `json:"howHeardAboutUs" db:"howHeardAboutUs"`
	EventID          uuid.UUID `json:"eventId" db:"event_id"`
	EventName        string    `json:"eventName,omitempty" db:"event_name"`
	CreatedAt        time.Time  `json:"createdAt" db:"createdAt"`
	UpdatedAt        time.Time  `json:"updatedAt" db:"updatedAt"`
}