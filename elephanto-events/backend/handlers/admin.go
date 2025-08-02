package handlers

import (
	"database/sql"
	"elephanto-events/middleware"
	"elephanto-events/models"
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

type AdminHandler struct {
	db *sql.DB
}

func NewAdminHandler(db *sql.DB) *AdminHandler {
	return &AdminHandler{db: db}
}

func (h *AdminHandler) GetUsers(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(`
		SELECT id, email, name, dateOfBirth, currentCity, role, isOnboarded, createdAt, updatedAt
		FROM users
		ORDER BY createdAt DESC
	`)
	if err != nil {
		http.Error(w, "Failed to fetch users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		err := rows.Scan(
			&user.ID, &user.Email, &user.Name, &user.DateOfBirth, &user.CurrentCity,
			&user.Role, &user.IsOnboarded, &user.CreatedAt, &user.UpdatedAt,
		)
		if err != nil {
			http.Error(w, "Failed to scan user", http.StatusInternalServerError)
			return
		}
		users = append(users, user)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

func (h *AdminHandler) UpdateUserRole(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID := vars["id"]

	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	admin, ok := middleware.GetUserFromContext(r)
	if !ok {
		http.Error(w, "Admin not found", http.StatusInternalServerError)
		return
	}

	var req models.UpdateRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Role != "user" && req.Role != "admin" {
		http.Error(w, "Invalid role. Must be 'user' or 'admin'", http.StatusBadRequest)
		return
	}

	var oldRole string
	err = h.db.QueryRow("SELECT role FROM users WHERE id = $1", parsedUserID).Scan(&oldRole)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to fetch user", http.StatusInternalServerError)
		return
	}

	if oldRole == req.Role {
		http.Error(w, "User already has this role", http.StatusBadRequest)
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec("UPDATE users SET role = $1, updatedAt = CURRENT_TIMESTAMP WHERE id = $2", req.Role, parsedUserID)
	if err != nil {
		http.Error(w, "Failed to update user role", http.StatusInternalServerError)
		return
	}

	_, err = tx.Exec(`
		INSERT INTO adminAuditLogs (adminId, targetUserId, action, oldValue, newValue, ipAddress)
		VALUES ($1, $2, 'role_update', $3, $4, $5)
	`, admin.ID, parsedUserID, oldRole, req.Role, getClientIP(r))
	if err != nil {
		http.Error(w, "Failed to log admin action", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "User role updated successfully",
	})
}

func (h *AdminHandler) GetMigrationStatus(w http.ResponseWriter, r *http.Request) {
	var version sql.NullInt64
	var dirty sql.NullBool

	err := h.db.QueryRow("SELECT version, dirty FROM schema_migrations ORDER BY version DESC LIMIT 1").Scan(&version, &dirty)
	if err != nil && err != sql.ErrNoRows {
		http.Error(w, "Failed to get migration status", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"version": nil,
		"dirty":   false,
	}

	if version.Valid {
		response["version"] = version.Int64
	}
	if dirty.Valid {
		response["dirty"] = dirty.Bool
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}