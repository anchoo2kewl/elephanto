package middleware

import (
	"context"
	"elephanto-events/utils"
	"net/http"
	"strings"

	"github.com/google/uuid"
)

type contextKey string

const UserContextKey contextKey = "user"

// User represents a user in middleware context (simpler than models.User)
type User struct {
	ID    uuid.UUID `json:"id"`
	Email string    `json:"email"`
	Name  *string   `json:"name"`
	Role  string    `json:"role"`
}

// TokenValidator interface for validating different types of tokens
type TokenValidator interface {
	ValidatePersonalAccessToken(token string) (*User, error)
}

func AuthMiddleware(jwtSecret string, tokenValidator TokenValidator) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "Authorization header required", http.StatusUnauthorized)
				return
			}

			tokenString := strings.TrimPrefix(authHeader, "Bearer ")
			if tokenString == authHeader {
				http.Error(w, "Bearer token required", http.StatusUnauthorized)
				return
			}

			var user *User

			// Check if this is a personal access token
			if strings.HasPrefix(tokenString, "pat_") && tokenValidator != nil {
				patUser, err := tokenValidator.ValidatePersonalAccessToken(tokenString)
				if err == nil {
					user = patUser
				}
			}

			// If not a valid PAT, try JWT validation
			if user == nil {
				claims, err := utils.ValidateJWT(tokenString, jwtSecret)
				if err != nil {
					http.Error(w, "Invalid token", http.StatusUnauthorized)
					return
				}

				user = &User{
					ID:    claims.UserID,
					Email: claims.Email,
					Role:  claims.Role,
					// Name will be nil for JWT tokens unless we fetch from DB
				}
			}

			ctx := context.WithValue(r.Context(), UserContextKey, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func AdminMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, ok := r.Context().Value(UserContextKey).(*User)
		if !ok {
			http.Error(w, "User not found in context", http.StatusInternalServerError)
			return
		}

		if user.Role != "admin" {
			http.Error(w, "Admin access required", http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func GetUserFromContext(r *http.Request) (*User, bool) {
	user, ok := r.Context().Value(UserContextKey).(*User)
	return user, ok
}