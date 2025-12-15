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
      const wasBackendReady = backendReady;
      setBackendReady(isHealthy);
      setUseBackend(isHealthy);
      
      if (isHealthy && !wasBackendReady) {
        console.log('✅ Backend connected - using database storage');
      } else if (!isHealthy && wasBackendReady) {
        console.log('⚠️ Backend disconnected - falling back to localStorage');
      } else if (isHealthy) {
        console.log('✅ Backend healthy - using database storage');
      } else {
        console.log('⚠️ Backend unavailable - using localStorage');
      }
    };
    
    // Initial check
    checkBackend();
    
    // Periodic health check every 10 seconds
    const healthCheckInterval = setInterval(checkBackend, 10000);
    
    return () => clearInterval(healthCheckInterval);
  }, [backendReady]);
  
  // Load initial users from localStorage
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const storedCurrentUserId = localStorage.getItem('typr_current_user');
      if (storedCurrentUserId) {
        const storedUsers = localStorage.getItem('typr_users');
        if (storedUsers) {
          const parsedUsers = JSON.parse(storedUsers);
          const user = parsedUsers.find(u => u.userId === storedCurrentUserId);
          if (user) return user;
        }
      }
    } catch (error) {
      console.error('Failed to load user from localStorage:', error);
    }
    return DEFAULT_USER;
  });
  
  const [users, setUsers] = useState(() => {
    try {
      const storedUsers = localStorage.getItem('typr_users');
      if (storedUsers) {
        return JSON.parse(storedUsers);
      }
    } catch (error) {
      console.error('Failed to load users from localStorage:', error);
    }
    return [DEFAULT_USER];
  });
  
  // Sync users from backend when it becomes available
  useEffect(() => {
    const syncUsersFromBackend = async () => {
      if (!useBackend) {
        console.log('Backend not available, skipping user sync');
        return;
      }
      
      try {
        console.log('Syncing users from backend...');
        const backendUsers = await apiService.getUsers();
        console.log(`Loaded ${backendUsers.length} users from backend`);
        
        // Transform backend users to frontend format
        const formattedUsers = await Promise.all(
          backendUsers.map(async (backendUser) => {
            try {
              const settings = await apiService.getSettings(backendUser.user_id);
              return {
                userId: backendUser.user_id,
                username: backendUser.username,
                settings,
                sessions: []
              };
            } catch (error) {
              console.error(`Failed to load settings for user ${backendUser.user_id}:`, error);
              return {
                userId: backendUser.user_id,
                username: backendUser.username,
                settings: {
                  font: 'Courier New',
                  fontSize: 'M',
                  theme: 'dark',
                  soundEnabled: false
                },
                sessions: []
              };
            }
          })
        );
        
        setUsers(formattedUsers);
        
        // If current user doesn't exist in backend users, switch to guest
        const currentUserExists = formattedUsers.find(u => u.userId === currentUser.userId);
        if (!currentUserExists) {
          console.log('Current user not found in backend, switching to guest');
          const guestUser = formattedUsers.find(u => u.userId === 'guest');
          if (guestUser) {
            setCurrentUser(guestUser);
          }
        } else {
          // Update current user with backend data
          setCurrentUser(currentUserExists);
        }
        
        console.log('Users synced successfully from backend');
      } catch (error) {
        console.error('Failed to sync users from backend:', error);
      }
    };
    
    if (useBackend) {
      syncUsersFromBackend();
    }
  }, [useBackend]); // Only run when backend availability changes
  
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
    console.log('Creating user:', username);
    
    // Try to save to backend if available
    if (useBackend) {
      try {
        console.log('Creating user in backend...');
        const createdUser = await apiService.createUser(username);
        console.log('User created in backend:', createdUser.user_id);
        
        // Fetch settings for the new user
        const settings = await apiService.getSettings(createdUser.user_id);
        
        const userWithSettings = {
          userId: createdUser.user_id,
          username: createdUser.username,
          settings,
          sessions: []
        };
        
        setUsers(prev => [...prev, userWithSettings]);
        setCurrentUser(userWithSettings);
        return userWithSettings;
      } catch (error) {
        console.error('Failed to create user in backend:', error);
        alert('Failed to create user in backend. Using localStorage instead.');
      }
    } else {
      console.log('Backend not available, creating user in localStorage');
    }
    
    // Fallback to localStorage
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
    
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    return newUser;
  };

  const switchUser = async (userId) => {
    console.log('Switching to user:', userId);
    
    // Try to load from backend if available
    if (useBackend) {
      try {
        console.log('Loading user from backend...');
        const backendUser = await apiService.getUser(userId);
        const settings = await apiService.getSettings(userId);
        
        const user = {
          userId: backendUser.user_id,
          username: backendUser.username,
          settings,
          sessions: []
        };
        
        console.log('User loaded from backend:', user.username);
        setCurrentUser(user);
        
        // Update users list if this user isn't in it
        setUsers(prev => {
          const exists = prev.find(u => u.userId === userId);
          if (!exists) {
            return [...prev, user];
          }
          return prev.map(u => u.userId === userId ? user : u);
        });
        return;
      } catch (error) {
        console.error('Failed to load user from backend:', error);
        console.log('Falling back to localStorage');
      }
    }
    
    // Fallback to localStorage
    const user = users.find(u => u.userId === userId);
    if (user) {
      console.log('Switched to user from localStorage:', user.username);
      setCurrentUser(user);
    } else {
      console.warn('User not found:', userId);
    }
  };

  const updateUserSettings = async (settings) => {
    if (!currentUser) {
      console.warn('Cannot update settings: no current user');
      return;
    }
    
    console.log('Updating user settings:', settings);
    
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
        console.log('Saving settings to backend...');
        await apiService.updateSettings(currentUser.userId, settings);
        console.log('Settings saved to backend');
        setCurrentUser(updatedUser);
        setUsers(prev => prev.map(u => 
          u.userId === currentUser.userId ? updatedUser : u
        ));
        return;
      } catch (error) {
        console.error('Failed to update settings in backend:', error);
        console.log('Falling back to localStorage');
      }
    } else {
      console.log('Backend not available, saving settings to localStorage');
    }
    
    // Fallback to localStorage
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => 
      u.userId === currentUser.userId ? updatedUser : u
    ));
  };

  const saveSession = async (sessionData) => {
    if (!currentUser) {
      console.error('Cannot save session: no current user');
      return null;
    }
    
    const sessionId = `session_${Date.now()}`;
    const sessionWithId = {
      ...sessionData,
      sessionId,
      userId: currentUser.userId,
      mode: testConfig.mode,
      modeValue: testConfig.mode === 'time' ? testConfig.timeLimit : testConfig.wordCount
    };
    
    console.log('Attempting to save session:', { sessionId, userId: currentUser.userId, mode: testConfig.mode });
    
    // Try to save to backend if available
    if (useBackend) {
      try {
        console.log('Saving session to backend...');
        const savedSession = await apiService.createSession(sessionWithId);
        console.log('Session saved to backend successfully:', savedSession.sessionId);
        
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
        console.error('Failed to save session to backend:', error);
        console.log('Falling back to localStorage');
      }
    } else {
      console.log('Backend not available, using localStorage');
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
    if (!currentUser) {
      console.warn('Cannot get sessions: no current user');
      return [];
    }
    
    console.log('Fetching sessions for user:', currentUser.userId);
    
    // Try to load from backend if available
    if (useBackend) {
      try {
        console.log('Fetching sessions from backend...');
        const sessions = await apiService.getUserSessions(currentUser.userId);
        console.log(`Loaded ${sessions.length} sessions from backend`);
        return sessions;
      } catch (error) {
        console.error('Failed to load sessions from backend:', error);
        console.log('Falling back to localStorage');
      }
    } else {
      console.log('Backend not available, using localStorage');
    }
    
    // Fallback to localStorage
    return currentUser.sessions
      .map(sessionId => {
        try {
          const sessionData = localStorage.getItem(`typr_session_${sessionId}`);
          return sessionData ? JSON.parse(sessionData) : null;
        } catch (error) {
          console.error(`Failed to parse session ${sessionId}:`, error);
          return null;
        }
      })
      .filter(session => session !== null);
  };

  const checkBackendHealth = async () => {
    const isHealthy = await apiService.checkHealth();
    setBackendReady(isHealthy);
    setUseBackend(isHealthy);
    return isHealthy;
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
    backendReady,
    checkBackendHealth
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

AppProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default AppContext;
