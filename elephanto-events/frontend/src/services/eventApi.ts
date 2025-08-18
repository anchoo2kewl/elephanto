import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

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
  countdownEnabled: boolean;
  cocktailSelectionEnabled: boolean;
  surveyEnabled: boolean;
  theHourEnabled: boolean;
  theHourActiveDate?: string;
  theHourLink?: string;
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
    const response = await axios.get(`${API_BASE_URL}/api/events/active`, {
      headers: createAuthHeaders(),
    });
    return response;
  },

  // Admin endpoints (require admin role)
  admin: {
    // Get all events
    getAllEvents: async (): Promise<{ data: Event[] }> => {
      const response = await axios.get(`${API_BASE_URL}/api/admin/events`, {
        headers: createAuthHeaders(),
      });
      return response;
    },

    // Get single event with details
    getEvent: async (eventId: string): Promise<{ data: EventWithDetails }> => {
      const response = await axios.get(`${API_BASE_URL}/api/admin/events/${eventId}`, {
        headers: createAuthHeaders(),
      });
      return response;
    },

    // Create new event
    createEvent: async (eventData: any): Promise<{ data: any }> => {
      const response = await axios.post(`${API_BASE_URL}/api/admin/events`, eventData, {
        headers: createAuthHeaders(),
      });
      return response;
    },

    // Update event
    updateEvent: async (eventId: string, eventData: any): Promise<{ data: any }> => {
      const response = await axios.put(`${API_BASE_URL}/api/admin/events/${eventId}`, eventData, {
        headers: createAuthHeaders(),
      });
      return response;
    },

    // Delete event
    deleteEvent: async (eventId: string): Promise<{ data: any }> => {
      const response = await axios.delete(`${API_BASE_URL}/api/admin/events/${eventId}`, {
        headers: createAuthHeaders(),
      });
      return response;
    },

    // Activate event
    activateEvent: async (eventId: string): Promise<{ data: any }> => {
      const response = await axios.put(`${API_BASE_URL}/api/admin/events/${eventId}/activate`, {}, {
        headers: createAuthHeaders(),
      });
      return response;
    },

    // Event details management
    createEventDetail: async (eventId: string, detailData: any): Promise<{ data: any }> => {
      const response = await axios.post(`${API_BASE_URL}/api/admin/events/${eventId}/details`, detailData, {
        headers: createAuthHeaders(),
      });
      return response;
    },

    updateEventDetail: async (eventId: string, detailId: string, detailData: any): Promise<{ data: any }> => {
      const response = await axios.put(`${API_BASE_URL}/api/admin/events/${eventId}/details/${detailId}`, detailData, {
        headers: createAuthHeaders(),
      });
      return response;
    },

    deleteEventDetail: async (eventId: string, detailId: string): Promise<{ data: any }> => {
      const response = await axios.delete(`${API_BASE_URL}/api/admin/events/${eventId}/details/${detailId}`, {
        headers: createAuthHeaders(),
      });
      return response;
    },

    // Event FAQ management
    createEventFAQ: async (eventId: string, faqData: any): Promise<{ data: any }> => {
      const response = await axios.post(`${API_BASE_URL}/api/admin/events/${eventId}/faqs`, faqData, {
        headers: createAuthHeaders(),
      });
      return response;
    },

    updateEventFAQ: async (eventId: string, faqId: string, faqData: any): Promise<{ data: any }> => {
      const response = await axios.put(`${API_BASE_URL}/api/admin/events/${eventId}/faqs/${faqId}`, faqData, {
        headers: createAuthHeaders(),
      });
      return response;
    },

    deleteEventFAQ: async (eventId: string, faqId: string): Promise<{ data: any }> => {
      const response = await axios.delete(`${API_BASE_URL}/api/admin/events/${eventId}/faqs/${faqId}`, {
        headers: createAuthHeaders(),
      });
      return response;
    },
  },
};