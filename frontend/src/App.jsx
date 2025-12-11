import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import TypingTest from './TypingTest'
import Analyzer from './Analyzer'
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
        to="/analyzer" 
        className={location.pathname === '/analyzer' ? 'nav-link active' : 'nav-link'}
      >
        Analyzer
      </Link>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Navigation />
        <Routes>
          <Route path="/" element={<TypingTest />} />
          <Route path="/analyzer" element={<Analyzer />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
