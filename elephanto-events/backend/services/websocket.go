package services

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// Message types for real-time updates
const (
	MessageTypeUserJoinedEvent            = "USER_JOINED_EVENT"
	MessageTypeUserLeftEvent              = "USER_LEFT_EVENT"
	MessageTypeUserMarkedAttending        = "USER_MARKED_ATTENDING"
	MessageTypeVelvetHourParticipantJoined = "VELVET_HOUR_PARTICIPANT_JOINED"
	MessageTypeVelvetHourSessionStarted   = "VELVET_HOUR_SESSION_STARTED"
	MessageTypeVelvetHourRoundStarted     = "VELVET_HOUR_ROUND_STARTED"
	MessageTypeVelvetHourMatchConfirmed   = "VELVET_HOUR_MATCH_CONFIRMED"
	MessageTypeVelvetHourFeedbackSubmitted = "VELVET_HOUR_FEEDBACK_SUBMITTED"
	MessageTypeVelvetHourSessionEnded     = "VELVET_HOUR_SESSION_ENDED"
	MessageTypeVelvetHourSessionReset     = "VELVET_HOUR_SESSION_RESET"
	MessageTypeAttendanceStatsUpdate      = "ATTENDANCE_STATS_UPDATE"
	MessageTypeVelvetHourStatusUpdate     = "VELVET_HOUR_STATUS_UPDATE"
	MessageTypePing                       = "PING"
	MessageTypePong                       = "PONG"
)

// WebSocketMessage represents a message sent over WebSocket
type WebSocketMessage struct {
	Type      string      `json:"type"`
	EventID   uuid.UUID   `json:"eventId"`
	Data      interface{} `json:"data"`
	Timestamp int64       `json:"timestamp"`
}

// Client represents a WebSocket client connection
type Client struct {
	ID            uuid.UUID
	EventID       uuid.UUID
	UserID        uuid.UUID
	Conn          *websocket.Conn
	Send          chan WebSocketMessage
	IsAdmin       bool
	LastHeartbeat time.Time
}

// Hub manages WebSocket connections and message broadcasting
type Hub struct {
	// Event-based rooms: eventID -> map[clientID]Client
	Rooms map[uuid.UUID]map[uuid.UUID]*Client

	// Channel to register clients
	Register chan *Client

	// Channel to unregister clients
	Unregister chan *Client

	// Channel to broadcast messages
	Broadcast chan WebSocketMessage

	// Debounced presence update tracking
	presenceUpdateTimers map[uuid.UUID]*time.Timer
	presenceUpdateMutex  sync.Mutex

	// Mutex for thread-safe operations
	mutex sync.RWMutex
}

// NewWebSocketHub creates a new WebSocket hub
func NewWebSocketHub() *Hub {
	return &Hub{
		Rooms:                make(map[uuid.UUID]map[uuid.UUID]*Client),
		Register:             make(chan *Client),
		Unregister:           make(chan *Client),
		Broadcast:            make(chan WebSocketMessage),
		presenceUpdateTimers: make(map[uuid.UUID]*time.Timer),
	}
}

// Run starts the WebSocket hub
func (h *Hub) Run() {
	// Create a ticker to check for stale connections every 60 seconds (increased from 30s)
	heartbeatTicker := time.NewTicker(60 * time.Second)
	defer heartbeatTicker.Stop()
	
	for {
		select {
		case client := <-h.Register:
			h.registerClient(client)

		case client := <-h.Unregister:
			h.unregisterClient(client)

		case message := <-h.Broadcast:
			h.broadcastToRoom(message)
			
		case <-heartbeatTicker.C:
			h.checkStaleConnections()
		}
	}
}

// registerClient adds a client to the appropriate room
func (h *Hub) registerClient(client *Client) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	if _, exists := h.Rooms[client.EventID]; !exists {
		h.Rooms[client.EventID] = make(map[uuid.UUID]*Client)
	}
	
	h.Rooms[client.EventID][client.ID] = client
	
	log.Printf("Client %s joined event room %s (Admin: %v)", client.ID, client.EventID, client.IsAdmin)
	
	// Broadcast presence update to admins
	presentCount := h.getPresentUserCountLocked(client.EventID)
	log.Printf("DEBUG: About to broadcast presence update - eventID: %s, presentCount: %d", client.EventID, presentCount)
	h.broadcastPresenceUpdate(client.EventID, presentCount)
}

