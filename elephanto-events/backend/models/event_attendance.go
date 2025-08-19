package models

import (
	"time"

	"github.com/google/uuid"
)

type EventAttendance struct {
	ID        uuid.UUID `json:"id" db:"id"`
	UserID    uuid.UUID `json:"userId" db:"user_id"`
	EventID   uuid.UUID `json:"eventId" db:"event_id"`
	Attending bool      `json:"attending" db:"attending"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`
}

type AttendanceRequest struct {
	Attending bool `json:"attending"`
}

type AttendanceResponse struct {
	Attending bool `json:"attending"`
	Message   string `json:"message"`
}