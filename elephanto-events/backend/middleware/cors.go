package middleware

import (
	"net/http"
	"strings"
)

func CORS(frontendURLs string) func(http.Handler) http.Handler {
	// Split comma-separated URLs
	allowedOrigins := strings.Split(frontendURLs, ",")
	for i := range allowedOrigins {
		allowedOrigins[i] = strings.TrimSpace(allowedOrigins[i])
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			
			// Check if the origin is in the allowed list
			allowedOrigin := ""
			for _, allowed := range allowedOrigins {
				if origin == allowed {
					allowedOrigin = allowed
					break
				}
			}
			
			// If no specific origin matched, use the first allowed origin as default
			if allowedOrigin == "" && len(allowedOrigins) > 0 {
				allowedOrigin = allowedOrigins[0]
			}

			// Set CORS headers for all requests
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Allow-Credentials", "true")

			// Handle preflight OPTIONS requests
			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}