// unregisterClient removes a client from its room
func (h *Hub) unregisterClient(client *Client) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	if room, exists := h.Rooms[client.EventID]; exists {
		if _, exists := room[client.ID]; exists {
			close(client.Send)
			delete(room, client.ID)
			
			// Remove empty rooms
			if len(room) == 0 {
				delete(h.Rooms, client.EventID)
			}
			
			log.Printf("Client %s left event room %s", client.ID, client.EventID)
			
			// Broadcast presence update to admins
			presentCount := h.getPresentUserCountLocked(client.EventID)
			h.broadcastPresenceUpdate(client.EventID, presentCount)
		}
	}
}

// broadcastToRoom sends a message to all clients in a specific event room
func (h *Hub) broadcastToRoom(message WebSocketMessage) {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	room, exists := h.Rooms[message.EventID]
	if !exists {
		return
	}

	for clientID, client := range room {
		select {
		case client.Send <- message:
		default:
			// Client's send channel is blocked, remove client
			close(client.Send)
			delete(room, clientID)
			log.Printf("Removed blocked client %s from room %s", clientID, message.EventID)
		}
	}
}

// BroadcastToEvent sends a message to all clients in an event room
func (h *Hub) BroadcastToEvent(eventID uuid.UUID, messageType string, data interface{}) {
	message := WebSocketMessage{
		Type:      messageType,
		EventID:   eventID,
		Data:      data,
		Timestamp: getCurrentTimestamp(),
	}
	
	select {
	case h.Broadcast <- message:
	default:
		log.Printf("Broadcast channel is full, dropping message type: %s", messageType)
	}
}

// BroadcastToAdmins sends a message only to admin clients in an event room
func (h *Hub) BroadcastToAdmins(eventID uuid.UUID, messageType string, data interface{}) {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	room, exists := h.Rooms[eventID]
	if !exists {
		log.Printf("DEBUG BroadcastToAdmins: No room exists for event %s", eventID)
		return
	}

	message := WebSocketMessage{
		Type:      messageType,
		EventID:   eventID,
		Data:      data,
		Timestamp: getCurrentTimestamp(),
	}

	adminCount := 0
	for clientID, client := range room {
		if client.IsAdmin {
			adminCount++
			select {
			case client.Send <- message:
				log.Printf("DEBUG BroadcastToAdmins: Sent %s message to admin client %s", messageType, clientID)
			default:
				// Client's send channel is blocked, remove client
				close(client.Send)
				delete(room, clientID)
				log.Printf("Removed blocked admin client %s from room %s", clientID, eventID)
			}
		}
	}
	log.Printf("DEBUG BroadcastToAdmins: Sent %s to %d admin clients in event %s", messageType, adminCount, eventID)
}

// GetRoomCount returns the number of clients in an event room
func (h *Hub) GetRoomCount(eventID uuid.UUID) int {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	if room, exists := h.Rooms[eventID]; exists {
		return len(room)
	}
	return 0
}

// GetPresentUsers returns a list of user IDs currently connected to an event
// Includes all users (both admin and non-admin) as potential participants
func (h *Hub) GetPresentUsers(eventID uuid.UUID) []uuid.UUID {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	var presentUsers []uuid.UUID
	if room, exists := h.Rooms[eventID]; exists {
		userSet := make(map[uuid.UUID]bool)
		for _, client := range room {
			// Include all connections (both admin and non-admin can participate)
			userSet[client.UserID] = true
		}
		for userID := range userSet {
			presentUsers = append(presentUsers, userID)
		}
	}
	return presentUsers
}

