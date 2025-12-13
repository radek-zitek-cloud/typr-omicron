// API service for communicating with the backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const BACKEND_BASE_URL = API_BASE_URL.substring(0, API_BASE_URL.lastIndexOf('/'));

class ApiService {
  // Users API
  async getUsers() {
    const response = await fetch(`${API_BASE_URL}/users`);
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    return response.json();
  }

  async getUser(userId) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }
    return response.json();
  }

  async createUser(username) {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    if (!response.ok) {
      throw new Error('Failed to create user');
    }
    return response.json();
  }

  async deleteUser(userId) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error('Failed to delete user');
    }
  }

  // Settings API
  async getSettings(userId) {
    const response = await fetch(`${API_BASE_URL}/settings/${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch settings');
    }
    return response.json();
  }

  async updateSettings(userId, settings) {
    const response = await fetch(`${API_BASE_URL}/settings/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!response.ok) {
      throw new Error('Failed to update settings');
    }
    return response.json();
  }

  // Sessions API
  async getUserSessions(userId, limit = null, offset = null) {
    let url = `${API_BASE_URL}/sessions/user/${userId}`;
    const params = new URLSearchParams();
    
    if (limit) params.append('limit', limit);
    if (offset) params.append('offset', offset);
    
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch sessions');
    }
    return response.json();
  }

  async getSession(sessionId) {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch session');
    }
    return response.json();
  }

  async createSession(sessionData) {
    const response = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData)
    });
    if (!response.ok) {
      throw new Error('Failed to create session');
    }
    return response.json();
  }

  async deleteSession(sessionId) {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error('Failed to delete session');
    }
  }

  // Health check
  async checkHealth() {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/health`);
      if (!response.ok) {
        return false;
      }
      const data = await response.json();
      return data.status === 'ok';
    } catch {
      return false;
    }
  }
}

export default new ApiService();
