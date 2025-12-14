import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from './AppContext';
import './History.css';

/**
 * History component displays a list of past typing test sessions.
 * Shows session details, performance metrics, and a WPM trend sparkline.
 * Provides navigation to detailed analysis for each session.
 */
function History() {
  const { getUserSessions } = useAppContext();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadSessions = async () => {
      setLoading(true);
      try {
        const data = await getUserSessions();
        setSessions(data || []);
      } catch (error) {
        console.error('Failed to load sessions:', error);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadSessions();
  }, [getUserSessions]);

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatMode = (session) => {
    if (session.mode === 'time') {
      return `Time ${session.modeValue}s`;
    }
    return `Words ${session.modeValue}`;
  };

  const calculateWPM = (session) => {
    // Use productiveCPM if available
    if (session.productiveCPM !== undefined) {
      return (session.productiveCPM / 5).toFixed(1);
    }
    // Fallback calculation
    const minutes = session.sessionDuration / 60000;
    const chars = session.maxIndexReached || session.userInput?.length || 0;
    return minutes > 0 ? (chars / 5 / minutes).toFixed(1) : '0.0';
  };

  const handleViewAnalysis = (sessionId) => {
    // Navigate to analyzer with session data
    navigate(`/analyzer?session=${sessionId}`);
  };

  if (loading) {
    return (
      <div className="history">
        <div className="header">
          <h1>Session History</h1>
        </div>
        <div className="empty-state">
          <p>Loading sessions...</p>
        </div>
      </div>
    );
  }

  // Calculate sparkline data (last 10 sessions)
  const recentSessions = sessions.slice(0, 10).reverse();
  const wpmValues = recentSessions.map(s => parseFloat(calculateWPM(s)));
  const maxWPM = Math.max(...wpmValues, 1);
  const minWPM = Math.min(...wpmValues, 0);
  const wpmRange = maxWPM - minWPM || 1;

  return (
    <div className="history">
      <div className="header">
        <h1>Session History</h1>
      </div>

      {sessions.length > 0 && (
        <div className="sparkline-container">
          <h3>WPM Trend (Last 10 Sessions)</h3>
          <svg className="sparkline" viewBox="0 0 400 100" preserveAspectRatio="xMidYMid meet">
            <line x1="20" y1="80" x2="380" y2="80" stroke="#374151" strokeWidth="1" />
            {recentSessions.length > 1 && (() => {
              const points = wpmValues.map((wpm, idx) => {
                const x = 20 + (idx / (wpmValues.length - 1)) * 360;
                const y = 80 - ((wpm - minWPM) / wpmRange) * 60;
                return `${x},${y}`;
              }).join(' ');
              
              return (
                <>
                  <polyline
                    points={points}
                    fill="none"
                    stroke="#4ade80"
                    strokeWidth="2"
                  />
                  {wpmValues.map((wpm, idx) => {
                    const x = 20 + (idx / (wpmValues.length - 1)) * 360;
                    const y = 80 - ((wpm - minWPM) / wpmRange) * 60;
                    return (
                      <circle
                        key={idx}
                        cx={x}
                        cy={y}
                        r="3"
                        fill="#4ade80"
                      />
                    );
                  })}
                </>
              );
            })()}
            <text x="10" y="20" fontSize="12" fill="#6b7280">{maxWPM.toFixed(0)}</text>
            <text x="10" y="85" fontSize="12" fill="#6b7280">{minWPM.toFixed(0)}</text>
          </svg>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="empty-state">
          <p>No sessions yet. Complete a typing test to see your history!</p>
        </div>
      ) : (
        <div className="session-table">
          <div className="table-header">
            <span>Date/Time</span>
            <span>Mode</span>
            <span>WPM</span>
            <span>Accuracy</span>
            <span>Mechanical CPM</span>
            <span>Actions</span>
          </div>
          {sessions.map((session) => (
            <div key={session.sessionId} className="table-row">
              <span>{formatDate(session.timestamp)}</span>
              <span>{formatMode(session)}</span>
              <span className="wpm-value">{calculateWPM(session)}</span>
              <span className="accuracy-value">{session.accuracy?.toFixed(1) || '0.0'}%</span>
              <span>{session.mechanicalCPM?.toFixed(0) || '-'}</span>
              <span>
                <button
                  className="view-btn"
                  onClick={() => handleViewAnalysis(session.sessionId)}
                >
                  View Analysis
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default History;