// GetPresentUserCount returns the number of unique users currently connected to an event
// Includes all users (both admin and non-admin) as potential participants
func (h *Hub) GetPresentUserCount(eventID uuid.UUID) int {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	if room, exists := h.Rooms[eventID]; exists {
		userSet := make(map[uuid.UUID]bool)
		log.Printf("DEBUG GetPresentUserCount: Event %s has %d total connections:", eventID, len(room))
		for clientID, client := range room {
			log.Printf("DEBUG GetPresentUserCount: - Client %s: User %s (Admin: %v)", clientID, client.UserID, client.IsAdmin)
			// Count all connections (both admin and non-admin can participate)
			userSet[client.UserID] = true
		}
		count := len(userSet)
		log.Printf("DEBUG GetPresentUserCount: Returning total user count: %d", count)
		return count
	}
	log.Printf("DEBUG GetPresentUserCount: No room exists for event %s", eventID)
	return 0
}

// IsUserPresent checks if a specific user is currently connected to an event
// Includes both admin and non-admin users as they can both participate
func (h *Hub) IsUserPresent(eventID uuid.UUID, userID uuid.UUID) bool {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	if room, exists := h.Rooms[eventID]; exists {
		for _, client := range room {
			// Consider all connections as "present" (both admin and non-admin can participate)
			if client.UserID == userID {
				return true
			}
		}
	}
	return false
}

// getCurrentTimestamp returns current Unix timestamp in milliseconds
func getCurrentTimestamp() int64 {
	return time.Now().UnixMilli()
}

// getPresentUserCountLocked counts present users for an event (assumes mutex is already locked)
// Includes all users (both admin and non-admin) as potential participants
func (h *Hub) getPresentUserCountLocked(eventID uuid.UUID) int {
	room, exists := h.Rooms[eventID]
	if !exists {
		return 0
	}
	
	// Count all unique users (both admin and non-admin can participate)
	userSet := make(map[uuid.UUID]bool)
	for _, client := range room {
		userSet[client.UserID] = true
	}
	count := len(userSet)
	log.Printf("DEBUG getPresentUserCountLocked: Returning total user count: %d for event %s", count, eventID)
	return count
}

// broadcastPresenceUpdate sends a debounced presence update to admins
func (h *Hub) broadcastPresenceUpdate(eventID uuid.UUID, presentCount int) {
	h.presenceUpdateMutex.Lock()
	defer h.presenceUpdateMutex.Unlock()
	
	// Cancel any existing timer for this event
	if timer, exists := h.presenceUpdateTimers[eventID]; exists {
		timer.Stop()
	}
	
	// Log current connections for debugging
	h.logCurrentConnections(eventID)
	
	// Create a new debounced timer (500ms delay to reduce noise)
	h.presenceUpdateTimers[eventID] = time.AfterFunc(500*time.Millisecond, func() {
		// Get fresh count when the timer fires
		freshCount := h.GetPresentUserCount(eventID)
		
		h.BroadcastToAdmins(eventID, MessageTypeAttendanceStatsUpdate, map[string]interface{}{
			"presentCount": freshCount,
			"eventId":      eventID,
			"type":         "presence_update",
		})
		
		log.Printf("DEBUG: Debounced presence update sent - presentCount: %d to admins for event %s", freshCount, eventID)
		
		// Clean up the timer
		h.presenceUpdateMutex.Lock()
		delete(h.presenceUpdateTimers, eventID)
		h.presenceUpdateMutex.Unlock()
	})
}

// logCurrentConnections logs all current connections for debugging
func (h *Hub) logCurrentConnections(eventID uuid.UUID) {
	room, exists := h.Rooms[eventID]
	if !exists {
		log.Printf("DEBUG: No room exists for event %s", eventID)
		return
	}
	
	log.Printf("DEBUG: Event %s has %d total connections:", eventID, len(room))
	userSet := make(map[uuid.UUID]bool)
	for clientID, client := range room {
		log.Printf("DEBUG: - Client %s: User %s (Admin: %v)", clientID, client.UserID, client.IsAdmin)
		userSet[client.UserID] = true
	}
	log.Printf("DEBUG: Unique users: %d", len(userSet))
}

