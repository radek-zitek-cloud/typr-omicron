import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { AppProvider } from './AppContext'
import TypingTest from './TypingTest'
import Analyzer from './Analyzer'
import History from './History'
import Settings from './Settings'
import UserProfile from './UserProfile'
import './App.css'

function Navigation() {
  const location = useLocation();
  
  return (
    <nav className="main-nav">
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
      <UserProfile />
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
