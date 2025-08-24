import axios from 'axios';

// Get API URL dynamically at request time (same logic as api.ts)
const getAPIURL = () => {
  // First try to get from runtime config injected by container startup
  if (typeof window !== 'undefined' && (window as any).__APP_CONFIG__?.API_URL !== undefined) {
    const runtimeApiUrl = (window as any).__APP_CONFIG__.API_URL;
    console.log('EventAPI Runtime API URL:', runtimeApiUrl);
    // If runtime config is not empty, use it directly
    if (runtimeApiUrl !== '') {
      return runtimeApiUrl;
    }
    // If runtime config is empty, use current domain (production case)
    console.log('EventAPI Using current domain:', window.location.origin);
    return window.location.origin;
  }
  
  // Fallback to build-time environment variable (for development)
  const fallback = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  console.log('EventAPI Using fallback API URL:', fallback);
  return fallback;
};

// Event types
export interface Event {
  id: string;
  title: string;
  tagline?: string;
  date: string;
  time: string;
  entryTime?: string;
  location: string;
  address?: string;
  attire?: string;
  ageRange?: string;
  description?: string;
  isActive: boolean;
  ticketUrl?: string;
  googleMapsEnabled: boolean;
  mapProvider?: 'google' | 'openstreetmap';
  countdownEnabled: boolean;
  cocktailSelectionEnabled: boolean;
  surveyEnabled: boolean;
  theHourEnabled: boolean;
  theHourActiveDate?: string;
  theHourAvailable: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface EventDetail {
  id: string;
  eventId: string;
  sectionType: string;
  title?: string;
  content?: string;
  icon?: string;
  displayOrder?: number;
  colorScheme?: string;
  createdAt: string;
}

export interface EventFAQ {
  id: string;
  eventId: string;
  question: string;
  answer: string;
  displayOrder?: number;
  colorGradient?: string;
  createdAt: string;
}

export interface EventWithDetails {
  event: Event;
  details: EventDetail[];
  faqs: EventFAQ[];
}

const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

const createAuthHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const eventApi = {
  // Get the currently active event (public endpoint)
  getActiveEvent: async (): Promise<{ data: EventWithDetails }> => {
    const apiUrl = getAPIURL();
    const response = await axios.get(`${apiUrl}/api/events/active`, {
      headers: createAuthHeaders(),
    });
    return response;
  },

  // Get user's attendance status for the active event
  getUserAttendance: async (): Promise<{ data: { attending: boolean; message: string } }> => {
    const apiUrl = getAPIURL();
    const response = await axios.get(`${apiUrl}/api/events/attendance`, {
      headers: createAuthHeaders(),
    });
    return response;
  },

  // Update user's attendance status for the active event
  updateUserAttendance: async (attending: boolean): Promise<{ data: { attending: boolean; message: string } }> => {
    const apiUrl = getAPIURL();
    const response = await axios.post(`${apiUrl}/api/events/attendance`, 
      { attending }, 
      {
        headers: createAuthHeaders(),
      }
    );
    return response;
  },

  // Admin endpoints (require admin role)
  admin: {
    // Get all events
    getAllEvents: async (): Promise<{ data: Event[] }> => {
      const apiUrl = getAPIURL();
      console.log('EventAPI getAllEvents URL:', `${apiUrl}/api/admin/events`);
      const response = await axios.get(`${apiUrl}/api/admin/events`, {
        headers: createAuthHeaders(),
      });
      return response;
    },

    // Get single event with details
    getEvent: async (eventId: string): Promise<{ data: EventWithDetails }> => {
      const apiUrl = getAPIURL();
      const response = await axios.get(`${apiUrl}/api/admin/events/${eventId}`, {
        headers: createAuthHeaders(),
      });
      return response;
    },

    // Create new event
    createEvent: async (eventData: any): Promise<{ data: any }> => {
      const apiUrl = getAPIURL();
      const response = await axios.post(`${apiUrl}/api/admin/events`, eventData, {
        headers: createAuthHeaders(),
      });
      return response;
    },

    // Update event
    updateEvent: async (eventId: string, eventData: any): Promise<{ data: any }> => {
      const apiUrl = getAPIURL();
      const response = await axios.put(`${apiUrl}/api/admin/events/${eventId}`, eventData, {
        headers: createAuthHeaders(),
      });
      return response;
    },

    // Delete event
    deleteEvent: async (eventId: string): Promise<{ data: any }> => {
      const apiUrl = getAPIURL();
      const response = await axios.delete(`${apiUrl}/api/admin/events/${eventId}`, {
        headers: createAuthHeaders(),
      });
      return response;
    },

    // Activate event
    activateEvent: async (eventId: string): Promise<{ data: any }> => {
      const apiUrl = getAPIURL();
      const response = await axios.put(`${apiUrl}/api/admin/events/${eventId}/activate`, {}, {
        headers: createAuthHeaders(),
      });
      return response;
    },

    // Event details management
    createEventDetail: async (eventId: string, detailData: any): Promise<{ data: any }> => {
      const apiUrl = getAPIURL();
      const response = await axios.post(`${apiUrl}/api/admin/events/${eventId}/details`, detailData, {
        headers: createAuthHeaders(),
      });
      return response;
    },

    updateEventDetail: async (eventId: string, detailId: string, detailData: any): Promise<{ data: any }> => {
      const apiUrl = getAPIURL();
      const response = await axios.put(`${apiUrl}/api/admin/events/${eventId}/details/${detailId}`, detailData, {
        headers: createAuthHeaders(),
      });
      return response;
    },

    deleteEventDetail: async (eventId: string, detailId: string): Promise<{ data: any }> => {
      const response = await axios.delete(`${getAPIURL()}/api/admin/events/${eventId}/details/${detailId}`, {
        headers: createAuthHeaders(),
      });
      return response;
    },

    // Event FAQ management
    createEventFAQ: async (eventId: string, faqData: any): Promise<{ data: any }> => {
      const apiUrl = getAPIURL();
      const response = await axios.post(`${apiUrl}/api/admin/events/${eventId}/faqs`, faqData, {
        headers: createAuthHeaders(),
      });
      return response;
    },

    updateEventFAQ: async (eventId: string, faqId: string, faqData: any): Promise<{ data: any }> => {
      const apiUrl = getAPIURL();
      const response = await axios.put(`${apiUrl}/api/admin/events/${eventId}/faqs/${faqId}`, faqData, {
        headers: createAuthHeaders(),
      });
      return response;
    },

    deleteEventFAQ: async (eventId: string, faqId: string): Promise<{ data: any }> => {
      const apiUrl = getAPIURL();
      const response = await axios.delete(`${apiUrl}/api/admin/events/${eventId}/faqs/${faqId}`, {
        headers: createAuthHeaders(),
      });
      return response;
    },
  },
};