// updateClientHeartbeat updates the last heartbeat time for a client
func (h *Hub) updateClientHeartbeat(client *Client) {
	h.mutex.Lock()
	defer h.mutex.Unlock()
	
	if room, exists := h.Rooms[client.EventID]; exists {
		if existingClient, exists := room[client.ID]; exists {
			existingClient.LastHeartbeat = time.Now()
			log.Printf("Updated heartbeat for client %s", client.ID)
		}
	}
}

// checkStaleConnections removes clients that haven't sent a heartbeat within the timeout period
func (h *Hub) checkStaleConnections() {
	h.mutex.Lock()
	defer h.mutex.Unlock()
	
	timeout := 90 * time.Second // 90 seconds timeout (9 missed 10-second heartbeats, increased from 30s)
	now := time.Now()
	var staleClients []*Client
	
	// Find stale connections
	for _, room := range h.Rooms {
		for clientID, client := range room {
			if now.Sub(client.LastHeartbeat) > timeout {
				log.Printf("Found stale connection: Client %s (last heartbeat: %v)", clientID, client.LastHeartbeat)
				staleClients = append(staleClients, client)
			}
		}
	}
	
	// Remove stale connections
	for _, client := range staleClients {
		log.Printf("Removing stale client %s from event %s", client.ID, client.EventID)
		// Close connection and remove from room
		if room, exists := h.Rooms[client.EventID]; exists {
			if _, exists := room[client.ID]; exists {
				close(client.Send)
				client.Conn.Close()
				delete(room, client.ID)
				
				// Remove empty rooms
				if len(room) == 0 {
					delete(h.Rooms, client.EventID)
				}
				
				// Broadcast presence update
				presentCount := h.getPresentUserCountLocked(client.EventID)
				h.broadcastPresenceUpdate(client.EventID, presentCount)
			}
		}
	}
	
	if len(staleClients) > 0 {
		log.Printf("Removed %d stale connections", len(staleClients))
	}
}

// ClearAllConnections forcibly disconnects non-admin users from an event room
// Admin users stay connected to continue monitoring
func (h *Hub) ClearAllConnections(eventID uuid.UUID) int {
	h.mutex.Lock()
	defer h.mutex.Unlock()
	
	room, exists := h.Rooms[eventID]
	if !exists {
		log.Printf("No connections to clear for event %s", eventID)
		return 0
	}
	
	// Count non-admin clients for reporting
	var nonAdminClients []*Client
	for _, client := range room {
		// Disconnect if user is NOT an admin
		if !client.IsAdmin {
			nonAdminClients = append(nonAdminClients, client)
		}
	}
	
	if len(nonAdminClients) == 0 {
		log.Printf("No non-admin connections to clear for event %s", eventID)
		return 0
	}
	
	// Send disconnect notification to non-admin clients only
	disconnectMessage := WebSocketMessage{
		Type:      "ADMIN_DISCONNECT",
		EventID:   eventID,
		Data: map[string]interface{}{
			"message": "You have been disconnected by an administrator. Please refresh the page to reconnect to the event.",
			"reason": "admin_disconnect",
		},
		Timestamp: getCurrentTimestamp(),
	}
	
	for _, client := range nonAdminClients {
		select {
		case client.Send <- disconnectMessage:
			log.Printf("Sent disconnect notification to non-admin client %s (Admin: %v)", client.ID, client.IsAdmin)
		default:
			log.Printf("Failed to send disconnect notification to non-admin client %s (Admin: %v)", client.ID, client.IsAdmin)
		}
	}
	
	// Wait a moment for messages to be sent
	h.mutex.Unlock()
	time.Sleep(100 * time.Millisecond)
	h.mutex.Lock()
	
	// Now forcibly disconnect non-admin clients only
	var disconnectedCount int
	for clientID, client := range room {
		// Disconnect if user is NOT an admin
		if !client.IsAdmin {
			log.Printf("Forcibly disconnecting non-admin client %s from event %s (Admin: %v)", clientID, eventID, client.IsAdmin)
			close(client.Send)
			client.Conn.Close()
			delete(room, clientID)
			disconnectedCount++
		}
	}
	
	// After disconnecting non-admin users, send updated presence count to remaining admins
	// Count remaining users (should only be admin users now)
	presentCount := 0
	userSet := make(map[uuid.UUID]bool)
	for _, client := range room {
		userSet[client.UserID] = true
	}
	presentCount = len(userSet)
	
	// Send updated presence count to admin users immediately
	go func() {
		h.BroadcastToAdmins(eventID, MessageTypeAttendanceStatsUpdate, map[string]interface{}{
			"presentCount": presentCount,
			"eventId":      eventID,
			"type":         "presence_update",
		})
		log.Printf("DEBUG: Sent presence update to admins after disconnect - presentCount: %d", presentCount)
	}()
	
	log.Printf("Cleared %d non-admin connections from event %s, keeping admin connections", disconnectedCount, eventID)
	
	return disconnectedCount
}

