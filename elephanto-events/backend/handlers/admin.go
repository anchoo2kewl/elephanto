package handlers

import (
	"database/sql"
	"elephanto-events/middleware"
	"elephanto-events/models"
	"encoding/json"
	"fmt"
	"log"
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

