package handlers

import (
	"database/sql"
	"elephanto-events/middleware"
	"elephanto-events/models"
	"encoding/json"
	"net/http"
	"strconv"

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
		SELECT id, email, name, role, isOnboarded, createdAt, updatedAt
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
			&user.ID, &user.Email, &user.Name,
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

// GetUserWithDetails returns a user with full details including survey and cocktail data (admin only)
func (h *AdminHandler) GetUserWithDetails(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID, err := uuid.Parse(vars["id"])
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Get user
	var user models.User
	err = h.db.QueryRow(`
		SELECT id, email, name, role, isOnboarded, createdAt, updatedAt
		FROM users WHERE id = $1
	`, userID).Scan(
		&user.ID, &user.Email, &user.Name, &user.Role, &user.IsOnboarded, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to fetch user", http.StatusInternalServerError)
		return
	}

	userDetails := models.UserWithDetails{User: user}

	// Get survey response for active event (if exists)
	var surveyResponse models.SurveyResponse
	err = h.db.QueryRow(`
		SELECT sr.id, sr.userId, sr.fullName, sr.email, sr.age, sr.gender, sr.torontoMeaning, sr.personality, 
		       sr.connectionType, sr.instagramHandle, sr.howHeardAboutUs, sr.event_id, e.title, sr.createdAt, sr.updatedAt
		FROM survey_responses sr
		JOIN events e ON sr.event_id = e.id
		WHERE sr.userId = $1 AND e.is_active = true
	`, userID).Scan(
		&surveyResponse.ID, &surveyResponse.UserID, &surveyResponse.FullName, &surveyResponse.Email,
		&surveyResponse.Age, &surveyResponse.Gender, &surveyResponse.TorontoMeaning, &surveyResponse.Personality,
		&surveyResponse.ConnectionType, &surveyResponse.InstagramHandle, &surveyResponse.HowHeardAboutUs,
		&surveyResponse.EventID, &surveyResponse.EventName, &surveyResponse.CreatedAt, &surveyResponse.UpdatedAt,
	)
	if err == nil {
		userDetails.SurveyResponse = &surveyResponse
	} else if err != sql.ErrNoRows {
		http.Error(w, "Failed to fetch survey response", http.StatusInternalServerError)
		return
	}

	// Get cocktail preference for active event (if exists)
	var cocktailPref models.CocktailPreference
	err = h.db.QueryRow(`
		SELECT cp.id, cp.userId, cp.preference, cp.event_id, e.title, cp.createdAt, cp.updatedAt
		FROM cocktail_preferences cp
		JOIN events e ON cp.event_id = e.id
		WHERE cp.userId = $1 AND e.is_active = true
	`, userID).Scan(
		&cocktailPref.ID, &cocktailPref.UserID, &cocktailPref.Preference,
		&cocktailPref.EventID, &cocktailPref.EventName, &cocktailPref.CreatedAt, &cocktailPref.UpdatedAt,
	)
	if err == nil {
		userDetails.CocktailPref = &cocktailPref
	} else if err != sql.ErrNoRows {
		http.Error(w, "Failed to fetch cocktail preference", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(userDetails)
}

// CreateUser creates a new user manually (admin only)
func (h *AdminHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	admin, ok := middleware.GetUserFromContext(r)
	if !ok {
		http.Error(w, "Admin not found", http.StatusInternalServerError)
		return
	}

	var req models.CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Set defaults
	role := "user"
	if req.Role != nil {
		role = *req.Role
	}
	isOnboarded := false
	if req.IsOnboarded != nil {
		isOnboarded = *req.IsOnboarded
	}

	// Validate role
	if role != "user" && role != "admin" {
		http.Error(w, "Invalid role. Must be 'user' or 'admin'", http.StatusBadRequest)
		return
	}

	userID := uuid.New()

	tx, err := h.db.Begin()
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Create user
	_, err = tx.Exec(`
		INSERT INTO users (id, email, name, role, isOnboarded)
		VALUES ($1, $2, $3, $4, $5)
	`, userID, req.Email, req.Name, role, isOnboarded)
	if err != nil {
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	// Log admin action
	_, err = tx.Exec(`
		INSERT INTO adminAuditLogs (adminId, targetUserId, action, oldValue, newValue, ipAddress)
		VALUES ($1, $2, 'user_create', '', $3, $4)
	`, admin.ID, userID, req.Email, getClientIP(r))
	if err != nil {
		http.Error(w, "Failed to log admin action", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":      userID,
		"message": "User created successfully",
	})
}

// UpdateUserFull updates all user details (admin only)
func (h *AdminHandler) UpdateUserFull(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID, err := uuid.Parse(vars["id"])
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	admin, ok := middleware.GetUserFromContext(r)
	if !ok {
		http.Error(w, "Admin not found", http.StatusInternalServerError)
		return
	}

	var req models.UpdateUserFullRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate role if provided
	if req.Role != nil && *req.Role != "user" && *req.Role != "admin" {
		http.Error(w, "Invalid role. Must be 'user' or 'admin'", http.StatusBadRequest)
		return
	}

	// Build dynamic update query
	setParts := []string{}
	args := []interface{}{}
	argIndex := 1

	if req.Name != nil {
		setParts = append(setParts, "name = $"+strconv.Itoa(argIndex))
		args = append(args, *req.Name)
		argIndex++
	}
	if req.Role != nil {
		setParts = append(setParts, "role = $"+strconv.Itoa(argIndex))
		args = append(args, *req.Role)
		argIndex++
	}
	if req.IsOnboarded != nil {
		setParts = append(setParts, "isOnboarded = $"+strconv.Itoa(argIndex))
		args = append(args, *req.IsOnboarded)
		argIndex++
	}

	if len(setParts) == 0 {
		http.Error(w, "No fields to update", http.StatusBadRequest)
		return
	}

	setParts = append(setParts, "updatedAt = CURRENT_TIMESTAMP")
	args = append(args, userID)

	query := "UPDATE users SET " + setParts[0]
	for i := 1; i < len(setParts)-1; i++ {
		query += ", " + setParts[i]
	}
	query += ", " + setParts[len(setParts)-1] + " WHERE id = $" + strconv.Itoa(argIndex)

	tx, err := h.db.Begin()
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	result, err := tx.Exec(query, args...)
	if err != nil {
		http.Error(w, "Failed to update user", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Log admin action
	_, err = tx.Exec(`
		INSERT INTO adminAuditLogs (adminId, targetUserId, action, oldValue, newValue, ipAddress)
		VALUES ($1, $2, 'user_update', '', 'full_profile_update', $3)
	`, admin.ID, userID, getClientIP(r))
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
		"message": "User updated successfully",
	})
}