// GetConnectionInfo returns debug information about current connections
func (h *Hub) GetConnectionInfo(eventID uuid.UUID) map[string]interface{} {
	h.mutex.RLock()
	defer h.mutex.RUnlock()
	
	room, exists := h.Rooms[eventID]
	if !exists {
		return map[string]interface{}{
			"eventId": eventID.String(),
			"totalConnections": 0,
			"uniqueUsers": 0,
			"connections": []map[string]interface{}{},
		}
	}
	
	var connections []map[string]interface{}
	userSet := make(map[uuid.UUID]bool)
	
	for clientID, client := range room {
		connections = append(connections, map[string]interface{}{
			"clientId": clientID.String(),
			"userId": client.UserID.String(),
			"isAdmin": client.IsAdmin,
			"lastHeartbeat": client.LastHeartbeat.Format(time.RFC3339),
			"secondsSinceHeartbeat": time.Since(client.LastHeartbeat).Seconds(),
		})
		userSet[client.UserID] = true
	}
	
	return map[string]interface{}{
		"eventId": eventID.String(),
		"totalConnections": len(room),
		"uniqueUsers": len(userSet),
		"connections": connections,
	}
}

// WebSocket upgrader with CORS support
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins in development, restrict in production
		return true
	},
}

// HandleWebSocket handles WebSocket connection upgrades
func (h *Hub) HandleWebSocket(w http.ResponseWriter, r *http.Request, eventID uuid.UUID, userID uuid.UUID, isAdmin bool) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	client := &Client{
		ID:            uuid.New(),
		EventID:       eventID,
		UserID:        userID,
		Conn:          conn,
		Send:          make(chan WebSocketMessage, 256),
		IsAdmin:       isAdmin,
		LastHeartbeat: time.Now(),
	}

	// Register client
	h.Register <- client

	// Start goroutines for reading and writing
	go h.writePump(client)
	go h.readPump(client)
}

// readPump handles incoming messages from client
func (h *Hub) readPump(client *Client) {
	defer func() {
		h.Unregister <- client
		client.Conn.Close()
	}()

	for {
		_, message, err := client.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}
		
		// Parse incoming message
		var wsMsg WebSocketMessage
		if err := json.Unmarshal(message, &wsMsg); err != nil {
			log.Printf("Error parsing WebSocket message: %v", err)
			continue
		}
		
		// Handle PING messages
		if wsMsg.Type == MessageTypePing {
			// Update client's heartbeat time
			h.updateClientHeartbeat(client)
			
			// Respond with PONG
			pongMessage := WebSocketMessage{
				Type:      MessageTypePong,
				EventID:   client.EventID,
				Data:      nil,
				Timestamp: getCurrentTimestamp(),
			}
			
			select {
			case client.Send <- pongMessage:
				log.Printf("Sent PONG to client %s", client.ID)
			default:
				log.Printf("Failed to send PONG to client %s", client.ID)
			}
		}
	}
}

// writePump handles outgoing messages to client
func (h *Hub) writePump(client *Client) {
	defer client.Conn.Close()

	for {
		select {
		case message, ok := <-client.Send:
			if !ok {
				client.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := client.Conn.WriteJSON(message); err != nil {
				log.Printf("WebSocket write error: %v", err)
				return
			}
		}
	}
}