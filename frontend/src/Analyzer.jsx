import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from './AppContext';
import './Analyzer.css';
import fingerMap from './fingermap.json';
import KeyboardHeatmap from './KeyboardHeatmap';
import HandHeatmap from './HandHeatmap';

function Analyzer() {
  const [searchParams] = useSearchParams();
  const { getSession } = useAppContext();
  
  const [sessionData, setSessionData] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [dwellTimeByKey, setDwellTimeByKey] = useState(null);
  const [dwellTimeByFinger, setDwellTimeByFinger] = useState(null);
  const [flightTimeByKey, setFlightTimeByKey] = useState(null);
  const [flightTimeByFinger, setFlightTimeByFinger] = useState(null);
  
  // V2 Analytics state
  const [digraphLatency, setDigraphLatency] = useState(null);
  const [errorConfusionMatrix, setErrorConfusionMatrix] = useState(null);
  const [rhythmData, setRhythmData] = useState(null);
  const [shiftPenalty, setShiftPenalty] = useState(null);

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

  // Load session from query parameter
  useEffect(() => {
    const sessionId = searchParams.get('session');
    if (sessionId && getSession) {
      const session = getSession(sessionId);
      if (session) {
        setSessionData(session);
        analyzeData(session);
      }
    }
  }, [searchParams, getSession]);

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
    
    // V2 Analytics: Calculate digraph latency
    const digraphs = calculateDigraphLatency(data.events, data.charStates);
    setDigraphLatency(digraphs);
    
    // V2 Analytics: Calculate error confusion matrix
    const confusionMatrix = calculateErrorConfusionMatrix(data.charStates);
    setErrorConfusionMatrix(confusionMatrix);
    
    // V2 Analytics: Calculate rhythm data
    const rhythm = calculateRhythmData(data.events, data.charStates);
    setRhythmData(rhythm);
    
    // V2 Analytics: Calculate shift penalty
    const penalty = calculateShiftPenalty(data.events);
    setShiftPenalty(penalty);
  };

  const calculateStatistics = (data) => {
    const { sessionDuration, text, userInput, productiveKeystrokes, errorPositions, 
            mechanicalCPM, productiveCPM, totalKeystrokes, maxIndexReached, firstTimeErrors } = data;
    
    // Support both old and new data formats
    // New format: use mechanicalCPM and productiveCPM directly if available
    if (mechanicalCPM !== undefined && productiveCPM !== undefined) {
      // New format - use the pre-calculated values
      const accuracy = data.accuracy || 100;
      
      return {
        sessionDuration,
        mechanicalCPM: mechanicalCPM.toFixed(2),
        productiveCPM: productiveCPM.toFixed(2),
        accuracy: accuracy.toFixed(2),
        totalKeystrokes: totalKeystrokes || 0,
        maxIndexReached: maxIndexReached || 0,
        firstTimeErrorCount: firstTimeErrors ? firstTimeErrors.length : 0,
      };
    }
    
    // Old format - calculate from raw data
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
    // Using standard assumption of 5 characters per word for consistent WPM calculation
    const CHARS_PER_WORD = 5;
    const wpm = minutes > 0 ? (effectiveKeystrokes / CHARS_PER_WORD / minutes).toFixed(2) : 0;
    
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

  // V2 Analytics: Calculate digraph latency (flight time between character pairs)
  const calculateDigraphLatency = (events, charStates) => {
    const digraphTimes = {};
    let lastKeyUpTime = null;
    let lastChar = null;

    events.forEach(event => {
      if (event.type === 'keydown') {
        const currentChar = event.expectedChar;
        const currentIndex = event.currentIndex;
        
        // Check if this is a valid character (not backspace or modifier) and in charStates
        const isValidChar = currentChar && currentChar.length === 1 && 
                           charStates && 
                           currentIndex !== undefined && 
                           currentIndex >= 0 && 
                           currentIndex < charStates.length &&
                           charStates[currentIndex];
        
        if (lastKeyUpTime !== null && lastChar !== null && isValidChar) {
          // Skip if previous char was backspace
          if (lastChar !== 'Backspace' && lastChar.length === 1) {
            const flightTime = event.timestamp - lastKeyUpTime;
            const pair = `${lastChar}${currentChar}`;
            
            if (!digraphTimes[pair]) {
              digraphTimes[pair] = {
                times: [],
                char1: lastChar,
                char2: currentChar,
                fromFinger: getFingerForKey(lastChar),
                toFinger: getFingerForKey(currentChar)
              };
            }
            digraphTimes[pair].times.push(flightTime);
          }
        }
        
        // Don't update lastChar for backspace or modifiers
        if (isValidChar) {
          lastChar = currentChar;
        }
      } else if (event.type === 'keyup') {
        // Only update lastKeyUpTime for valid characters
        if (event.key && event.key.length === 1 && event.key !== 'Backspace') {
          lastKeyUpTime = event.timestamp;
        }
      }
    });

    // Calculate average flight time for each digraph
    const digraphAverages = Object.entries(digraphTimes).map(([pair, data]) => {
      const avg = data.times.reduce((sum, t) => sum + t, 0) / data.times.length;
      const sameFinger = data.fromFinger === data.toFinger && data.fromFinger !== null;
      
      return {
        pair,
        char1: data.char1,
        char2: data.char2,
        avgLatency: avg,
        count: data.times.length,
        fromFinger: data.fromFinger,
        toFinger: data.toFinger,
        sameFinger,
        fingerChange: data.fromFinger && data.toFinger 
          ? `${getFingerName(data.fromFinger)} → ${getFingerName(data.toFinger)}`
          : 'Unknown'
      };
    });

    // Sort by average latency (slowest first)
    return digraphAverages.sort((a, b) => b.avgLatency - a.avgLatency);
  };

  // V2 Analytics: Calculate error confusion matrix
  const calculateErrorConfusionMatrix = (charStates) => {
    if (!charStates || !Array.isArray(charStates)) {
      return null;
    }

    const confusionMap = {};

    charStates.forEach(charState => {
      // Check if this was an error (incorrect or corrected means there was an error at some point)
      if (charState.status === 'incorrect') {
        const expected = charState.char;
        const actual = charState.userBuffer;
        
        if (expected && actual && expected !== actual) {
          if (!confusionMap[expected]) {
            confusionMap[expected] = {};
          }
          if (!confusionMap[expected][actual]) {
            confusionMap[expected][actual] = 0;
          }
          confusionMap[expected][actual]++;
        }
      }
    });

    // Convert to sorted array for display
    const confusionData = Object.entries(confusionMap).map(([expected, actualMap]) => {
      const actualChars = Object.entries(actualMap)
        .map(([actual, count]) => ({ actual, count }))
        .sort((a, b) => b.count - a.count);
      
      return {
        expected,
        actualChars,
        totalErrors: actualChars.reduce((sum, item) => sum + item.count, 0)
      };
    }).sort((a, b) => b.totalErrors - a.totalErrors);

    return confusionData.length > 0 ? confusionData : null;
  };

  // V2 Analytics: Calculate rhythm data (keydown to keydown intervals)
  const calculateRhythmData = (events, charStates) => {
    if (!events || !charStates) {
      return null;
    }

    const intervals = [];
    let lastKeydownTime = null;
    let sessionStartTime = null;

    events.forEach(event => {
      if (event.type === 'keydown') {
        const currentIndex = event.currentIndex;
        
        // Validate currentIndex is within bounds
        if (currentIndex !== undefined && currentIndex >= 0 && currentIndex < charStates.length) {
          const charState = charStates[currentIndex];
          
          // Only include correct keystrokes for rhythm analysis
          if (charState && charState.status === 'correct' && event.key && event.key.length === 1) {
            if (sessionStartTime === null) {
              sessionStartTime = event.timestamp;
            }
            
            if (lastKeydownTime !== null) {
              const interval = event.timestamp - lastKeydownTime;
              const sessionTime = event.timestamp - sessionStartTime;
              
              intervals.push({
                sessionTime,
                interval,
                char: event.expectedChar
              });
            }
            
            lastKeydownTime = event.timestamp;
          }
        }
      }
    });

    return intervals.length > 0 ? intervals : null;
  };

  // V2 Analytics: Calculate shift penalty (capitalization cost)
  const calculateShiftPenalty = (events) => {
    if (!events) {
      return null;
    }

    const uppercaseIntervals = [];
    const lowercaseIntervals = [];
    let lastKeydownTime = null;

    events.forEach(event => {
      if (event.type === 'keydown') {
        // Only analyze alphabetic characters
        if (event.key && event.key.length === 1 && /[a-zA-Z]/.test(event.key)) {
          if (lastKeydownTime !== null) {
            const interval = event.timestamp - lastKeydownTime;
            
            // Determine if this is uppercase or lowercase
            if (event.key === event.key.toUpperCase() && event.key !== event.key.toLowerCase()) {
              uppercaseIntervals.push(interval);
            } else if (event.key === event.key.toLowerCase()) {
              lowercaseIntervals.push(interval);
            }
          }
          
          lastKeydownTime = event.timestamp;
        }
      }
    });

    // Calculate averages
    if (uppercaseIntervals.length === 0 && lowercaseIntervals.length === 0) {
      return null;
    }

    const avgUppercase = uppercaseIntervals.length > 0
      ? uppercaseIntervals.reduce((sum, t) => sum + t, 0) / uppercaseIntervals.length
      : 0;
    
    const avgLowercase = lowercaseIntervals.length > 0
      ? lowercaseIntervals.reduce((sum, t) => sum + t, 0) / lowercaseIntervals.length
      : 0;

    const penalty = avgUppercase - avgLowercase;
    const percentSlower = avgLowercase > 0 ? ((penalty / avgLowercase) * 100) : 0;

    return {
      avgUppercase,
      avgLowercase,
      penalty,
      percentSlower,
      uppercaseCount: uppercaseIntervals.length,
      lowercaseCount: lowercaseIntervals.length
    };
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
    setDigraphLatency(null);
    setErrorConfusionMatrix(null);
    setRhythmData(null);
    setShiftPenalty(null);
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
                {/* New format shows mechanical and productive CPM separately */}
                {statistics.mechanicalCPM !== undefined ? (
                  <>
                    <div className="stat-item">
                      <span className="stat-label">Mechanical CPM (all keystrokes):</span>
                      <span className="stat-value">{statistics.mechanicalCPM}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Productive CPM (unique progress):</span>
                      <span className="stat-value">{statistics.productiveCPM}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Accuracy:</span>
                      <span className="stat-value">{statistics.accuracy}%</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Session Duration:</span>
                      <span className="stat-value">{(statistics.sessionDuration / 1000).toFixed(2)}s</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Total Keystrokes:</span>
                      <span className="stat-value">{statistics.totalKeystrokes}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Max Index Reached:</span>
                      <span className="stat-value">{statistics.maxIndexReached}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">First-Time Errors:</span>
                      <span className="stat-value">{statistics.firstTimeErrorCount}</span>
                    </div>
                  </>
                ) : (
                  /* Old format */
                  <>
                    <div className="stat-item">
                      <span className="stat-label">Characters Per Minute (productive):</span>
                      <span className="stat-value">{statistics.cpm}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Words Per Minute (productive):</span>
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
                  </>
                )}
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

          {/* V2 Analytics: Digraph Latency Analysis */}
          {digraphLatency && digraphLatency.length > 0 && (
            <div className="analysis-panel">
              <h2>Digraph Latency Analysis</h2>
              <p className="panel-description">
                Flight time between specific letter pairs (digraphs) - identifying anatomical bottlenecks
              </p>
              
              <h3>Slowest Transitions (Top 10)</h3>
              <div className="digraph-table">
                <div className="table-header">
                  <span>Transition</span>
                  <span>Finger Change</span>
                  <span>Avg Latency</span>
                  <span>Count</span>
                </div>
                {digraphLatency.slice(0, 10).map((digraph, idx) => (
                  <div 
                    key={idx} 
                    className={`table-row ${digraph.sameFinger ? 'same-finger' : ''}`}
                  >
                    <span className="transition-chars">
                      {digraph.char1} → {digraph.char2}
                    </span>
                    <span className="finger-change">{digraph.fingerChange}</span>
                    <span className="latency-value">{digraph.avgLatency.toFixed(2)}ms</span>
                    <span className="count-value">{digraph.count}</span>
                  </div>
                ))}
              </div>
              <p className="info-note">
                <span className="same-finger-indicator">Red rows</span> indicate same-finger transitions (mechanical jumps)
              </p>
            </div>
          )}

          {/* V2 Analytics: Error Confusion Matrix */}
          {errorConfusionMatrix && errorConfusionMatrix.length > 0 && (
            <div className="analysis-panel">
              <h2>Error Confusion Matrix</h2>
              <p className="panel-description">
                Analysis of typing errors - what you typed instead of the target character
              </p>
              
              <h3>Missed vs. Hit Analysis</h3>
              <div className="confusion-matrix">
                {errorConfusionMatrix.slice(0, 10).map((error, idx) => (
                  <div key={idx} className="confusion-item">
                    <div className="expected-char">
                      When you missed <strong>&apos;{error.expected}&apos;</strong>, you typed:
                    </div>
                    <div className="actual-chars">
                      {error.actualChars.map((actual, i) => (
                        <div key={i} className="actual-char-item">
                          <span className="actual-char"><strong>&apos;{actual.actual}&apos;</strong></span>
                          <span className="error-count">({actual.count} {actual.count === 1 ? 'time' : 'times'})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* V2 Analytics: Rhythm & Consistency Visualization */}
          {rhythmData && rhythmData.length > 0 && (
            <div className="analysis-panel">
              <h2>Typing Rhythm (Seismograph)</h2>
              <p className="panel-description">
                Your typing speed over time - visualizing flow state, hesitation, and fatigue
              </p>
              
              <div className="rhythm-chart-container">
                <svg className="rhythm-chart" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid meet">
                  {/* Grid lines */}
                  <line x1="50" y1="250" x2="750" y2="250" stroke="#e5e7eb" strokeWidth="1" />
                  <line x1="50" y1="200" x2="750" y2="200" stroke="#e5e7eb" strokeWidth="0.5" />
                  <line x1="50" y1="150" x2="750" y2="150" stroke="#e5e7eb" strokeWidth="0.5" />
                  <line x1="50" y1="100" x2="750" y2="100" stroke="#e5e7eb" strokeWidth="0.5" />
                  <line x1="50" y1="50" x2="750" y2="50" stroke="#e5e7eb" strokeWidth="0.5" />
                  
                  {/* Y-axis */}
                  <line x1="50" y1="20" x2="50" y2="250" stroke="#374151" strokeWidth="2" />
                  {/* X-axis */}
                  <line x1="50" y1="250" x2="750" y2="250" stroke="#374151" strokeWidth="2" />
                  
                  {/* Plot the rhythm line */}
                  {(() => {
                    const maxTime = rhythmData[rhythmData.length - 1].sessionTime;
                    const maxInterval = Math.max(...rhythmData.map(d => d.interval));
                    const minInterval = Math.min(...rhythmData.map(d => d.interval));
                    const intervalRange = maxInterval - minInterval || 1;
                    
                    const points = rhythmData.map((d) => {
                      const x = 50 + ((d.sessionTime / maxTime) * 700);
                      const y = 250 - (((d.interval - minInterval) / intervalRange) * 200);
                      return `${x},${y}`;
                    }).join(' ');
                    
                    return (
                      <>
                        <polyline
                          points={points}
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2"
                        />
                        {/* Labels */}
                        <text x="10" y="30" fontSize="12" fill="#6b7280">Fast</text>
                        <text x="10" y="255" fontSize="12" fill="#6b7280">Slow</text>
                        <text x="350" y="280" fontSize="14" fill="#374151" textAnchor="middle">
                          Session Progress
                        </text>
                        <text x="25" y="150" fontSize="14" fill="#374151" transform="rotate(-90 25 150)">
                          Interval (ms)
                        </text>
                      </>
                    );
                  })()}
                </svg>
                
                <div className="rhythm-analysis">
                  <h4>Analysis Zones:</h4>
                  <ul>
                    <li><strong>Tight Cluster:</strong> Indicates &quot;Flow State&quot; - consistent, rhythmic typing</li>
                    <li><strong>Spikes:</strong> Indicate &quot;Hesitation/Panic&quot; - uncertainty or difficult sequences</li>
                    <li><strong>Upward Trend:</strong> Indicates &quot;Fatigue&quot; - slowing down over time</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* V2 Analytics: Capitalization Cost */}
          {shiftPenalty && (shiftPenalty.uppercaseCount > 0 || shiftPenalty.lowercaseCount > 0) && (
            <div className="analysis-panel">
              <h2>Shift Key Analysis</h2>
              <p className="panel-description">
                Biomechanical cost of using the pinky finger for the Shift key
              </p>
              
              <div className="shift-penalty-card">
                <h3>Shift Key Penalty</h3>
                <div className={`penalty-value ${
                  shiftPenalty.penalty < 20 ? 'good' : 
                  shiftPenalty.penalty < 50 ? 'moderate' : 'high'
                }`}>
                  +{shiftPenalty.penalty.toFixed(2)}ms
                </div>
                <div className="penalty-details">
                  <p>
                    Your capital letters take <strong>{Math.abs(shiftPenalty.percentSlower).toFixed(1)}%</strong> 
                    {shiftPenalty.penalty >= 0 ? ' longer' : ' less time'} to type than lowercase letters.
                  </p>
                  <div className="penalty-stats">
                    <div className="stat">
                      <span className="stat-label">Uppercase avg:</span>
                      <span className="stat-value">{shiftPenalty.avgUppercase.toFixed(2)}ms</span>
                      <span className="stat-count">({shiftPenalty.uppercaseCount} chars)</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Lowercase avg:</span>
                      <span className="stat-value">{shiftPenalty.avgLowercase.toFixed(2)}ms</span>
                      <span className="stat-count">({shiftPenalty.lowercaseCount} chars)</span>
                    </div>
                  </div>
                </div>
              </div>
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
