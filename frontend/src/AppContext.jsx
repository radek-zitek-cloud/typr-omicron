import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';

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
    theme: 'dark'
  },
  sessions: []
};

export function AppProvider({ children }) {
  // Load initial users from localStorage
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

  const createUser = (username) => {
    const newUser = {
      userId: `user_${Date.now()}`,
      username,
      settings: {
        font: 'Courier New',
        fontSize: 'M',
        theme: 'dark'
      },
      sessions: []
    };
    
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    return newUser;
  };

  const switchUser = (userId) => {
    const user = users.find(u => u.userId === userId);
    if (user) {
      setCurrentUser(user);
    }
  };

  const updateUserSettings = (settings) => {
    if (!currentUser) return;
    
    const updatedUser = {
      ...currentUser,
      settings: {
        ...currentUser.settings,
        ...settings
      }
    };
    
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => 
      u.userId === currentUser.userId ? updatedUser : u
    ));
  };

  const saveSession = (sessionData) => {
    if (!currentUser) return;
    
    const sessionId = `session_${Date.now()}`;
    const sessionWithId = {
      ...sessionData,
      sessionId,
      userId: currentUser.userId,
      mode: testConfig.mode,
      modeValue: testConfig.mode === 'time' ? testConfig.timeLimit : testConfig.wordCount
    };
    
    // Save to localStorage
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

  const getSession = (sessionId) => {
    const sessionData = localStorage.getItem(`typr_session_${sessionId}`);
    return sessionData ? JSON.parse(sessionData) : null;
  };

  const getUserSessions = () => {
    if (!currentUser) return [];
    
    return currentUser.sessions
      .map(sessionId => getSession(sessionId))
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
    getUserSessions
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

AppProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default AppContext;
