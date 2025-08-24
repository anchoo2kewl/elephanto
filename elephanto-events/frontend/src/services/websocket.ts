import React from 'react';
import { api } from './api';

// WebSocket message types (matching backend constants)
export const MESSAGE_TYPES = {
  USER_JOINED_EVENT: 'USER_JOINED_EVENT',
  USER_LEFT_EVENT: 'USER_LEFT_EVENT',
  USER_MARKED_ATTENDING: 'USER_MARKED_ATTENDING',
  VELVET_HOUR_PARTICIPANT_JOINED: 'VELVET_HOUR_PARTICIPANT_JOINED',
  VELVET_HOUR_SESSION_STARTED: 'VELVET_HOUR_SESSION_STARTED',
  VELVET_HOUR_ROUND_STARTED: 'VELVET_HOUR_ROUND_STARTED',
  VELVET_HOUR_MATCH_CONFIRMED: 'VELVET_HOUR_MATCH_CONFIRMED',
  VELVET_HOUR_FEEDBACK_SUBMITTED: 'VELVET_HOUR_FEEDBACK_SUBMITTED',
  VELVET_HOUR_SESSION_ENDED: 'VELVET_HOUR_SESSION_ENDED',
  ATTENDANCE_STATS_UPDATE: 'ATTENDANCE_STATS_UPDATE',
  VELVET_HOUR_STATUS_UPDATE: 'VELVET_HOUR_STATUS_UPDATE',
  PING: 'PING',
  PONG: 'PONG',
  ADMIN_DISCONNECT: 'ADMIN_DISCONNECT',
};

// WebSocket message interface
export interface WebSocketMessage {
  type: string;
  eventId: string;
  data: any;
  timestamp: number;
}

