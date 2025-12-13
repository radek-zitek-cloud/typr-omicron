import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import apiService from './apiService';

const AppContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}

const DEFAULT_USER = {
  userId: 'guest',
  username: 'Guest',
  settings: {
    font: 'Courier New',
    fontSize: 'M',
    theme: 'dark',
    soundEnabled: false
  },
  sessions: []
};

export function AppProvider({ children }) {
  const [useBackend, setUseBackend] = useState(false);
  const [backendReady, setBackendReady] = useState(false);
  
  // Check if backend is available
  useEffect(() => {
    const checkBackend = async () => {
      const isHealthy = await apiService.checkHealth();
      setBackendReady(isHealthy);
      setUseBackend(isHealthy);
      
      if (isHealthy) {
        console.log('Backend connected - using database storage');
      } else {
        console.log('Backend unavailable - using localStorage');
      }
    };
    
    checkBackend();
  }, []);
  
  // Load initial users from localStorage or backend
  const [currentUser, setCurrentUser] = useState(() => {
    const storedUsers = localStorage.getItem('typr_users');
    const storedCurrentUserId = localStorage.getItem('typr_current_user');
    
    if (storedUsers) {
      const parsedUsers = JSON.parse(storedUsers);
      if (storedCurrentUserId) {
        const user = parsedUsers.find(u => u.userId === storedCurrentUserId);
        return user || DEFAULT_USER;
      }
    }
    return DEFAULT_USER;
  });
  
  const [users, setUsers] = useState(() => {
    const storedUsers = localStorage.getItem('typr_users');
    if (storedUsers) {
      return JSON.parse(storedUsers);
    }
    return [DEFAULT_USER];
  });
  
  const [testConfig, setTestConfig] = useState({
    mode: 'time', // 'time' or 'words'
    timeLimit: 60, // in seconds
    wordCount: 50,
    wordSource: 'common1k'
  });

  // Save users to localStorage whenever they change
  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem('typr_users', JSON.stringify(users));
    }
  }, [users]);

  // Save current user ID to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('typr_current_user', currentUser.userId);
    }
  }, [currentUser]);

  const createUser = async (username) => {
    const newUser = {
      userId: `user_${Date.now()}`,
      username,
      settings: {
        font: 'Courier New',
        fontSize: 'M',
        theme: 'dark',
        soundEnabled: false
      },
      sessions: []
    };
    
    // Try to save to backend if available
    if (useBackend) {
      try {
        const createdUser = await apiService.createUser(username);
        const userWithSettings = {
          userId: createdUser.user_id,
          username: createdUser.username,
          settings: newUser.settings,
          sessions: []
        };
        setUsers(prev => [...prev, userWithSettings]);
        setCurrentUser(userWithSettings);
        return userWithSettings;
      } catch (error) {
        console.error('Failed to create user in backend, using localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    return newUser;
  };

  const switchUser = async (userId) => {
    // Try to load from backend if available
    if (useBackend) {
      try {
        const backendUser = await apiService.getUser(userId);
        const settings = await apiService.getSettings(userId);
        
        const user = {
          userId: backendUser.user_id,
          username: backendUser.username,
          settings,
          sessions: []
        };
        
        setCurrentUser(user);
        return;
      } catch (error) {
        console.error('Failed to load user from backend, using localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    const user = users.find(u => u.userId === userId);
    if (user) {
      setCurrentUser(user);
    }
  };

  const updateUserSettings = async (settings) => {
    if (!currentUser) return;
    
    const updatedUser = {
      ...currentUser,
      settings: {
        ...currentUser.settings,
        ...settings
      }
    };
    
    // Try to save to backend if available
    if (useBackend) {
      try {
        await apiService.updateSettings(currentUser.userId, settings);
        setCurrentUser(updatedUser);
        setUsers(prev => prev.map(u => 
          u.userId === currentUser.userId ? updatedUser : u
        ));
        return;
      } catch (error) {
        console.error('Failed to update settings in backend, using localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => 
      u.userId === currentUser.userId ? updatedUser : u
    ));
  };

  const saveSession = async (sessionData) => {
    if (!currentUser) return;
    
    const sessionId = `session_${Date.now()}`;
    const sessionWithId = {
      ...sessionData,
      sessionId,
      userId: currentUser.userId,
      mode: testConfig.mode,
      modeValue: testConfig.mode === 'time' ? testConfig.timeLimit : testConfig.wordCount
    };
    
    // Try to save to backend if available
    if (useBackend) {
      try {
        await apiService.createSession(sessionWithId);
        // Update user's session list in state
        const updatedUser = {
          ...currentUser,
          sessions: [sessionId, ...currentUser.sessions]
        };
        setCurrentUser(updatedUser);
        setUsers(prev => prev.map(u => 
          u.userId === currentUser.userId ? updatedUser : u
        ));
        return sessionId;
      } catch (error) {
        console.error('Failed to save session to backend, using localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    localStorage.setItem(`typr_session_${sessionId}`, JSON.stringify(sessionWithId));
    
    // Update user's session list
    const updatedUser = {
      ...currentUser,
      sessions: [sessionId, ...currentUser.sessions]
    };
    
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => 
      u.userId === currentUser.userId ? updatedUser : u
    ));
    
    return sessionId;
  };

  const getSession = async (sessionId) => {
    // Try to load from backend if available
    if (useBackend) {
      try {
        const session = await apiService.getSession(sessionId);
        return session;
      } catch (error) {
        console.error('Failed to load session from backend, using localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    const sessionData = localStorage.getItem(`typr_session_${sessionId}`);
    return sessionData ? JSON.parse(sessionData) : null;
  };

  const getUserSessions = async () => {
    if (!currentUser) return [];
    
    // Try to load from backend if available
    if (useBackend) {
      try {
        const sessions = await apiService.getUserSessions(currentUser.userId);
        return sessions;
      } catch (error) {
        console.error('Failed to load sessions from backend, using localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    return currentUser.sessions
      .map(sessionId => {
        const sessionData = localStorage.getItem(`typr_session_${sessionId}`);
        return sessionData ? JSON.parse(sessionData) : null;
      })
      .filter(session => session !== null);
  };

  const value = {
    currentUser,
    users,
    testConfig,
    setTestConfig,
    createUser,
    switchUser,
    updateUserSettings,
    saveSession,
    getSession,
    getUserSessions,
    useBackend,
    backendReady
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

AppProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default AppContext;
