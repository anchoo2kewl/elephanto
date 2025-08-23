package handlers

import (
	"database/sql"
	"elephanto-events/middleware"
	"elephanto-events/models"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

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
	// Get active event ID first
	var activeEventID *uuid.UUID
	var eventID uuid.UUID
	err := h.db.QueryRow("SELECT id FROM events WHERE is_active = true").Scan(&eventID)
	if err != nil && err != sql.ErrNoRows {
		http.Error(w, "Failed to get active event", http.StatusInternalServerError)
		return
	}
	if err == nil {
		activeEventID = &eventID
	}

	// Query users with attendance information for active event
	var query string
	var args []interface{}
	
	if activeEventID != nil {
		query = `
			SELECT u.id, u.email, u.name, u.role, u.isOnboarded, u.createdAt, u.updatedAt,
			       COALESCE(ea.attending, false) as attending,
			       CASE WHEN sr.id IS NOT NULL THEN true ELSE false END as has_survey,
			       CASE WHEN cp.id IS NOT NULL THEN true ELSE false END as has_cocktail
			FROM users u
			LEFT JOIN event_attendance ea ON u.id = ea.user_id AND ea.event_id = $1
			LEFT JOIN survey_responses sr ON u.id = sr.userId AND sr.event_id = $1
			LEFT JOIN cocktail_preferences cp ON u.id = cp.userId AND cp.event_id = $1
			ORDER BY u.createdAt DESC
		`
		args = []interface{}{*activeEventID}
	} else {
		query = `
			SELECT u.id, u.email, u.name, u.role, u.isOnboarded, u.createdAt, u.updatedAt, 
			       false as attending,
			       CASE WHEN sr.id IS NOT NULL THEN true ELSE false END as has_survey,
			       CASE WHEN cp.id IS NOT NULL THEN true ELSE false END as has_cocktail
			FROM users u
			LEFT JOIN survey_responses sr ON u.id = sr.userId
			LEFT JOIN cocktail_preferences cp ON u.id = cp.userId
			ORDER BY u.createdAt DESC
		`
	}

	rows, err := h.db.Query(query, args...)
	if err != nil {
		http.Error(w, "Failed to fetch users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []map[string]interface{}
	for rows.Next() {
		var user models.User
		var attending, hasSurvey, hasCocktail bool
		err := rows.Scan(
			&user.ID, &user.Email, &user.Name,
			&user.Role, &user.IsOnboarded, &user.CreatedAt, &user.UpdatedAt,
			&attending, &hasSurvey, &hasCocktail,
		)
		if err != nil {
			http.Error(w, "Failed to scan user", http.StatusInternalServerError)
			return
		}
		
		userWithAttendance := map[string]interface{}{
			"id":             user.ID,
			"email":          user.Email,
			"name":           user.Name,
			"role":           user.Role,
			"isOnboarded":    user.IsOnboarded,
			"createdAt":      user.CreatedAt,
			"updatedAt":      user.UpdatedAt,
			"attending":      attending,
			"hasActiveEvent": activeEventID != nil,
			"hasSurvey":      hasSurvey,
			"hasCocktail":    hasCocktail,
		}
		users = append(users, userWithAttendance)
	}

	fmt.Printf("Active Event ID: %v\n", activeEventID)
	fmt.Printf("Number of users: %d\n", len(users))
	if len(users) > 0 {
		fmt.Printf("First user: %+v\n", users[0])
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

// UpdateUserAttendance updates a user's attendance for the active event (admin only)
func (h *AdminHandler) UpdateUserAttendance(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID, err := uuid.Parse(vars["id"])
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	var req struct {
		Attending bool `json:"attending"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get active event ID
	var activeEventID uuid.UUID
	err = h.db.QueryRow("SELECT id FROM events WHERE is_active = true").Scan(&activeEventID)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "No active event found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to get active event", http.StatusInternalServerError)
		return
	}

	// Check if user exists
	var exists bool
	err = h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)", userID).Scan(&exists)
	if err != nil {
		http.Error(w, "Failed to check user", http.StatusInternalServerError)
		return
	}
	if !exists {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Upsert attendance record
	_, err = h.db.Exec(`
		INSERT INTO event_attendance (user_id, event_id, attending)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, event_id)
		DO UPDATE SET attending = $3, updated_at = CURRENT_TIMESTAMP
	`, userID, activeEventID, req.Attending)

	if err != nil {
		http.Error(w, "Failed to update attendance", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"attending": req.Attending,
		"message":   "User attendance updated successfully",
	})
}

func (h *AdminHandler) UpdateUserRole(w http.ResponseWriter, r *http.Request) {
	log.Printf("UpdateUserRole: Starting request")
	
	vars := mux.Vars(r)
	userID := vars["id"]
	log.Printf("UpdateUserRole: User ID: %s", userID)

	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		log.Printf("UpdateUserRole: Invalid user ID: %v", err)
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	admin, ok := middleware.GetUserFromContext(r)
	if !ok {
		log.Printf("UpdateUserRole: Admin not found in context")
		http.Error(w, "Admin not found", http.StatusInternalServerError)
		return
	}
	log.Printf("UpdateUserRole: Admin ID: %v", admin.ID)

	var req models.UpdateRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("UpdateUserRole: Failed to decode request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	log.Printf("UpdateUserRole: Requested role: %s", req.Role)

	if req.Role != "user" && req.Role != "admin" {
		log.Printf("UpdateUserRole: Invalid role requested: %s", req.Role)
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

	_, err = tx.Exec("UPDATE users SET role = $1, updatedat = CURRENT_TIMESTAMP WHERE id = $2", req.Role, parsedUserID)
	if err != nil {
		log.Printf("UpdateUserRole: Failed to update user role: %v", err)
		http.Error(w, "Failed to update user role", http.StatusInternalServerError)
		return
	}
	log.Printf("UpdateUserRole: Successfully updated role from %s to %s", oldRole, req.Role)

	log.Printf("UpdateUserRole: Inserting audit log")
	oldValueJSON := fmt.Sprintf(`"%s"`, oldRole)  // Wrap in quotes for JSON string
	newValueJSON := fmt.Sprintf(`"%s"`, req.Role) // Wrap in quotes for JSON string
	_, err = tx.Exec(`
		INSERT INTO adminauditlogs (adminid, targetuserid, action, oldvalue, newvalue, ipaddress)
		VALUES ($1, $2, 'role_update', $3, $4, $5)
	`, admin.ID, parsedUserID, oldValueJSON, newValueJSON, getClientIP(r))
	if err != nil {
		log.Printf("UpdateUserRole: Failed to insert audit log: %v", err)
		http.Error(w, "Failed to log admin action", http.StatusInternalServerError)
		return
	}
	log.Printf("UpdateUserRole: Audit log inserted successfully")

	if err := tx.Commit(); err != nil {
		log.Printf("UpdateUserRole: Failed to commit transaction: %v", err)
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}
	log.Printf("UpdateUserRole: Transaction committed successfully")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "User role updated successfully",
	})
	log.Printf("UpdateUserRole: Response sent successfully")
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
		INSERT INTO adminauditlogs (adminid, targetuserid, action, oldvalue, newvalue, ipaddress)
		VALUES ($1, $2, 'user_create', '{}', $3::jsonb, $4)
	`, admin.ID, userID, fmt.Sprintf(`{"email": "%s"}`, req.Email), getClientIP(r))
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
		INSERT INTO adminauditlogs (adminid, targetuserid, action, oldvalue, newvalue, ipaddress)
		VALUES ($1, $2, 'user_update', '{}', '{"action": "full_profile_update"}'::jsonb, $3)
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

// UpdateUserSurvey updates a user's survey response (admin only)
func (h *AdminHandler) UpdateUserSurvey(w http.ResponseWriter, r *http.Request) {
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

	var req struct {
		ID               string      `json:"id,omitempty"`               // Ignore extra fields
		UserID           string      `json:"userId,omitempty"`           // Ignore extra fields  
		EventID          string      `json:"eventId,omitempty"`          // Ignore extra fields
		EventName        string      `json:"eventName,omitempty"`        // Ignore extra fields
		CreatedAt        string      `json:"createdAt,omitempty"`        // Ignore extra fields
		UpdatedAt        string      `json:"updatedAt,omitempty"`        // Ignore extra fields
		FullName         string      `json:"fullName"`
		Email            string      `json:"email"`
		Age              interface{} `json:"age"`  // Accept both string and number
		Gender           string      `json:"gender"`
		TorontoMeaning   string      `json:"torontoMeaning"`
		Personality      string      `json:"personality"`
		ConnectionType   string      `json:"connectionType"`
		InstagramHandle  string      `json:"instagramHandle"`
		HowHeardAboutUs  string      `json:"howHeardAboutUs"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Failed to decode survey request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Convert age interface{} to int
	age := 0
	if req.Age != nil {
		switch v := req.Age.(type) {
		case string:
			if v != "" {
				if parsedAge, err := strconv.Atoi(v); err == nil && parsedAge >= 18 && parsedAge <= 100 {
					age = parsedAge
				} else {
					http.Error(w, "Age must be a number between 18 and 100", http.StatusBadRequest)
					return
				}
			}
		case float64:
			if v >= 18 && v <= 100 {
				age = int(v)
			} else {
				http.Error(w, "Age must be a number between 18 and 100", http.StatusBadRequest)
				return
			}
		case int:
			if v >= 18 && v <= 100 {
				age = v
			} else {
				http.Error(w, "Age must be a number between 18 and 100", http.StatusBadRequest)
				return
			}
		default:
			if v != nil {
				http.Error(w, "Age must be a number", http.StatusBadRequest)
				return
			}
		}
	}

	// Validate that we have at least some meaningful data to save
	hasAge := age > 0
	if req.FullName == "" && req.Email == "" && !hasAge && req.Gender == "" && 
	   req.TorontoMeaning == "" && req.Personality == "" && req.ConnectionType == "" && req.HowHeardAboutUs == "" {
		http.Error(w, "At least one survey field must be provided", http.StatusBadRequest)
		return
	}

	// Handle nullable instagram handle
	var instagramHandle *string
	if req.InstagramHandle != "" {
		instagramHandle = &req.InstagramHandle
	}

	// Validate required fields that are not empty
	if req.Gender != "" {
		validGenders := map[string]bool{"Male": true, "Female": true, "Other": true}
		if !validGenders[req.Gender] {
			http.Error(w, "Invalid gender. Must be Male, Female, or Other", http.StatusBadRequest)
			return
		}
	}

	if req.TorontoMeaning != "" {
		validMeanings := map[string]bool{
			"new_beginning": true, "temporary_stop": true, "place_to_visit": true, 
			"land_of_opportunity": true, "home": true,
		}
		if !validMeanings[req.TorontoMeaning] {
			http.Error(w, "Invalid Toronto meaning", http.StatusBadRequest)
			return
		}
	}

	if req.Personality != "" {
		validPersonalities := map[string]bool{
			"Ambitious": true, "Adventurous": true, "Balanced": true, 
			"Intentional": true, "Social": true,
		}
		if !validPersonalities[req.Personality] {
			http.Error(w, "Invalid personality type", http.StatusBadRequest)
			return
		}
	}

	if req.ConnectionType != "" {
		validConnections := map[string]bool{"Dating": true, "Friendship": true, "Professional": true}
		if !validConnections[req.ConnectionType] {
			http.Error(w, "Invalid connection type", http.StatusBadRequest)
			return
		}
	}

	if req.HowHeardAboutUs != "" {
		validSources := map[string]bool{"Instagram": true, "Event Brite": true, "Friends/Family": true, "Facebook": true}
		if !validSources[req.HowHeardAboutUs] {
			http.Error(w, "Invalid source for how heard about us", http.StatusBadRequest)
			return
		}
	}

	// Get active event
	var activeEventID uuid.UUID
	err = h.db.QueryRow("SELECT id FROM events WHERE is_active = true").Scan(&activeEventID)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "No active event found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to get active event", http.StatusInternalServerError)
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Check if survey response already exists
	var existingID uuid.UUID
	err = tx.QueryRow("SELECT id FROM survey_responses WHERE userId = $1", userID).Scan(&existingID)
	
	if err == sql.ErrNoRows {
		// No existing survey - create new one with default values for missing required fields
		fullName := req.FullName
		if fullName == "" {
			fullName = "Not provided"
		}
		email := req.Email
		if email == "" {
			email = "not-provided@example.com"
		}
		finalAge := age
		if finalAge == 0 {
			finalAge = 25 // default age
		}
		gender := req.Gender
		if gender == "" {
			gender = "Other"
		}
		torontoMeaning := req.TorontoMeaning
		if torontoMeaning == "" {
			torontoMeaning = "home"
		}
		personality := req.Personality
		if personality == "" {
			personality = "Balanced"
		}
		connectionType := req.ConnectionType
		if connectionType == "" {
			connectionType = "Friendship"
		}
		howHeard := req.HowHeardAboutUs
		if howHeard == "" {
			howHeard = "Instagram"
		}
		
		// Insert new survey response
		_, err = tx.Exec(`
			INSERT INTO survey_responses (id, userId, fullName, email, age, gender, torontoMeaning, personality, connectionType, instagramHandle, howHeardAboutUs, event_id)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		`, uuid.New(), userID, fullName, email, finalAge, gender, torontoMeaning, personality, connectionType, instagramHandle, howHeard, activeEventID)
	} else if err != nil {
		log.Printf("Failed to check existing survey response: %v", err)
		http.Error(w, "Failed to check existing survey response", http.StatusInternalServerError)
		return
	} else {
		// Update existing survey response - only update non-empty fields
		setParts := []string{}
		args := []interface{}{}
		argIndex := 1
		
		if req.FullName != "" {
			setParts = append(setParts, "fullName = $"+strconv.Itoa(argIndex))
			args = append(args, req.FullName)
			argIndex++
		}
		if req.Email != "" {
			setParts = append(setParts, "email = $"+strconv.Itoa(argIndex))
			args = append(args, req.Email)
			argIndex++
		}
		if age > 0 {
			setParts = append(setParts, "age = $"+strconv.Itoa(argIndex))
			args = append(args, age)
			argIndex++
		}
		if req.Gender != "" {
			setParts = append(setParts, "gender = $"+strconv.Itoa(argIndex))
			args = append(args, req.Gender)
			argIndex++
		}
		if req.TorontoMeaning != "" {
			setParts = append(setParts, "torontoMeaning = $"+strconv.Itoa(argIndex))
			args = append(args, req.TorontoMeaning)
			argIndex++
		}
		if req.Personality != "" {
			setParts = append(setParts, "personality = $"+strconv.Itoa(argIndex))
			args = append(args, req.Personality)
			argIndex++
		}
		if req.ConnectionType != "" {
			setParts = append(setParts, "connectionType = $"+strconv.Itoa(argIndex))
			args = append(args, req.ConnectionType)
			argIndex++
		}
		if instagramHandle != nil {
			setParts = append(setParts, "instagramHandle = $"+strconv.Itoa(argIndex))
			args = append(args, instagramHandle)
			argIndex++
		}
		if req.HowHeardAboutUs != "" {
			setParts = append(setParts, "howHeardAboutUs = $"+strconv.Itoa(argIndex))
			args = append(args, req.HowHeardAboutUs)
			argIndex++
		}
		
		// Always update event_id and updatedAt
		setParts = append(setParts, "event_id = $"+strconv.Itoa(argIndex))
		args = append(args, activeEventID)
		argIndex++
		setParts = append(setParts, "updatedAt = CURRENT_TIMESTAMP")
		
		if len(setParts) > 2 { // More than just event_id and updatedAt
			args = append(args, userID)
			query := "UPDATE survey_responses SET " + setParts[0]
			for i := 1; i < len(setParts); i++ {
				query += ", " + setParts[i]
			}
			query += " WHERE userId = $" + strconv.Itoa(argIndex)
			
			_, err = tx.Exec(query, args...)
		}
	}

	if err != nil {
		log.Printf("Failed to update survey response: %v", err)
		http.Error(w, "Failed to update survey response", http.StatusInternalServerError)
		return
	}

	// Log admin action
	_, err = tx.Exec(`
		INSERT INTO adminauditlogs (adminid, targetuserid, action, oldvalue, newvalue, ipaddress)
		VALUES ($1, $2, 'survey_update', '{}', '{"action": "survey_response_update"}'::jsonb, $3)
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
		"message": "Survey response updated successfully",
	})
}

// UpdateUserCocktail updates a user's cocktail preference (admin only)
func (h *AdminHandler) UpdateUserCocktail(w http.ResponseWriter, r *http.Request) {
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

	var req struct {
		Preference string `json:"preference"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get active event
	var activeEventID uuid.UUID
	err = h.db.QueryRow("SELECT id FROM events WHERE is_active = true").Scan(&activeEventID)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "No active event found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to get active event", http.StatusInternalServerError)
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Upsert cocktail preference
	_, err = tx.Exec(`
		INSERT INTO cocktail_preferences (id, userId, preference, event_id)
		VALUES (COALESCE((SELECT id FROM cocktail_preferences WHERE userId = $1), $3), $1, $4, $2)
		ON CONFLICT (userId)
		DO UPDATE SET preference = $4, event_id = $2, updatedAt = CURRENT_TIMESTAMP
	`, userID, activeEventID, uuid.New(), req.Preference)

	if err != nil {
		log.Printf("Failed to update cocktail preference: %v", err)
		http.Error(w, "Failed to update cocktail preference", http.StatusInternalServerError)
		return
	}

	// Log admin action
	_, err = tx.Exec(`
		INSERT INTO adminauditlogs (adminid, targetuserid, action, oldvalue, newvalue, ipaddress)
		VALUES ($1, $2, 'cocktail_update', '{}', '{"action": "cocktail_preference_update"}'::jsonb, $3)
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
		"message": "Cocktail preference updated successfully",
	})
}

// DeleteUser deletes a user and all related data (admin only)
func (h *AdminHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
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

	// Check if user exists and get user info for logging
	var userEmail string
	err = h.db.QueryRow("SELECT email FROM users WHERE id = $1", userID).Scan(&userEmail)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to fetch user", http.StatusInternalServerError)
		return
	}

	// Prevent admin from deleting themselves
	if admin.ID == userID {
		http.Error(w, "Cannot delete your own account", http.StatusBadRequest)
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// Delete related data in proper order to handle foreign key constraints
	// Delete cocktail preferences
	_, err = tx.Exec("DELETE FROM cocktail_preferences WHERE userId = $1", userID)
	if err != nil {
		log.Printf("Failed to delete cocktail preferences: %v", err)
		http.Error(w, "Failed to delete user data", http.StatusInternalServerError)
		return
	}

	// Delete survey responses
	_, err = tx.Exec("DELETE FROM survey_responses WHERE userId = $1", userID)
	if err != nil {
		log.Printf("Failed to delete survey responses: %v", err)
		http.Error(w, "Failed to delete user data", http.StatusInternalServerError)
		return
	}

	// Delete event attendance
	_, err = tx.Exec("DELETE FROM event_attendance WHERE user_id = $1", userID)
	if err != nil {
		log.Printf("Failed to delete event attendance: %v", err)
		http.Error(w, "Failed to delete user data", http.StatusInternalServerError)
		return
	}

	// Delete ALL audit logs where this user was the target
	// (We must do this before deleting the user due to foreign key constraints)
	_, err = tx.Exec("DELETE FROM adminauditlogs WHERE targetuserid = $1", userID)
	if err != nil {
		log.Printf("Failed to delete audit logs: %v", err)
		http.Error(w, "Failed to delete user data", http.StatusInternalServerError)
		return
	}

	// Log admin action for the deletion (but with NULL targetuserid to avoid FK issues)
	_, err = tx.Exec(`
		INSERT INTO adminauditlogs (adminid, targetuserid, action, oldvalue, newvalue, ipaddress)
		VALUES ($1, NULL, 'user_delete', $2::jsonb, '{"deleted": true}'::jsonb, $3)
	`, admin.ID, fmt.Sprintf(`{"user_id": "%s", "email": "%s"}`, userID.String(), userEmail), getClientIP(r))
	if err != nil {
		log.Printf("Failed to log admin action: %v", err)
		http.Error(w, "Failed to log admin action", http.StatusInternalServerError)
		return
	}

	// Finally, delete the user
	result, err := tx.Exec("DELETE FROM users WHERE id = $1", userID)
	if err != nil {
		log.Printf("Failed to delete user: %v", err)
		http.Error(w, "Failed to delete user", http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	if err := tx.Commit(); err != nil {
		log.Printf("Failed to commit transaction: %v", err)
		http.Error(w, "Failed to commit transaction", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "User deleted successfully",
	})
}

// ExportUsersCSV exports all users and their data as CSV (admin only)
func (h *AdminHandler) ExportUsersCSV(w http.ResponseWriter, r *http.Request) {
	// Get active event ID for additional context
	var activeEventID *uuid.UUID
	var eventID uuid.UUID
	err := h.db.QueryRow("SELECT id FROM events WHERE is_active = true").Scan(&eventID)
	if err == nil {
		activeEventID = &eventID
	}

	// Build comprehensive query to get all user data
	query := `
		SELECT 
			u.id, u.email, u.name, u.role, u.isOnboarded, u.createdAt, u.updatedAt,
			COALESCE(sr.fullName, '') as survey_fullname,
			COALESCE(sr.age, 0) as survey_age,
			COALESCE(sr.gender, '') as survey_gender,
			COALESCE(sr.torontoMeaning, '') as survey_toronto_meaning,
			COALESCE(sr.personality, '') as survey_personality,
			COALESCE(sr.connectionType, '') as survey_connection_type,
			COALESCE(sr.instagramHandle, '') as survey_instagram,
			COALESCE(sr.howHeardAboutUs, '') as survey_how_heard,
			COALESCE(cp.preference, '') as cocktail_preference,
			COALESCE(ea.attending, false) as attending_active_event
		FROM users u
		LEFT JOIN survey_responses sr ON u.id = sr.userId`

	var args []interface{}
	if activeEventID != nil {
		query += ` AND sr.event_id = $1
		LEFT JOIN cocktail_preferences cp ON u.id = cp.userId AND cp.event_id = $1
		LEFT JOIN event_attendance ea ON u.id = ea.user_id AND ea.event_id = $1`
		args = append(args, *activeEventID)
	} else {
		query += `
		LEFT JOIN cocktail_preferences cp ON u.id = cp.userId
		LEFT JOIN event_attendance ea ON u.id = ea.user_id`
	}
	
	query += ` ORDER BY u.createdAt DESC`

	rows, err := h.db.Query(query, args...)
	if err != nil {
		log.Printf("Failed to query users for CSV export: %v", err)
		http.Error(w, "Failed to fetch users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Set CSV headers
	timestamp := time.Now().Format("2006-01-02_15-04-05")
	filename := fmt.Sprintf("elephanto_users_export_%s.csv", timestamp)
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	writer := csv.NewWriter(w)
	defer writer.Flush()

	// Write CSV headers
	headers := []string{
		"User ID", "Email", "Name", "Role", "Onboarded", "Created At", "Updated At",
		"Survey Full Name", "Survey Age", "Survey Gender", "Toronto Meaning", 
		"Personality", "Connection Type", "Instagram Handle", "How Heard About Us",
		"Cocktail Preference", "Attending Active Event",
	}
	if err := writer.Write(headers); err != nil {
		log.Printf("Failed to write CSV headers: %v", err)
		return
	}

	// Write data rows
	for rows.Next() {
		var userID uuid.UUID
		var email, name, role string
		var isOnboarded, attending bool
		var createdAt, updatedAt time.Time
		var surveyFullName, surveyGender, torontoMeaning, personality, connectionType, instagramHandle, howHeard, cocktailPref string
		var surveyAge int

		err := rows.Scan(
			&userID, &email, &name, &role, &isOnboarded, &createdAt, &updatedAt,
			&surveyFullName, &surveyAge, &surveyGender, &torontoMeaning, &personality,
			&connectionType, &instagramHandle, &howHeard, &cocktailPref, &attending,
		)
		if err != nil {
			log.Printf("Failed to scan user row for CSV: %v", err)
			continue
		}

		// Format data for CSV
		ageStr := ""
		if surveyAge > 0 {
			ageStr = strconv.Itoa(surveyAge)
		}

		record := []string{
			userID.String(),
			email,
			name,
			role,
			strconv.FormatBool(isOnboarded),
			createdAt.Format("2006-01-02 15:04:05"),
			updatedAt.Format("2006-01-02 15:04:05"),
			surveyFullName,
			ageStr,
			surveyGender,
			torontoMeaning,
			personality,
			connectionType,
			instagramHandle,
			howHeard,
			cocktailPref,
			strconv.FormatBool(attending),
		}

		if err := writer.Write(record); err != nil {
			log.Printf("Failed to write CSV record: %v", err)
			continue
		}
	}

	if err = rows.Err(); err != nil {
		log.Printf("Error during CSV row iteration: %v", err)
	}
}

// AuditLog represents an audit log entry with user names
type AuditLog struct {
	ID           string          `json:"id"`
	AdminID      *string         `json:"adminId"`
	AdminName    *string         `json:"adminName"`
	AdminEmail   *string         `json:"adminEmail"`
	TargetUserID *string         `json:"targetUserId"`
	TargetName   *string         `json:"targetName"`
	TargetEmail  *string         `json:"targetEmail"`
	Action       string          `json:"action"`
	OldValue     json.RawMessage `json:"oldValue"`
	NewValue     json.RawMessage `json:"newValue"`
	IPAddress    *string         `json:"ipAddress"`
	CreatedAt    time.Time       `json:"createdAt"`
}

// AuditLogsResponse represents paginated audit logs response
type AuditLogsResponse struct {
	Logs       []AuditLog `json:"logs"`
	Total      int        `json:"total"`
	Page       int        `json:"page"`
	Limit      int        `json:"limit"`
	TotalPages int        `json:"totalPages"`
}

// GetAuditLogs returns paginated audit logs with search and filtering (admin only)
func (h *AdminHandler) GetAuditLogs(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")
	search := r.URL.Query().Get("search")
	action := r.URL.Query().Get("action")
	adminId := r.URL.Query().Get("adminId")
	targetUserId := r.URL.Query().Get("targetUserId")

	// Set default values
	page := 1
	limit := 50

	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 200 {
			limit = l
		}
	}

	// Build query conditions
	var conditions []string
	var args []interface{}
	argIndex := 1

	if search != "" {
		conditions = append(conditions, fmt.Sprintf("(admin.email ILIKE $%d OR admin.name ILIKE $%d OR target.email ILIKE $%d OR target.name ILIKE $%d OR al.action ILIKE $%d)", argIndex, argIndex, argIndex, argIndex, argIndex))
		searchPattern := "%" + search + "%"
		args = append(args, searchPattern)
		argIndex++
	}

	if action != "" {
		conditions = append(conditions, fmt.Sprintf("al.action = $%d", argIndex))
		args = append(args, action)
		argIndex++
	}

	if adminId != "" {
		if uuid, err := uuid.Parse(adminId); err == nil {
			conditions = append(conditions, fmt.Sprintf("al.adminid = $%d", argIndex))
			args = append(args, uuid)
			argIndex++
		}
	}

	if targetUserId != "" {
		if uuid, err := uuid.Parse(targetUserId); err == nil {
			conditions = append(conditions, fmt.Sprintf("al.targetuserid = $%d", argIndex))
			args = append(args, uuid)
			argIndex++
		}
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Get total count
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*) 
		FROM adminauditlogs al
		LEFT JOIN users admin ON al.adminid = admin.id
		LEFT JOIN users target ON al.targetuserid = target.id
		%s
	`, whereClause)

	var total int
	err := h.db.QueryRow(countQuery, args...).Scan(&total)
	if err != nil {
		log.Printf("Failed to get audit logs count: %v", err)
		http.Error(w, "Failed to fetch audit logs", http.StatusInternalServerError)
		return
	}

	// Calculate pagination
	offset := (page - 1) * limit
	totalPages := (total + limit - 1) / limit

	// Get audit logs with pagination
	query := fmt.Sprintf(`
		SELECT 
			al.id,
			al.adminid,
			admin.name as admin_name,
			admin.email as admin_email,
			al.targetuserid,
			target.name as target_name,
			target.email as target_email,
			al.action,
			COALESCE(al.oldvalue, '{}'::jsonb) as oldvalue,
			COALESCE(al.newvalue, '{}'::jsonb) as newvalue,
			al.ipaddress,
			al.createdat
		FROM adminauditlogs al
		LEFT JOIN users admin ON al.adminid = admin.id
		LEFT JOIN users target ON al.targetuserid = target.id
		%s
		ORDER BY al.createdat DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIndex, argIndex+1)

	args = append(args, limit, offset)

	rows, err := h.db.Query(query, args...)
	if err != nil {
		log.Printf("Failed to query audit logs: %v", err)
		http.Error(w, "Failed to fetch audit logs", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var logs []AuditLog
	for rows.Next() {
		var auditLog AuditLog
		var adminID, targetUserID *uuid.UUID
		
		err := rows.Scan(
			&auditLog.ID,
			&adminID,
			&auditLog.AdminName,
			&auditLog.AdminEmail,
			&targetUserID,
			&auditLog.TargetName,
			&auditLog.TargetEmail,
			&auditLog.Action,
			&auditLog.OldValue,
			&auditLog.NewValue,
			&auditLog.IPAddress,
			&auditLog.CreatedAt,
		)
		if err != nil {
			log.Printf("Failed to scan audit log row: %v", err)
			continue
		}

		// Convert UUIDs to strings
		if adminID != nil {
			adminIDStr := adminID.String()
			auditLog.AdminID = &adminIDStr
		}
		if targetUserID != nil {
			targetUserIDStr := targetUserID.String()
			auditLog.TargetUserID = &targetUserIDStr
		}

		logs = append(logs, auditLog)
	}

	if err = rows.Err(); err != nil {
		log.Printf("Error during audit logs iteration: %v", err)
		http.Error(w, "Failed to process audit logs", http.StatusInternalServerError)
		return
	}

	response := AuditLogsResponse{
		Logs:       logs,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