// WebSocket event handler type
export type WebSocketEventHandler = (data: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private eventHandlers: Map<string, Set<WebSocketEventHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private eventId: string | null = null;
  private isConnecting = false;
  private isAuthenticated = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 10000; // 10 seconds
  private disconnectCallback: ((message: string) => void) | null = null;
  private adminDisconnected = false; // Flag to prevent auto-reconnection after admin disconnect

  constructor() {
    // Check authentication status on initialization
    this.checkAuthStatus();
    
    // Add page unload listeners to properly disconnect WebSocket
    this.setupUnloadListeners();
  }

  private async checkAuthStatus() {
    try {
      const token = localStorage.getItem('auth_token');
      this.isAuthenticated = !!token;
    } catch (error) {
      console.error('Error checking auth status:', error);
      this.isAuthenticated = false;
    }
  }

  private setupUnloadListeners() {
    // Handle page navigation/closing
    const handleUnload = () => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        // Send close frame synchronously before page unloads
        this.socket.close(1000, 'Page unloading');
        console.log('WebSocket closed due to page unload');
      }
    };

    // Multiple event listeners to catch different scenarios
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('unload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    
    // Also handle visibility changes (when user switches tabs or minimizes)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.socket?.readyState === WebSocket.OPEN) {
        // Don't close immediately, just log for debugging
        console.log('Page became hidden, WebSocket connection maintained');
      }
    });
  }

  private startHeartbeat() {
    // Clear any existing heartbeat
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        // Send ping message
        this.socket.send(JSON.stringify({
          type: 'PING',
          eventId: this.eventId,
          timestamp: Date.now()
        }));
        console.log('Heartbeat ping sent');
      } else {
        // Connection is not open, stop heartbeat
        this.stopHeartbeat();
      }
    }, this.HEARTBEAT_INTERVAL);
    
    console.log(`Heartbeat started (${this.HEARTBEAT_INTERVAL}ms interval)`);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('Heartbeat stopped');
    }
  }

  // Connect to WebSocket for a specific event
  async connect(eventId: string): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN && this.eventId === eventId) {
      return; // Already connected to this event
    }

    if (this.isConnecting) {
      return; // Connection attempt in progress
    }

    if (!this.isAuthenticated) {
      await this.checkAuthStatus();
      if (!this.isAuthenticated) {
        throw new Error('User not authenticated');
      }
    }

    // Reset admin disconnect flag when manually connecting (e.g., page refresh)
    this.adminDisconnected = false;
    this.eventId = eventId;
    this.isConnecting = true;

    try {
      await this.establishConnection();
    } catch (error) {
      this.isConnecting = false;
      throw error;
    }
  }

  private async establishConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.eventId) {
        reject(new Error('No event ID specified'));
        return;
      }

      // Close existing connection if any
      if (this.socket) {
        this.socket.close();
      }

      const token = localStorage.getItem('auth_token');
      if (!token) {
        reject(new Error('No authentication token found'));
        return;
      }

      // Get WebSocket URL using similar logic to API service
      const getWebSocketURL = () => {
        // First try to get from runtime config
        if (typeof window !== 'undefined' && (window as any).__APP_CONFIG__?.API_URL !== undefined) {
          const runtimeApiUrl = (window as any).__APP_CONFIG__.API_URL;
          if (runtimeApiUrl !== '') {
            return runtimeApiUrl;
          }
          return window.location.origin;
        }
        
        // Fallback to build-time environment variable
        return (import.meta as any).env.VITE_API_URL || 'http://localhost:8080';
      };

      const baseUrl = getWebSocketURL();
      const wsProtocol = baseUrl.startsWith('https://') ? 'wss:' : 'ws:';
      const wsHost = baseUrl.replace(/^https?:/, wsProtocol);
      
      // Include token as query parameter since WebSocket doesn't support custom headers
      const wsUrl = `${wsHost}/api/ws/${this.eventId}?token=${encodeURIComponent(token)}`;

      try {
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          console.log(`WebSocket connected to event ${this.eventId}`);
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          // Start heartbeat after connection opens
          this.startHeartbeat();
          // Trigger a custom event to let components know WebSocket is ready
          // This allows components to refresh their state when connection is established
          window.dispatchEvent(new CustomEvent('websocket-connected', { 
            detail: { eventId: this.eventId } 
          }));
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.socket.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
          this.isConnecting = false;
          // Stop heartbeat when connection closes
          this.stopHeartbeat();
          
          if (event.code !== 1000) { // Not a normal closure
            this.attemptReconnect();
          }
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private attemptReconnect() {
    if (this.adminDisconnected) {
      console.log('Reconnection blocked: User was disconnected by administrator');
      return;
    }
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(async () => {
      if (this.eventId && this.isAuthenticated) {
        try {
          await this.establishConnection();
        } catch (error) {
          console.error('Reconnection failed:', error);
        }
      }
    }, delay);
  }

  private handleMessage(message: WebSocketMessage) {
    console.log('WebSocket message received:', message);

    // Handle PONG messages
    if (message.type === MESSAGE_TYPES.PONG) {
      console.log('Received PONG response');
      return;
    }

    // Handle admin disconnect message
    if (message.type === MESSAGE_TYPES.ADMIN_DISCONNECT) {
      console.log('Received admin disconnect notification');
      this.adminDisconnected = true; // Prevent auto-reconnection
      if (this.disconnectCallback) {
        this.disconnectCallback(message.data.message);
      }
      return;
    }

    const handlers = this.eventHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message.data);
        } catch (error) {
          console.error('Error in WebSocket event handler:', error);
        }
      });
    }
  }

  // Subscribe to specific message types
  on(messageType: string, handler: WebSocketEventHandler) {
    if (!this.eventHandlers.has(messageType)) {
      this.eventHandlers.set(messageType, new Set());
    }
    this.eventHandlers.get(messageType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.off(messageType, handler);
    };
  }

  // Unsubscribe from message types
  off(messageType: string, handler: WebSocketEventHandler) {
    const handlers = this.eventHandlers.get(messageType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(messageType);
      }
    }
  }

  // Disconnect WebSocket
  disconnect() {
    // Stop heartbeat first
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.close(1000, 'Client disconnecting');
      this.socket = null;
    }
    this.eventId = null;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    console.log('WebSocket disconnected');
  }

  // Check connection status
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  // Get current event ID
  getCurrentEventId(): string | null {
    return this.eventId;
  }

  // Clear all event handlers
  clearAllHandlers() {
    this.eventHandlers.clear();
  }

  // Update authentication status (call when user logs in/out)
  setAuthenticated(isAuth: boolean) {
    this.isAuthenticated = isAuth;
    if (!isAuth) {
      this.disconnect();
    }
  }

  // Set callback for admin disconnect notifications
  setDisconnectCallback(callback: (message: string) => void) {
    this.disconnectCallback = callback;
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();

// Hook for React components
export function useWebSocket(eventId?: string) {
  const [isConnected, setIsConnected] = React.useState(websocketService.isConnected());

  React.useEffect(() => {
    let mounted = true;

    const connect = async () => {
      if (eventId && !websocketService.isConnected()) {
        try {
          await websocketService.connect(eventId);
          if (mounted) setIsConnected(true);
        } catch (error) {
          console.error('Failed to connect WebSocket:', error);
          if (mounted) setIsConnected(false);
        }
      }
    };

    connect();

    // Set up connection status monitoring
    const checkConnection = () => {
      if (mounted) {
        setIsConnected(websocketService.isConnected());
      }
    };

    const interval = setInterval(checkConnection, 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [eventId]);

  const subscribe = React.useCallback((messageType: string, handler: WebSocketEventHandler) => {
    return websocketService.on(messageType, handler);
  }, []);

  return {
    isConnected,
    subscribe,
    disconnect: websocketService.disconnect.bind(websocketService),
    websocketService,
  };
}

