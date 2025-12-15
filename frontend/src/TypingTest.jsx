import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useAppContext } from './AppContext';
import ConfigBar from './ConfigBar';
import './TypingTest.css';
import wordsData from './words.json';
import { playCorrectSound, playErrorSound, resumeAudioContext } from './soundUtils';
import { getAvailableMonospacedFonts } from './fontDetection';

// Helper function to get word source
function getWordSource() {
  const customWords = localStorage.getItem('typr_custom_words');
  if (customWords) {
    try {
      const parsed = JSON.parse(customWords);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error('Error parsing custom words', e);
    }
  }
  return wordsData;
}

// Helper function to generate random text
function generateText(wordCount = 50) {
  const words = [];
  const source = getWordSource();
  for (let i = 0; i < wordCount; i++) {
    const randomWord = source[Math.floor(Math.random() * source.length)];
    words.push(randomWord);
  }
  return words.join(' ');
}

// Memoized character component - only re-renders when props change
const Character = memo(({ char, userChar, status, isActive }) => {
  let className = 'char';
  const displayChar = userChar || char;
  
  if (isActive) {
    className += ' active current';
  } else if (status === 'correct') {
    className += ' correct';
  } else if (status === 'incorrect') {
    className += ' incorrect';
  } else if (status === 'corrected') {
    className += ' corrected';
  } else if (status === 'pending') {
    className += ' pending';
  }

  return <span className={className}>{displayChar}</span>;
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these specific props changed
  return prevProps.userChar === nextProps.userChar &&
         prevProps.status === nextProps.status &&
         prevProps.isActive === nextProps.isActive;
});

Character.displayName = 'Character';

