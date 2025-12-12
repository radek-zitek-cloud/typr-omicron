import { useState, useMemo } from 'react';
import './Analyzer.css';
import fingerMap from './fingermap.json';
import KeyboardHeatmap from './KeyboardHeatmap';
import HandHeatmap from './HandHeatmap';

function Analyzer() {
  const [sessionData, setSessionData] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [dwellTimeByKey, setDwellTimeByKey] = useState(null);
  const [dwellTimeByFinger, setDwellTimeByFinger] = useState(null);
  const [flightTimeByKey, setFlightTimeByKey] = useState(null);
  const [flightTimeByFinger, setFlightTimeByFinger] = useState(null);

  // Pre-process fingerMap for efficient lookups
  const fingerLookup = useMemo(() => {
    const lookup = new Map();
    Object.entries(fingerMap).forEach(([finger, keys]) => {
      keys.forEach(key => {
        lookup.set(key.toLowerCase(), finger);
      });
    });
    return lookup;
  }, []);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        setSessionData(data);
        analyzeData(data);
      } catch (error) {
        alert('Error parsing JSON file: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  const analyzeData = (data) => {
    // Validate data has required fields
    if (!data || !data.events || !Array.isArray(data.events)) {
      alert('Invalid session data format: missing or invalid events array');
      return;
    }

    // Calculate basic statistics
    const stats = calculateStatistics(data);
    setStatistics(stats);

    // Calculate dwell time per key
    const dwellByKey = calculateDwellTimeByKey(data.events);
    setDwellTimeByKey(dwellByKey);

    // Calculate dwell time per finger
    const dwellByFinger = calculateDwellTimeByFinger(dwellByKey);
    setDwellTimeByFinger(dwellByFinger);

    // Calculate flight time per key
    const flightByKey = calculateFlightTimeByKey(data.events);
    setFlightTimeByKey(flightByKey);

    // Calculate flight time per finger
    const flightByFinger = calculateFlightTimeByFinger(flightByKey);
    setFlightTimeByFinger(flightByFinger);
  };

  const calculateStatistics = (data) => {
    const { sessionDuration, text, userInput, productiveKeystrokes, errorPositions } = data;
    
    // Use productive keystrokes if available, otherwise fall back to userInput length
    const effectiveKeystrokes = productiveKeystrokes !== undefined 
      ? productiveKeystrokes 
      : userInput.length;
    
    // Count characters typed (excluding spaces) from productive keystrokes
    const charsNoSpaces = userInput.replace(/ /g, '').length;
    
    // Calculate CPM (characters per minute, based on productive keystrokes)
    const minutes = sessionDuration / 60000;
    const cpm = minutes > 0 ? (effectiveKeystrokes / minutes).toFixed(2) : 0;
    
    // Calculate WPM (words per minute, based on productive keystrokes)
    // Assuming average word length of 5 characters
    const wpm = minutes > 0 ? (effectiveKeystrokes / 5 / minutes).toFixed(2) : 0;
    
    // Calculate accuracy using error positions if available
    let correct = 0;
    const minLength = Math.min(userInput.length, text.length);
    const errPositionsSet = errorPositions ? new Set(errorPositions) : new Set();
    
    for (let i = 0; i < minLength; i++) {
      // Character is correct only if it matches AND was never an error
      if (userInput[i] === text[i] && !errPositionsSet.has(i)) {
        correct++;
      }
    }
    const accuracy = userInput.length > 0 ? ((correct / userInput.length) * 100).toFixed(2) : 100;
    
    return {
      cpm,
      wpm,
      accuracy,
      totalChars: userInput.length,
      charsNoSpaces,
      productiveKeystrokes: effectiveKeystrokes,
      sessionDuration: (sessionDuration / 1000).toFixed(2)
    };
  };

  const calculateDwellTimeByKey = (events) => {
    const dwellTimes = {};
    const keyDownMap = new Map();

    events.forEach(event => {
      if (event.type === 'keydown') {
        keyDownMap.set(event.key, event.timestamp);
      } else if (event.type === 'keyup') {
        const downTime = keyDownMap.get(event.key);
        if (downTime !== undefined) {
          const dwellTime = event.timestamp - downTime;
          if (!dwellTimes[event.key]) {
            dwellTimes[event.key] = [];
          }
          dwellTimes[event.key].push(dwellTime);
          keyDownMap.delete(event.key);
        }
      }
    });

    // Calculate average dwell time for each key
    const averageDwellTimes = {};
    Object.keys(dwellTimes).forEach(key => {
      const times = dwellTimes[key];
      const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
      averageDwellTimes[key] = avg;
    });

    return averageDwellTimes;
  };

  const calculateDwellTimeByFinger = (dwellByKey) => {
    const fingerDwellTimes = {};

    Object.keys(dwellByKey).forEach(key => {
      const finger = getFingerForKey(key);
      if (finger) {
        if (!fingerDwellTimes[finger]) {
          fingerDwellTimes[finger] = [];
        }
        fingerDwellTimes[finger].push(dwellByKey[key]);
      }
    });

    // Calculate average for each finger
    const averageFingerDwellTimes = {};
    Object.keys(fingerDwellTimes).forEach(finger => {
      const times = fingerDwellTimes[finger];
      const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
      averageFingerDwellTimes[finger] = avg;
    });

    return averageFingerDwellTimes;
  };

  const calculateFlightTimeByKey = (events) => {
    const flightTimes = {};
    let lastKeyUpTime = null;
    let lastKey = null;

    events.forEach(event => {
      if (event.type === 'keydown') {
        if (lastKeyUpTime !== null && lastKey !== null) {
          const flightTime = event.timestamp - lastKeyUpTime;
          
          // Store by target key for aggregation
          if (!flightTimes[event.key]) {
            flightTimes[event.key] = [];
          }
          flightTimes[event.key].push(flightTime);
        }
      } else if (event.type === 'keyup') {
        lastKeyUpTime = event.timestamp;
        lastKey = event.key;
      }
    });

    // Calculate average flight time for each key
    const averageFlightTimes = {};
    Object.keys(flightTimes).forEach(key => {
      const times = flightTimes[key];
      const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
      averageFlightTimes[key] = avg;
    });

    return averageFlightTimes;
  };

  const calculateFlightTimeByFinger = (flightByKey) => {
    const fingerFlightTimes = {};

    Object.keys(flightByKey).forEach(key => {
      const finger = getFingerForKey(key);
      if (finger) {
        if (!fingerFlightTimes[finger]) {
          fingerFlightTimes[finger] = [];
        }
        fingerFlightTimes[finger].push(flightByKey[key]);
      }
    });

    // Calculate average for each finger
    const averageFingerFlightTimes = {};
    Object.keys(fingerFlightTimes).forEach(finger => {
      const times = fingerFlightTimes[finger];
      const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
      averageFingerFlightTimes[finger] = avg;
    });

    return averageFingerFlightTimes;
  };

  const getFingerForKey = (key) => {
    // Use pre-processed lookup map for efficient O(1) lookup
    return fingerLookup.get(key.toLowerCase()) || null;
  };

  const resetAnalyzer = () => {
    setSessionData(null);
    setStatistics(null);
    setDwellTimeByKey(null);
    setDwellTimeByFinger(null);
    setFlightTimeByKey(null);
    setFlightTimeByFinger(null);
  };

  return (
    <div className="analyzer">
      <div className="header">
        <h1>Typing Analysis</h1>
      </div>

      {!sessionData ? (
        <div className="upload-section">
          <h2>Upload Session Data</h2>
          <p>Upload a JSON file from a typing session to analyze your performance.</p>
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="file-input"
          />
        </div>
      ) : (
        <div className="results-section">
          <button onClick={resetAnalyzer} className="reset-btn">
            Upload Different File
          </button>

          {/* Basic Statistics */}
          {statistics && (
            <div className="stats-panel">
              <h2>Basic Statistics</h2>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Characters Per Minute:</span>
                  <span className="stat-value">{statistics.cpm}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Words Per Minute:</span>
                  <span className="stat-value">{statistics.wpm}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Accuracy:</span>
                  <span className="stat-value">{statistics.accuracy}%</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Session Duration:</span>
                  <span className="stat-value">{statistics.sessionDuration}s</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Characters:</span>
                  <span className="stat-value">{statistics.totalChars}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Productive Keystrokes:</span>
                  <span className="stat-value">{statistics.productiveKeystrokes}</span>
                </div>
              </div>
            </div>
          )}

          {/* Dwell Time Analysis */}
          {dwellTimeByKey && (
            <div className="analysis-panel">
              <h2>Dwell Time Analysis</h2>
              <p className="panel-description">Time between key down and key up (how long keys are held)</p>
              
              <h3>Dwell Time by Key (ms)</h3>
              <div className="key-data-grid">
                {Object.entries(dwellTimeByKey)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([key, time]) => (
                    <div key={key} className="data-item">
                      <span className="key-label">{key === ' ' ? 'Space' : key}:</span>
                      <span className="time-value">{time.toFixed(2)}ms</span>
                    </div>
                  ))}
              </div>

              {dwellTimeByFinger && (
                <>
                  <h3>Dwell Time by Finger (ms)</h3>
                  <div className="finger-data-grid">
                    {Object.entries(dwellTimeByFinger)
                      .sort((a, b) => b[1] - a[1])
                      .map(([finger, time]) => (
                        <div key={finger} className="data-item">
                          <span className="finger-label">{getFingerName(finger)}:</span>
                          <span className="time-value">{time.toFixed(2)}ms</span>
                        </div>
                      ))}
                  </div>
                  <HandHeatmap data={dwellTimeByFinger} title="Dwell Time by Finger" />
                </>
              )}

              <KeyboardHeatmap data={dwellTimeByKey} title="Dwell Time Heatmap" />
            </div>
          )}

          {/* Flight Time Analysis */}
          {flightTimeByKey && (
            <div className="analysis-panel">
              <h2>Flight Time Analysis</h2>
              <p className="panel-description">Time from releasing previous key to pressing next key</p>
              
              <h3>Flight Time by Key (ms)</h3>
              <div className="key-data-grid">
                {Object.entries(flightTimeByKey)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([key, time]) => (
                    <div key={key} className="data-item">
                      <span className="key-label">{key === ' ' ? 'Space' : key}:</span>
                      <span className="time-value">{time.toFixed(2)}ms</span>
                    </div>
                  ))}
              </div>

              {flightTimeByFinger && (
                <>
                  <h3>Flight Time by Finger (ms)</h3>
                  <div className="finger-data-grid">
                    {Object.entries(flightTimeByFinger)
                      .sort((a, b) => b[1] - a[1])
                      .map(([finger, time]) => (
                        <div key={finger} className="data-item">
                          <span className="finger-label">{getFingerName(finger)}:</span>
                          <span className="time-value">{time.toFixed(2)}ms</span>
                        </div>
                      ))}
                  </div>
                  <HandHeatmap data={flightTimeByFinger} title="Flight Time by Finger" />
                </>
              )}

              <KeyboardHeatmap data={flightTimeByKey} title="Flight Time Heatmap" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getFingerName(fingerCode) {
  const names = {
    'LP': 'Left Pinky',
    'LR': 'Left Ring',
    'LM': 'Left Middle',
    'LI': 'Left Index',
    'LT': 'Left Thumb',
    'RT': 'Right Thumb',
    'RI': 'Right Index',
    'RM': 'Right Middle',
    'RR': 'Right Ring',
    'RP': 'Right Pinky'
  };
  return names[fingerCode] || fingerCode;
}

export default Analyzer;
