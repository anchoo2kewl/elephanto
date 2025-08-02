package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID           uuid.UUID  `json:"id" db:"id"`
	Email        string     `json:"email" db:"email"`
	Name         *string    `json:"name" db:"name"`
	DateOfBirth  *time.Time `json:"dateOfBirth" db:"dateOfBirth"`
	CurrentCity  *string    `json:"currentCity" db:"currentCity"`
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
	DateOfBirth *time.Time `json:"dateOfBirth"`
	CurrentCity *string    `json:"currentCity"`
}

type UpdateRoleRequest struct {
	Role string `json:"role"`
}