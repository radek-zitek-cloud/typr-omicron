import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { AppProvider, useAppContext } from './AppContext'
import TypingTest from './TypingTest'
import Analyzer from './Analyzer'
import History from './History'
import Settings from './Settings'
import UserProfile from './UserProfile'
import './App.css'

function BackendStatus() {
  const { backendReady, checkBackendHealth } = useAppContext();
  
  const handleReconnect = async () => {
    await checkBackendHealth();
  };
  
  return (
    <div className={`backend-status ${backendReady ? 'connected' : 'disconnected'}`}>
      <span className="status-indicator">
        {backendReady ? '🟢' : '🔴'}
      </span>
      <span className="status-text">
        {backendReady ? 'Backend Connected' : 'Backend Offline'}
      </span>
      {!backendReady && (
        <button onClick={handleReconnect} className="reconnect-btn" title="Try to reconnect">
          🔄
        </button>
      )}
    </div>
  );
}

function Navigation() {
  const location = useLocation();
  
  return (
    <nav className="main-nav">
      <div className="nav-links">
        <Link 
          to="/" 
          className={location.pathname === '/' ? 'nav-link active' : 'nav-link'}
        >
          Typing Test
        </Link>
        <Link 
          to="/history" 
          className={location.pathname === '/history' ? 'nav-link active' : 'nav-link'}
        >
          History
        </Link>
        <Link 
          to="/analyzer" 
          className={location.pathname === '/analyzer' ? 'nav-link active' : 'nav-link'}
        >
          Analyzer
        </Link>
        <Link 
          to="/settings" 
          className={location.pathname === '/settings' ? 'nav-link active' : 'nav-link'}
        >
          Settings
        </Link>
      </div>
      <div className="nav-right">
        <BackendStatus />
        <UserProfile />
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <div className="app-container">
          <Navigation />
          <Routes>
            <Route path="/" element={<TypingTest />} />
            <Route path="/history" element={<History />} />
            <Route path="/analyzer" element={<Analyzer />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </AppProvider>
    </BrowserRouter>
  )
}

export default App
