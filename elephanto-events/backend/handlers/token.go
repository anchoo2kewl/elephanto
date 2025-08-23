package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"elephanto-events/middleware"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

type TokenHandler struct {
	db *sql.DB
}

func NewTokenHandler(db *sql.DB) *TokenHandler {
	return &TokenHandler{db: db}
}

// PersonalAccessToken represents a personal access token
type PersonalAccessToken struct {
	ID          string     `json:"id"`
	UserID      string     `json:"userId"`
	Name        string     `json:"name"`
	TokenHash   string     `json:"-"` // Never expose the hash
	LastUsedAt  *time.Time `json:"lastUsedAt"`
	ExpiresAt   *time.Time `json:"expiresAt"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

// CreateTokenRequest represents the request to create a new token
type CreateTokenRequest struct {
	Name      string `json:"name"`
	ExpiresIn int    `json:"expiresIn"` // Days (0 = never expires)
}

// CreateTokenResponse represents the response when creating a token
type CreateTokenResponse struct {
	Token  string               `json:"token"`  // Raw token (only shown once)
	Detail PersonalAccessToken `json:"detail"` // Token details
}

// generateSecureToken generates a cryptographically secure random token
func generateSecureToken() (string, error) {
	// Generate 32 random bytes
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	// Encode as hexadecimal with a prefix to identify it as a PAT
	return "pat_" + hex.EncodeToString(bytes), nil
}

// hashToken creates a SHA256 hash of the token for storage
func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

// ListTokens returns all personal access tokens for the current user (admin only)
func (h *TokenHandler) ListTokens(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r)
	if !ok {
		http.Error(w, "User not found", http.StatusInternalServerError)
		return
	}

	query := `
		SELECT id, user_id, name, last_used_at, expires_at, created_at, updated_at
		FROM personal_access_tokens 
		WHERE user_id = $1 
		ORDER BY created_at DESC
	`

	rows, err := h.db.Query(query, user.ID)
	if err != nil {
		log.Printf("Failed to query personal access tokens: %v", err)
		http.Error(w, "Failed to fetch tokens", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var tokens []PersonalAccessToken
	for rows.Next() {
		var token PersonalAccessToken
		var userID uuid.UUID
		var lastUsedAt, expiresAt *time.Time

		err := rows.Scan(
			&token.ID,
			&userID,
			&token.Name,
			&lastUsedAt,
			&expiresAt,
			&token.CreatedAt,
			&token.UpdatedAt,
		)
		if err != nil {
			log.Printf("Failed to scan token row: %v", err)
			continue
		}

		token.UserID = userID.String()
		token.LastUsedAt = lastUsedAt
		token.ExpiresAt = expiresAt
		tokens = append(tokens, token)
	}

	if err = rows.Err(); err != nil {
		log.Printf("Error during token rows iteration: %v", err)
		http.Error(w, "Failed to process tokens", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tokens)
}

// CreateToken creates a new personal access token (admin only)
func (h *TokenHandler) CreateToken(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r)
	if !ok {
		http.Error(w, "User not found", http.StatusInternalServerError)
		return
	}

	var req CreateTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate request
	if req.Name == "" {
		http.Error(w, "Token name is required", http.StatusBadRequest)
		return
	}

	if len(req.Name) > 255 {
		http.Error(w, "Token name too long", http.StatusBadRequest)
		return
	}

	// Check if user already has a token with this name
	var existingCount int
	err := h.db.QueryRow("SELECT COUNT(*) FROM personal_access_tokens WHERE user_id = $1 AND name = $2", user.ID, req.Name).Scan(&existingCount)
	if err != nil {
		log.Printf("Failed to check existing token: %v", err)
		http.Error(w, "Failed to create token", http.StatusInternalServerError)
		return
	}

	if existingCount > 0 {
		http.Error(w, "Token with this name already exists", http.StatusConflict)
		return
	}

	// Generate token
	rawToken, err := generateSecureToken()
	if err != nil {
		log.Printf("Failed to generate token: %v", err)
		http.Error(w, "Failed to create token", http.StatusInternalServerError)
		return
	}

	// Hash token for storage
	tokenHash := hashToken(rawToken)

	// Calculate expiration
	var expiresAt *time.Time
	if req.ExpiresIn > 0 {
		expiry := time.Now().Add(time.Duration(req.ExpiresIn) * 24 * time.Hour)
		expiresAt = &expiry
	}

	// Store in database
	var tokenID string
	err = h.db.QueryRow(`
		INSERT INTO personal_access_tokens (user_id, name, token_hash, expires_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`, user.ID, req.Name, tokenHash, expiresAt).Scan(&tokenID)

	if err != nil {
		log.Printf("Failed to create token: %v", err)
		http.Error(w, "Failed to create token", http.StatusInternalServerError)
		return
	}

	// Get the created token details
	var token PersonalAccessToken
	err = h.db.QueryRow(`
		SELECT id, user_id, name, last_used_at, expires_at, created_at, updated_at
		FROM personal_access_tokens 
		WHERE id = $1
	`, tokenID).Scan(
		&token.ID,
		&token.UserID,
		&token.Name,
		&token.LastUsedAt,
		&token.ExpiresAt,
		&token.CreatedAt,
		&token.UpdatedAt,
	)

	if err != nil {
		log.Printf("Failed to fetch created token: %v", err)
		http.Error(w, "Failed to create token", http.StatusInternalServerError)
		return
	}

	// Log admin action
	_, err = h.db.Exec(`
		INSERT INTO adminauditlogs (adminid, targetuserid, action, oldvalue, newvalue, ipaddress)
		VALUES ($1, $1, 'token_create', '{}'::jsonb, $2::jsonb, $3)
	`, user.ID, fmt.Sprintf(`{"token_name": "%s", "expires_at": "%v"}`, req.Name, expiresAt), getClientIP(r))
	if err != nil {
		log.Printf("Failed to log token creation: %v", err)
		// Don't fail the request, just log the error
	}

	response := CreateTokenResponse{
		Token:  rawToken,
		Detail: token,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// DeleteToken deletes a personal access token (admin only)
func (h *TokenHandler) DeleteToken(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r)
	if !ok {
		http.Error(w, "User not found", http.StatusInternalServerError)
		return
	}

	vars := mux.Vars(r)
	tokenID := vars["id"]

	if tokenID == "" {
		http.Error(w, "Token ID is required", http.StatusBadRequest)
		return
	}

	// Get token details before deletion for audit log
	var tokenName string
	err := h.db.QueryRow("SELECT name FROM personal_access_tokens WHERE id = $1 AND user_id = $2", tokenID, user.ID).Scan(&tokenName)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Token not found", http.StatusNotFound)
			return
		}
		log.Printf("Failed to fetch token for deletion: %v", err)
		http.Error(w, "Failed to delete token", http.StatusInternalServerError)
		return
	}

	// Delete token
	result, err := h.db.Exec("DELETE FROM personal_access_tokens WHERE id = $1 AND user_id = $2", tokenID, user.ID)
	if err != nil {
		log.Printf("Failed to delete token: %v", err)
		http.Error(w, "Failed to delete token", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Token not found", http.StatusNotFound)
		return
	}

	// Log admin action
	_, err = h.db.Exec(`
		INSERT INTO adminauditlogs (adminid, targetuserid, action, oldvalue, newvalue, ipaddress)
		VALUES ($1, $1, 'token_delete', $2::jsonb, '{}'::jsonb, $3)
	`, user.ID, fmt.Sprintf(`{"token_name": "%s"}`, tokenName), getClientIP(r))
	if err != nil {
		log.Printf("Failed to log token deletion: %v", err)
		// Don't fail the request, just log the error
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Token deleted successfully",
	})
}

// ValidatePersonalAccessToken validates a personal access token and returns the user
func (h *TokenHandler) ValidatePersonalAccessToken(token string) (*middleware.User, error) {
	// Check if this looks like a personal access token
	if !strings.HasPrefix(token, "pat_") {
		return nil, fmt.Errorf("not a personal access token")
	}

	// Hash the token to match against stored hashes
	tokenHash := hashToken(token)

	// Query for the token and associated user
	query := `
		SELECT u.id, u.email, u.name, u.role, pat.id as token_id, pat.expires_at
		FROM personal_access_tokens pat
		INNER JOIN users u ON pat.user_id = u.id
		WHERE pat.token_hash = $1
		AND (pat.expires_at IS NULL OR pat.expires_at > NOW())
	`

	var user middleware.User
	var tokenID string
	var expiresAt *time.Time

	err := h.db.QueryRow(query, tokenHash).Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.Role,
		&tokenID,
		&expiresAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("invalid or expired token")
		}
		return nil, fmt.Errorf("database error: %v", err)
	}

	// Update last_used_at timestamp
	_, err = h.db.Exec("UPDATE personal_access_tokens SET last_used_at = NOW() WHERE id = $1", tokenID)
	if err != nil {
		log.Printf("Failed to update token last_used_at: %v", err)
		// Don't fail auth, just log the error
	}

	return &user, nil
}

// Note: getClientIP is defined in utils.go - using that implementation