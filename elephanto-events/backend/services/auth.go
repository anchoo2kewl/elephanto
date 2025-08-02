package services

import (
	"database/sql"
	"elephanto-events/models"
	"elephanto-events/utils"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type AuthService struct {
	db           *sql.DB
	emailService *EmailService
	jwtSecret    string
}

func NewAuthService(db *sql.DB, emailService *EmailService, jwtSecret string) *AuthService {
	return &AuthService{
		db:           db,
		emailService: emailService,
		jwtSecret:    jwtSecret,
	}
}

func (a *AuthService) RequestLogin(email string) error {
	user, err := a.getOrCreateUser(email)
	if err != nil {
		return fmt.Errorf("failed to get or create user: %w", err)
	}

	token, err := utils.GenerateSecureToken()
	if err != nil {
		return fmt.Errorf("failed to generate token: %w", err)
	}

	expiresAt := time.Now().Add(15 * time.Minute)

	_, err = a.db.Exec(`
		INSERT INTO authTokens (userId, token, expiresAt)
		VALUES ($1, $2, $3)
	`, user.ID, token, expiresAt)
	if err != nil {
		return fmt.Errorf("failed to store auth token: %w", err)
	}

	fmt.Printf("Calling email service to send magic link to %s with token %s\n", email, token)
	if err := a.emailService.SendMagicLink(email, token); err != nil {
		fmt.Printf("Email service returned error: %v\n", err)
		return fmt.Errorf("failed to send magic link: %w", err)
	}
	fmt.Printf("Email service completed successfully\n")

	return nil
}

func (a *AuthService) VerifyToken(token, ipAddress, userAgent string) (*models.User, string, error) {
	var authToken models.AuthToken
	var user models.User

	fmt.Printf("AUTH SERVICE: Verifying token: %s\n", token)
	fmt.Printf("AUTH SERVICE: Current time: %s\n", time.Now().Format(time.RFC3339))

	err := a.db.QueryRow(`
		SELECT at.id, at.userId, at.token, at.expiresAt, at.used,
		       u.id, u.email, u.name, u.dateOfBirth, u.currentCity, u.role, u.isOnboarded, u.createdAt, u.updatedAt
		FROM authTokens at
		JOIN users u ON at.userId = u.id
		WHERE at.token = $1 AND at.used = FALSE AND at.expiresAt > $2
	`, token, time.Now()).Scan(
		&authToken.ID, &authToken.UserID, &authToken.Token, &authToken.ExpiresAt, &authToken.Used,
		&user.ID, &user.Email, &user.Name, &user.DateOfBirth, &user.CurrentCity, &user.Role, &user.IsOnboarded, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			fmt.Printf("AUTH SERVICE: No matching token found in database\n")
			return nil, "", fmt.Errorf("invalid or expired token")
		}
		fmt.Printf("AUTH SERVICE: Database error: %v\n", err)
		return nil, "", fmt.Errorf("failed to verify token: %w", err)
	}

	fmt.Printf("AUTH SERVICE: Token found, expires at: %s, used: %t\n", authToken.ExpiresAt.Format(time.RFC3339), authToken.Used)

	tx, err := a.db.Begin()
	if err != nil {
		return nil, "", fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		UPDATE authTokens 
		SET used = TRUE, usedAt = $1, ipAddress = $2, userAgent = $3
		WHERE id = $4
	`, time.Now(), ipAddress, userAgent, authToken.ID)
	if err != nil {
		return nil, "", fmt.Errorf("failed to mark token as used: %w", err)
	}

	sessionToken, err := utils.GenerateSecureToken()
	if err != nil {
		return nil, "", fmt.Errorf("failed to generate session token: %w", err)
	}

	sessionExpiresAt := time.Now().Add(24 * time.Hour)
	_, err = tx.Exec(`
		INSERT INTO sessions (userId, token, expiresAt, ipAddress, userAgent)
		VALUES ($1, $2, $3, $4, $5)
	`, user.ID, sessionToken, sessionExpiresAt, ipAddress, userAgent)
	if err != nil {
		return nil, "", fmt.Errorf("failed to create session: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, "", fmt.Errorf("failed to commit transaction: %w", err)
	}

	jwtToken, err := utils.GenerateJWT(user.ID, user.Email, user.Role, a.jwtSecret)
	if err != nil {
		return nil, "", fmt.Errorf("failed to generate JWT: %w", err)
	}

	return &user, jwtToken, nil
}

func (a *AuthService) ValidateSession(sessionToken string) (*models.User, error) {
	var user models.User
	err := a.db.QueryRow(`
		SELECT u.id, u.email, u.name, u.dateOfBirth, u.currentCity, u.role, u.isOnboarded, u.createdAt, u.updatedAt
		FROM sessions s
		JOIN users u ON s.userId = u.id
		WHERE s.token = $1 AND s.expiresAt > $2
	`, sessionToken, time.Now()).Scan(
		&user.ID, &user.Email, &user.Name, &user.DateOfBirth, &user.CurrentCity, &user.Role, &user.IsOnboarded, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("invalid session")
		}
		return nil, fmt.Errorf("failed to validate session: %w", err)
	}

	_, err = a.db.Exec(`
		UPDATE sessions SET lastActivity = $1 WHERE token = $2
	`, time.Now(), sessionToken)
	if err != nil {
		return nil, fmt.Errorf("failed to update session activity: %w", err)
	}

	return &user, nil
}

func (a *AuthService) Logout(sessionToken string) error {
	_, err := a.db.Exec(`DELETE FROM sessions WHERE token = $1`, sessionToken)
	if err != nil {
		return fmt.Errorf("failed to delete session: %w", err)
	}
	return nil
}

func (a *AuthService) GetUserByID(userID string) (*models.User, error) {
	var user models.User
	err := a.db.QueryRow(`
		SELECT id, email, name, dateOfBirth, currentCity, role, isOnboarded, createdAt, updatedAt
		FROM users WHERE id = $1
	`, userID).Scan(
		&user.ID, &user.Email, &user.Name, &user.DateOfBirth, &user.CurrentCity, &user.Role, &user.IsOnboarded, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to fetch user: %w", err)
	}
	return &user, nil
}

func (a *AuthService) getOrCreateUser(email string) (*models.User, error) {
	var user models.User
	err := a.db.QueryRow(`
		SELECT id, email, name, dateOfBirth, currentCity, role, isOnboarded, createdAt, updatedAt
		FROM users WHERE email = $1
	`, email).Scan(
		&user.ID, &user.Email, &user.Name, &user.DateOfBirth, &user.CurrentCity, &user.Role, &user.IsOnboarded, &user.CreatedAt, &user.UpdatedAt,
	)

	if err == nil {
		return &user, nil
	}

	if err != sql.ErrNoRows {
		return nil, fmt.Errorf("failed to check existing user: %w", err)
	}

	newUserID := uuid.New()
	_, err = a.db.Exec(`
		INSERT INTO users (id, email, role, isOnboarded)
		VALUES ($1, $2, 'user', FALSE)
	`, newUserID, email)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return &models.User{
		ID:          newUserID,
		Email:       email,
		Role:        "user",
		IsOnboarded: false,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}, nil
}