function TypingTest() {
  const { testConfig, saveSession, currentUser, updateUserSettings } = useAppContext();
  
  // Generate initial text
  const initialWordCount = testConfig.mode === 'words' ? testConfig.wordCount : 200;
  const initialText = useMemo(() => generateText(initialWordCount), [initialWordCount]);
  
  const [text, setText] = useState(initialText);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [availableFonts, setAvailableFonts] = useState([]);
  const [showControls, setShowControls] = useState(false);
  
  // Use refs for high-frequency updates to avoid re-renders
  const userInputRef = useRef(new Array(text.length).fill(null)); // User's typed characters
  const statusRef = useRef(new Array(text.length).fill('pending')); // Character statuses
  const eventsRef = useRef([]); // Keystroke events
  const sessionStartTimeRef = useRef(null);
  const lastKeystrokeTimeRef = useRef(null);
  const textDisplayRef = useRef(null);
  const audioContextResumedRef = useRef(false);
  
  // Metrics refs
  const totalKeystrokesRef = useRef(0);
  const maxIndexReachedRef = useRef(0);
  const firstTimeErrorsRef = useRef(new Set());
  
  // Track keydown timestamps for dwell time calculation
  const keyDownTimestampsRef = useRef(new Map());
  
  // Force update function - only when we need to re-render
  const [, forceUpdate] = useState({});
  const triggerRender = useCallback(() => forceUpdate({}), []);
  
  // Track transform for centering
  const [trackTransform, setTrackTransform] = useState(0);
  
  // Optimized centering - use requestAnimationFrame batching
  const updateCentering = useCallback(() => {
    if (textDisplayRef.current) {
      const chars = textDisplayRef.current.children;
      if (chars[currentIndex]) {
        const activeChar = chars[currentIndex];
        const charCenterOffset = activeChar.offsetLeft + (activeChar.offsetWidth / 2);
        setTrackTransform(-charCenterOffset);
      }
    }
  }, [currentIndex]);
  
  // Batch centering updates with RAF
  useEffect(() => {
    requestAnimationFrame(updateCentering);
  }, [currentIndex, updateCentering]);

  // Calculate accuracy
  const calculateAccuracy = useCallback((maxReached, errors) => {
    if (maxReached === 0) return 100;
    const correct = maxReached - errors.size;
    return ((correct / maxReached) * 100).toFixed(2);
  }, []);

  // Build session data
  const buildSessionData = useCallback(() => {
    const startTime = sessionStartTimeRef.current;
    const endTime = lastKeystrokeTimeRef.current || sessionStartTimeRef.current || Date.now();
    const duration = startTime ? endTime - startTime : 0;
    const durationInMinutes = duration / 60000;
    
    const mechanicalCPM = durationInMinutes > 0 
      ? (totalKeystrokesRef.current / durationInMinutes).toFixed(2)
      : 0;
    const productiveCPM = durationInMinutes > 0 
      ? (maxIndexReachedRef.current / durationInMinutes).toFixed(2)
      : 0;
    const accuracy = calculateAccuracy(maxIndexReachedRef.current, firstTimeErrorsRef.current);
    
    // Build charStates from refs
    const charStates = text.split('').map((char, idx) => ({
      char,
      userBuffer: userInputRef.current[idx],
      status: statusRef.current[idx]
    }));
    
    const userInputStr = userInputRef.current.slice(0, maxIndexReachedRef.current).join('');
    
    return {
      text,
      userInput: userInputStr,
      charStates,
      events: eventsRef.current,
      sessionDuration: duration,
      mechanicalCPM: parseFloat(mechanicalCPM),
      productiveCPM: parseFloat(productiveCPM),
      accuracy: parseFloat(accuracy),
      totalKeystrokes: totalKeystrokesRef.current,
      maxIndexReached: maxIndexReachedRef.current,
      firstTimeErrors: Array.from(firstTimeErrorsRef.current),
      timestamp: new Date().toISOString()
    };
  }, [text, calculateAccuracy]);

  const downloadSessionFile = useCallback((sessionData) => {
    const dataStr = JSON.stringify(sessionData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `typing-session-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const endSession = useCallback(async () => {
    setSessionActive(false);
    const sessionData = buildSessionData();
    
    if (saveSession) {
      setSaveStatus('saving');
      try {
        const sessionId = await saveSession(sessionData);
        if (sessionId) {
          setSaveStatus('success');
          setTimeout(() => setSaveStatus(null), 3000);
        } else {
          setSaveStatus('error');
          setTimeout(() => setSaveStatus(null), 5000);
        }
      } catch (error) {
        setSaveStatus('error');
        console.error('Error saving session:', error);
        setTimeout(() => setSaveStatus(null), 5000);
      }
    }
    
    downloadSessionFile(sessionData);
  }, [buildSessionData, downloadSessionFile, saveSession]);

  const downloadSessionData = useCallback(() => {
    const sessionData = buildSessionData();
    downloadSessionFile(sessionData);
  }, [buildSessionData, downloadSessionFile]);

  // Timer for time mode
  useEffect(() => {
    if (testConfig.mode === 'time' && sessionActive && timeRemaining !== null) {
      if (timeRemaining <= 0) {
        endSession();
        return;
      }
      
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [testConfig.mode, sessionActive, timeRemaining, endSession]);

  // Check word count completion
  useEffect(() => {
    if (testConfig.mode === 'words' && sessionActive) {
      const targetChars = testConfig.wordCount * 6;
      if (maxIndexReachedRef.current >= targetChars) {
        endSession();
      }
    }
  }, [testConfig.mode, testConfig.wordCount, sessionActive, currentIndex, endSession]);

  // Optimized key handler - minimal state updates
  const handleKeyDown = useCallback((e) => {
    // Resume audio context on first user interaction
    if (currentUser?.settings.soundEnabled && !audioContextResumedRef.current) {
      try {
        const resumed = resumeAudioContext();
        if (resumed) {
          audioContextResumedRef.current = true;
          console.log('Audio context resumed successfully');
        }
      } catch (error) {
        console.warn('Failed to resume audio context:', error);
      }
    }
    
    // Prevent actions if completed or session ended
    if (testConfig.mode === 'words' && currentIndex >= text.length) return;
    if (sessionStarted && !sessionActive) return;
    
    // Start session ONLY on first CORRECT character
    if (!sessionStarted) {
      // Only start if typing the first character correctly
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const expectedChar = text[0];
        if (e.key !== expectedChar) {
          // Ignore - not the correct first character
          e.preventDefault();
          return;
        }
        // Correct first character - start session
        setSessionStarted(true);
        setSessionActive(true);
        sessionStartTimeRef.current = Date.now();
        
        if (testConfig.mode === 'time') {
          setTimeRemaining(testConfig.timeLimit);
        }
      } else {
        // Not a printable character
        e.preventDefault();
        return;
      }
    }

    lastKeystrokeTimeRef.current = Date.now();
    
    // Generate more text for time mode
    if (testConfig.mode === 'time' && currentIndex > text.length - 50) {
      const newText = generateText(50);
      setText(prev => prev + ' ' + newText);
      // Extend arrays
      const currentLength = userInputRef.current.length;
      userInputRef.current = [...userInputRef.current, ...new Array(newText.length + 1).fill(null)];
      statusRef.current = [...statusRef.current, ...new Array(newText.length + 1).fill('pending')];
    }

    // Record keydown event and timestamp
    const timestamp = Date.now();
    eventsRef.current.push({
      type: 'keydown',
      key: e.key,
      code: e.code,
      timestamp,
      relativeTime: sessionStartTimeRef.current ? timestamp - sessionStartTimeRef.current : 0,
      currentIndex,
      expectedChar: currentIndex < text.length ? text[currentIndex] : '',
    });
    
    // Store keydown timestamp for dwell time calculation
    keyDownTimestampsRef.current.set(e.key, timestamp);

    // Handle backspace
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
        totalKeystrokesRef.current++;
        triggerRender(); // Force re-render for active cursor position
      }
      return;
    }
    
    // Handle printable characters
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      
      totalKeystrokesRef.current++;
      
      const expectedChar = text[currentIndex];
      const isCorrect = e.key === expectedChar;
      const isFirstAttempt = userInputRef.current[currentIndex] === null;
      
      // Play sound with error handling
      if (currentUser?.settings.soundEnabled) {
        try {
          if (isCorrect) playCorrectSound();
          else playErrorSound();
        } catch (error) {
          console.warn('Sound playback error:', error);
        }
      }
      
      // Update refs directly (no state update needed)
      userInputRef.current[currentIndex] = e.key;
      
      if (isFirstAttempt) {
        statusRef.current[currentIndex] = isCorrect ? 'correct' : 'incorrect';
        if (!isCorrect) {
          firstTimeErrorsRef.current.add(currentIndex);
        }
        maxIndexReachedRef.current = Math.max(maxIndexReachedRef.current, currentIndex + 1);
      } else {
        statusRef.current[currentIndex] = isCorrect ? 'corrected' : 'incorrect';
      }
      
      // Move to next character
      setCurrentIndex(prev => prev + 1);
      triggerRender(); // Force re-render to show updated character
    }
  }, [sessionStarted, sessionActive, currentIndex, text, testConfig, currentUser, triggerRender]);

  // Handle key up event for dwell time recording
  const handleKeyUp = useCallback((e) => {
    if (!sessionStartTimeRef.current) return;

    const timestamp = Date.now();
    
    // Record keyup event for dwell time analysis
    eventsRef.current.push({
      type: 'keyup',
      key: e.key,
      code: e.code,
      timestamp,
      relativeTime: timestamp - sessionStartTimeRef.current,
      currentIndex,
      expectedChar: currentIndex < text.length ? text[currentIndex] : '',
    });
    
    // Clear keydown timestamp after recording keyup
    keyDownTimestampsRef.current.delete(e.key);
  }, [currentIndex, text]);

  // Setup keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Reset function
  const reset = () => {
    const newWordCount = testConfig.mode === 'words' ? testConfig.wordCount : 200;
    const newText = generateText(newWordCount);
    
    setText(newText);
    setCurrentIndex(0);
    setSessionActive(false);
    setSessionStarted(false);
    setTimeRemaining(null);
    
    // Reset refs
    userInputRef.current = new Array(newText.length).fill(null);
    statusRef.current = new Array(newText.length).fill('pending');
    eventsRef.current = [];
    totalKeystrokesRef.current = 0;
    maxIndexReachedRef.current = 0;
    firstTimeErrorsRef.current = new Set();
    keyDownTimestampsRef.current = new Map();
    sessionStartTimeRef.current = null;
    lastKeystrokeTimeRef.current = null;
    
    triggerRender();
  };

  // Font settings
  const getFontFamily = () => currentUser?.settings.font || 'Courier New';
  const getFontSize = () => {
    const size = currentUser?.settings.fontSize || 'M';
    return size === 'S' ? '1.5rem' : size === 'L' ? '2.5rem' : '2rem';
  };

  // Render characters - memoized
  const renderedCharacters = useMemo(() => {
    return text.split('').map((char, index) => (
      <Character
        key={index}
        char={char}
        userChar={userInputRef.current[index]}
        status={statusRef.current[index]}
        isActive={index === currentIndex}
      />
    ));
  }, [text, currentIndex]); // Only re-create when text or currentIndex changes

  return (
    <div className="typing-test">
      <div className="header">
        <h1>Typing Speed Analyzer</h1>
        <div className="stats">
          {sessionStarted && (
            <>
              {testConfig.mode === 'time' && timeRemaining !== null && (
                <span className="timer">Time: {timeRemaining}s</span>
              )}
              <span>Index: {currentIndex}</span>
              <span>Max Reached: {maxIndexReachedRef.current}</span>
              <span>Accuracy: {calculateAccuracy(maxIndexReachedRef.current, firstTimeErrorsRef.current)}%</span>
              <span className={sessionActive ? 'active' : 'inactive'}>
                {sessionActive ? '● Recording' : '○ Ended'}
              </span>
            </>
          )}
        </div>
      </div>

      <ConfigBar />

      <div className="inline-controls">
        <button 
          className="toggle-controls-btn"
          onClick={() => setShowControls(!showControls)}
          title="Toggle font and sound settings"
        >
          ⚙️ {showControls ? 'Hide' : 'Show'} Settings
        </button>
        
        {showControls && (
          <div className="controls-panel">
            <div className="control-group">
              <label htmlFor="font-select">Font:</label>
              <select
                id="font-select"
                value={currentUser?.settings.font || 'Courier New'}
                onChange={(e) => updateUserSettings({ font: e.target.value })}
                className="font-select"
              >
                {availableFonts.length > 0 ? (
                  availableFonts.map(font => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))
                ) : (
                  <option value="monospace">Loading fonts...</option>
                )}
              </select>
            </div>
            
            <div className="control-group">
              <label>Size:</label>
              <div className="size-buttons">
                <button
                  className={currentUser?.settings.fontSize === 'S' ? 'active' : ''}
                  onClick={() => updateUserSettings({ fontSize: 'S' })}
                  title="Small font size"
                >
                  S
                </button>
                <button
                  className={currentUser?.settings.fontSize === 'M' ? 'active' : ''}
                  onClick={() => updateUserSettings({ fontSize: 'M' })}
                  title="Medium font size"
                >
                  M
                </button>
                <button
                  className={currentUser?.settings.fontSize === 'L' ? 'active' : ''}
                  onClick={() => updateUserSettings({ fontSize: 'L' })}
                  title="Large font size"
                >
                  L
                </button>
              </div>
            </div>
            
            <div className="control-group">
              <label>
                <input
                  type="checkbox"
                  checked={currentUser?.settings.soundEnabled || false}
                  onChange={(e) => updateUserSettings({ soundEnabled: e.target.checked })}
                />
                <span style={{ marginLeft: '6px' }}>🔊 Sound</span>
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="text-container">
        <div className="caret-line"></div>
        
        <div 
          ref={textDisplayRef}
          className="text-display" 
          style={{
            transform: `translateX(${trackTransform}px)`,
            fontFamily: getFontFamily(),
            fontSize: getFontSize()
          }}
        >
          {renderedCharacters}
        </div>
      </div>

      <div className="instructions">
        {!sessionStarted ? (
          <p>Start typing the first letter correctly to begin. The timer starts on your first correct keystroke.</p>
        ) : sessionActive ? (
          <p>Click "End Session" when you're done to save your results.</p>
        ) : (
          <p>Session ended. Download your results or reset to try again.</p>
        )}
      </div>

      <div className="controls">
        <button onClick={reset}>Reset</button>
        {sessionActive && (
          <button onClick={endSession} className="end-session-btn">End Session</button>
        )}
        {sessionStarted && !sessionActive && (
          <button onClick={downloadSessionData}>Download Session Data</button>
        )}
      </div>

      {saveStatus && (
        <div className={`save-notification ${saveStatus}`}>
          {saveStatus === 'saving' && '💾 Saving session...'}
          {saveStatus === 'success' && '✅ Session saved successfully!'}
          {saveStatus === 'error' && '❌ Failed to save session. Data downloaded locally.'}
        </div>
      )}
    </div>
  );
}

export default TypingTest;
