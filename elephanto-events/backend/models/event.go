package models

import (
	"time"

	"github.com/google/uuid"
)

type Event struct {
	ID                        uuid.UUID  `json:"id" db:"id"`
	Title                     string     `json:"title" db:"title"`
	Tagline                   *string    `json:"tagline" db:"tagline"`
	Date                      time.Time  `json:"date" db:"date"`
	Time                      string     `json:"time" db:"time"`
	EntryTime                 *string    `json:"entryTime" db:"entry_time"`
	Location                  string     `json:"location" db:"location"`
	Address                   *string    `json:"address" db:"address"`
	Attire                    *string    `json:"attire" db:"attire"`
	AgeRange                  *string    `json:"ageRange" db:"age_range"`
	Description               *string    `json:"description" db:"description"`
	IsActive                  bool       `json:"isActive" db:"is_active"`
	TicketURL                 *string    `json:"ticketUrl" db:"ticket_url"`
	GoogleMapsEnabled         bool       `json:"googleMapsEnabled" db:"google_maps_enabled"`
	CountdownEnabled          bool       `json:"countdownEnabled" db:"countdown_enabled"`
	CocktailSelectionEnabled  bool       `json:"cocktailSelectionEnabled" db:"cocktail_selection_enabled"`
	SurveyEnabled             bool       `json:"surveyEnabled" db:"survey_enabled"`
	TheHourEnabled            bool       `json:"theHourEnabled" db:"the_hour_enabled"`
	TheHourActiveDate         *time.Time `json:"theHourActiveDate" db:"the_hour_active_date"`
	TheHourLink               *string    `json:"theHourLink" db:"the_hour_link"`
	CreatedAt                 time.Time  `json:"createdAt" db:"created_at"`
	UpdatedAt                 time.Time  `json:"updatedAt" db:"updated_at"`
	CreatedBy                 *uuid.UUID `json:"createdBy" db:"created_by"`
}

type EventDetail struct {
	ID           uuid.UUID `json:"id" db:"id"`
	EventID      uuid.UUID `json:"eventId" db:"event_id"`
	SectionType  string    `json:"sectionType" db:"section_type"`
	Title        *string   `json:"title" db:"title"`
	Content      *string   `json:"content" db:"content"`
	Icon         *string   `json:"icon" db:"icon"`
	DisplayOrder *int      `json:"displayOrder" db:"display_order"`
	ColorScheme  *string   `json:"colorScheme" db:"color_scheme"`
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
}

type EventFAQ struct {
	ID            uuid.UUID `json:"id" db:"id"`
	EventID       uuid.UUID `json:"eventId" db:"event_id"`
	Question      string    `json:"question" db:"question"`
	Answer        string    `json:"answer" db:"answer"`
	DisplayOrder  *int      `json:"displayOrder" db:"display_order"`
	ColorGradient *string   `json:"colorGradient" db:"color_gradient"`
	CreatedAt     time.Time `json:"createdAt" db:"created_at"`
}

// EventWithDetails combines event with its details and FAQs
type EventWithDetails struct {
	Event   Event         `json:"event"`
	Details []EventDetail `json:"details"`
	FAQs    []EventFAQ    `json:"faqs"`
}

// Request/Response models
type CreateEventRequest struct {
	Title                     string     `json:"title" validate:"required"`
	Tagline                   *string    `json:"tagline"`
	Date                      string     `json:"date" validate:"required"` // Format: YYYY-MM-DD
	Time                      string     `json:"time" validate:"required"`
	EntryTime                 *string    `json:"entryTime"`
	Location                  string     `json:"location" validate:"required"`
	Address                   *string    `json:"address"`
	Attire                    *string    `json:"attire"`
	AgeRange                  *string    `json:"ageRange"`
	Description               *string    `json:"description"`
	TicketURL                 *string    `json:"ticketUrl"`
	GoogleMapsEnabled         bool       `json:"googleMapsEnabled"`
	CountdownEnabled          bool       `json:"countdownEnabled"`
	CocktailSelectionEnabled  bool       `json:"cocktailSelectionEnabled"`
	SurveyEnabled             bool       `json:"surveyEnabled"`
	TheHourEnabled            bool       `json:"theHourEnabled"`
	TheHourActiveDate         *time.Time `json:"theHourActiveDate"`
	TheHourLink               *string    `json:"theHourLink"`
}

type UpdateEventRequest struct {
	Title                     *string    `json:"title"`
	Tagline                   *string    `json:"tagline"`
	Date                      *string    `json:"date"` // Format: YYYY-MM-DD
	Time                      *string    `json:"time"`
	EntryTime                 *string    `json:"entryTime"`
	Location                  *string    `json:"location"`
	Address                   *string    `json:"address"`
	Attire                    *string    `json:"attire"`
	AgeRange                  *string    `json:"ageRange"`
	Description               *string    `json:"description"`
	TicketURL                 *string    `json:"ticketUrl"`
	GoogleMapsEnabled         *bool      `json:"googleMapsEnabled"`
	CountdownEnabled          *bool      `json:"countdownEnabled"`
	CocktailSelectionEnabled  *bool      `json:"cocktailSelectionEnabled"`
	SurveyEnabled             *bool      `json:"surveyEnabled"`
	TheHourEnabled            *bool      `json:"theHourEnabled"`
	TheHourActiveDate         *time.Time `json:"theHourActiveDate"`
	TheHourLink               *string    `json:"theHourLink"`
}

type CreateEventDetailRequest struct {
	SectionType  string  `json:"sectionType" validate:"required"`
	Title        *string `json:"title"`
	Content      *string `json:"content"`
	Icon         *string `json:"icon"`
	DisplayOrder *int    `json:"displayOrder"`
	ColorScheme  *string `json:"colorScheme"`
}

type UpdateEventDetailRequest struct {
	SectionType  *string `json:"sectionType"`
	Title        *string `json:"title"`
	Content      *string `json:"content"`
	Icon         *string `json:"icon"`
	DisplayOrder *int    `json:"displayOrder"`
	ColorScheme  *string `json:"colorScheme"`
}

type CreateEventFAQRequest struct {
	Question      string  `json:"question" validate:"required"`
	Answer        string  `json:"answer" validate:"required"`
	DisplayOrder  *int    `json:"displayOrder"`
	ColorGradient *string `json:"colorGradient"`
}

type UpdateEventFAQRequest struct {
	Question      *string `json:"question"`
	Answer        *string `json:"answer"`
	DisplayOrder  *int    `json:"displayOrder"`
	ColorGradient *string `json:"colorGradient"`
}