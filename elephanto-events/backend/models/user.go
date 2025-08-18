package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID           uuid.UUID  `json:"id" db:"id"`
	Email        string     `json:"email" db:"email"`
	Name         *string    `json:"name" db:"name"`
	Role         string     `json:"role" db:"role"`
	IsOnboarded  bool       `json:"isOnboarded" db:"isOnboarded"`
	CreatedAt    time.Time  `json:"createdAt" db:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt" db:"updatedAt"`
}

type AuthToken struct {
	ID        uuid.UUID  `json:"id" db:"id"`
	UserID    uuid.UUID  `json:"userId" db:"userId"`
	Token     string     `json:"token" db:"token"`
	ExpiresAt time.Time  `json:"expiresAt" db:"expiresAt"`
	Used      bool       `json:"used" db:"used"`
	UsedAt    *time.Time `json:"usedAt" db:"usedAt"`
	IPAddress *string    `json:"ipAddress" db:"ipAddress"`
	UserAgent *string    `json:"userAgent" db:"userAgent"`
	CreatedAt time.Time  `json:"createdAt" db:"createdAt"`
}

type Session struct {
	ID           uuid.UUID  `json:"id" db:"id"`
	UserID       uuid.UUID  `json:"userId" db:"userId"`
	Token        string     `json:"token" db:"token"`
	ExpiresAt    time.Time  `json:"expiresAt" db:"expiresAt"`
	IPAddress    *string    `json:"ipAddress" db:"ipAddress"`
	UserAgent    *string    `json:"userAgent" db:"userAgent"`
	LastActivity time.Time  `json:"lastActivity" db:"lastActivity"`
	CreatedAt    time.Time  `json:"createdAt" db:"createdAt"`
}

type AdminAuditLog struct {
	ID           uuid.UUID   `json:"id" db:"id"`
	AdminID      *uuid.UUID  `json:"adminId" db:"adminId"`
	TargetUserID *uuid.UUID  `json:"targetUserId" db:"targetUserId"`
	Action       string      `json:"action" db:"action"`
	OldValue     interface{} `json:"oldValue" db:"oldValue"`
	NewValue     interface{} `json:"newValue" db:"newValue"`
	IPAddress    *string     `json:"ipAddress" db:"ipAddress"`
	CreatedAt    time.Time   `json:"createdAt" db:"createdAt"`
}

type LoginRequest struct {
	Email string `json:"email"`
}

type UpdateProfileRequest struct {
	Name        *string    `json:"name"`
}

type UpdateRoleRequest struct {
	Role string `json:"role"`
}

// UserWithDetails includes survey and cocktail data
type UserWithDetails struct {
	User             User                   `json:"user"`
	SurveyResponse   *SurveyResponse        `json:"surveyResponse,omitempty"`
	CocktailPref     *CocktailPreference    `json:"cocktailPreference,omitempty"`
}

// Admin user creation request
type CreateUserRequest struct {
	Email        string  `json:"email" validate:"required,email"`
	Name         *string `json:"name"`
	Role         *string `json:"role"` // defaults to "user"
	IsOnboarded  *bool   `json:"isOnboarded"` // defaults to false
}

// Admin user update request (full profile)
type UpdateUserFullRequest struct {
	Name            *string `json:"name"`
	Role            *string `json:"role"`
	IsOnboarded     *bool   `json:"isOnboarded"`
}