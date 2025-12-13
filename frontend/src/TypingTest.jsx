import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAppContext } from './AppContext';
import ConfigBar from './ConfigBar';
import './TypingTest.css';
import wordsData from './words.json';
import { playCorrectSound, playErrorSound, resumeAudioContext } from './soundUtils';

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

// Helper function to generate random text and initialize char states
function initializeTextAndStates(wordsData, wordCount = 50) {
  const words = [];
  const source = getWordSource();
  for (let i = 0; i < wordCount; i++) {
    const randomWord = source[Math.floor(Math.random() * source.length)];
    words.push(randomWord);
  }
  const textStr = words.join(' ');
  const initialStates = textStr.split('').map(char => ({
    char: char,
    userBuffer: null,
    status: 'pending' // pending, correct, incorrect, corrected
  }));
  return { text: textStr, charStates: initialStates };
}

function TypingTest() {
  const { testConfig, saveSession, currentUser } = useAppContext();
  
  // Generate initial data based on test config
  const initialWordCount = testConfig.mode === 'words' ? testConfig.wordCount : 200; // More words for time mode
  const initialData = useMemo(() => initializeTextAndStates(wordsData, initialWordCount), [initialWordCount]);
  
  const [text, setText] = useState(initialData.text);
  const [charStates, setCharStates] = useState(initialData.charStates);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [events, setEvents] = useState([]);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null); // For time mode
  const sessionStartTimeRef = useRef(null);
  const lastKeystrokeTimeRef = useRef(null);
  const textDisplayRef = useRef(null);
  const audioContextResumedRef = useRef(false);
  const [trackTransform, setTrackTransform] = useState(0); // For kinetic tape mode centering
  // Track metrics
  const [totalKeystrokes, setTotalKeystrokes] = useState(0); // Mechanical: all keypresses
  const [maxIndexReached, setMaxIndexReached] = useState(0); // Productive: unique indices visited
  const [firstTimeErrors, setFirstTimeErrors] = useState(new Set()); // Positions with first-attempt error
  
  // Refs to store latest values for timeout callback
  const textRef = useRef(text);
  const charStatesRef = useRef(charStates);
  const eventsRef = useRef(events);
  const totalKeystrokesRef = useRef(totalKeystrokes);
  const maxIndexReachedRef = useRef(maxIndexReached);
  const firstTimeErrorsRef = useRef(firstTimeErrors);
  
  // Update refs when state changes
  useEffect(() => {
    textRef.current = text;
    charStatesRef.current = charStates;
    eventsRef.current = events;
    totalKeystrokesRef.current = totalKeystrokes;
    maxIndexReachedRef.current = maxIndexReached;
    firstTimeErrorsRef.current = firstTimeErrors;
  }, [text, charStates, events, totalKeystrokes, maxIndexReached, firstTimeErrors]);

  // Kinetic Text Centering Algorithm
  // Calculate the translateX value to lock the active character at viewport center (50%)
  useEffect(() => {
    if (textDisplayRef.current && currentIndex >= 0) {
      const chars = textDisplayRef.current.querySelectorAll('.char');
      if (chars[currentIndex]) {
        // Get the active character's position
        const activeChar = chars[currentIndex];
        
        // Use offsetLeft and offsetWidth to avoid expensive getBoundingClientRect()
        const charCenterOffset = (activeChar.offsetLeft || 0) + ((activeChar.offsetWidth || 0) / 2);
        
        // We want to center this at 0 (since track is positioned at left: 50%)
        // Transform = negative of the offset to bring it to center
        const newTransform = -charCenterOffset;
        
        // This is a valid use of setState in effect - we're synchronizing with DOM measurements
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTrackTransform(newTransform);
      }
    }
  }, [currentIndex, text]); // Recalculate when current index or text changes

  // Helper to calculate target character count from word count
  const calculateTargetChars = useCallback((wordCount) => {
    // Approximate: average word length + 1 space
    return wordCount * 6; // Rough estimate
  }, []);

  // Calculate accuracy - productive accuracy only (first-time attempts)
  const calculateAccuracy = useCallback((maxReached, errors) => {
    if (maxReached === 0) return 100;
    const productiveChars = maxReached;
    const firstTimeErrorCount = errors.size;
    const correct = productiveChars - firstTimeErrorCount;
    return ((correct / productiveChars) * 100).toFixed(2);
  }, []);

  // Helper function to build session data for export
  const buildSessionData = useCallback(() => {
    // Calculate session duration up to the last keystroke
    // This removes the trailing time between last keystroke and end of session
    const startTime = sessionStartTimeRef.current;
    const endTime = lastKeystrokeTimeRef.current || sessionStartTimeRef.current || Date.now();
    const duration = startTime ? endTime - startTime : 0;
    const durationInMinutes = duration / 60000;
    
    // Calculate metrics
    const mechanicalCPM = durationInMinutes > 0 
      ? (totalKeystrokesRef.current / durationInMinutes).toFixed(2)
      : 0;
    const productiveCPM = durationInMinutes > 0 
      ? (maxIndexReachedRef.current / durationInMinutes).toFixed(2)
      : 0;
    const accuracy = calculateAccuracy(maxIndexReachedRef.current, firstTimeErrorsRef.current);
    
    // Build user input string from charStates
    const userInputStr = charStatesRef.current
      .map(cs => cs.userBuffer !== null ? cs.userBuffer : '')
      .join('');
    
    return {
      text: textRef.current,
      userInput: userInputStr,
      charStates: charStatesRef.current,
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
  }, [calculateAccuracy]);

  // Helper function to download session data as JSON file
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

  // End session and export data
  const endSession = useCallback(() => {
    setSessionActive(false);
    const sessionData = buildSessionData();
    
    // Save to context/localStorage
    if (saveSession) {
      saveSession(sessionData);
    }
    
    // Also download as JSON file
    downloadSessionFile(sessionData);
  }, [buildSessionData, downloadSessionFile, saveSession]);

  // Download session data without modifying state (for already-ended sessions)
  const downloadSessionData = useCallback(() => {
    const sessionData = buildSessionData();
    downloadSessionFile(sessionData);
  }, [buildSessionData, downloadSessionFile]);

  // Timer logic for time mode
  useEffect(() => {
    if (testConfig.mode === 'time' && sessionActive && timeRemaining !== null) {
      if (timeRemaining <= 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // Check word count completion for word mode
  useEffect(() => {
    if (testConfig.mode === 'words' && sessionActive) {
      const targetChars = calculateTargetChars(testConfig.wordCount);
      if (maxIndexReached >= targetChars) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        endSession();
      }
    }
  }, [testConfig.mode, testConfig.wordCount, sessionActive, maxIndexReached, endSession, calculateTargetChars]);

  // Handle key down event
  const handleKeyDown = useCallback((e) => {
    // Resume audio context on first user interaction (required by browsers)
    if (currentUser?.settings.soundEnabled && !audioContextResumedRef.current) {
      const resumed = resumeAudioContext();
      // Only set to true if context is available and resume was initiated or already running
      if (resumed) {
        audioContextResumedRef.current = true;
      }
    }
    
    // Prevent actions if we've completed the text (except in time mode where we generate more)
    if (testConfig.mode === 'words' && currentIndex >= text.length) return;
    
    // Prevent actions if session ended (but allow starting new session)
    if (sessionStarted && !sessionActive) return;
    
    // Start session on first keystroke
    if (!sessionStarted) {
      setSessionStarted(true);
      setSessionActive(true);
      sessionStartTimeRef.current = Date.now();
      
      // Initialize timer for time mode
      if (testConfig.mode === 'time') {
        setTimeRemaining(testConfig.timeLimit);
      }
    }

    // Update last keystroke time for every keystroke
    lastKeystrokeTimeRef.current = Date.now();
    
    // Generate more text dynamically for time mode if getting close to end
    if (testConfig.mode === 'time' && currentIndex > text.length - 50) {
      const newData = initializeTextAndStates(wordsData, 50);
      setText(prev => prev + ' ' + newData.text);
      setCharStates(prev => [...prev, ...newData.charStates]);
    }

    const eventData = {
      type: 'keydown',
      key: e.key,
      code: e.code,
      timestamp: Date.now(),
      relativeTime: sessionStartTimeRef.current ? Date.now() - sessionStartTimeRef.current : 0,
      currentIndex: currentIndex,
      expectedChar: currentIndex < text.length ? text[currentIndex] : '',
    };

    setEvents(prev => [...prev, eventData]);

    // Handle backspace (State 3: Correction)
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (currentIndex > 0) {
        // Don't reset character state - keep the original char and status history
        // This allows State 4 logic to determine if it was a first attempt or re-type
        setCurrentIndex(prev => prev - 1);
        // Count backspace in mechanical CPM (total keypresses)
        setTotalKeystrokes(prev => prev + 1);
      }
    } 
    // Handle printable characters
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      
      // Count this keystroke for mechanical CPM
      setTotalKeystrokes(prev => prev + 1);
      
      const expectedChar = text[currentIndex];
      const isCorrect = e.key === expectedChar;
      
      // Play sound based on correctness
      if (currentUser?.settings.soundEnabled) {
        if (isCorrect) {
          playCorrectSound();
        } else {
          playErrorSound();
        }
      }
      
      setCharStates(prev => {
        const newStates = [...prev];
        const currentState = newStates[currentIndex];
        
        // Check if this is the first time typing at this index
        const isFirstAttempt = currentState.userBuffer === null;
        
        if (isFirstAttempt) {
          // State 1 or State 2: First attempt at this position
          if (isCorrect) {
            // State 1: Correct Input
            newStates[currentIndex] = {
              ...currentState,
              userBuffer: e.key,
              status: 'correct'
            };
          } else {
            // State 2: Incorrect Input
            newStates[currentIndex] = {
              ...currentState,
              userBuffer: e.key,
              status: 'incorrect'
            };
            // Track first-time error
            setFirstTimeErrors(prev => new Set(prev).add(currentIndex));
          }
          // Update max index reached for productive CPM
          setMaxIndexReached(prev => Math.max(prev, currentIndex + 1));
        } else {
          // State 4: Re-typing a correction (after backspace)
          if (isCorrect) {
            // Re-typed correctly - mark as corrected (orange)
            newStates[currentIndex] = {
              ...currentState,
              userBuffer: e.key,
              status: 'corrected'
            };
          } else {
            // Re-typed incorrectly - mark as incorrect (red)
            newStates[currentIndex] = {
              ...currentState,
              userBuffer: e.key,
              status: 'incorrect'
            };
          }
          // Don't update maxIndexReached for re-typing
          // Don't add to firstTimeErrors (already tracked or not)
        }
        
        return newStates;
      });
      
      // Move to next character
      setCurrentIndex(prev => prev + 1);

      // Check if we've reached the end of the text (after incrementing)
      if (currentIndex + 1 >= text.length) {
        // Don't auto-end session, just let the user end it manually
        // The session remains active for the user to end it when ready
      }
    }
  }, [sessionStarted, sessionActive, currentIndex, text, testConfig, currentUser]);

  // Handle key up event
  const handleKeyUp = useCallback((e) => {
    if (!sessionStartTimeRef.current) return;

    const eventData = {
      type: 'keyup',
      key: e.key,
      code: e.code,
      timestamp: Date.now(),
      relativeTime: Date.now() - sessionStartTimeRef.current,
      currentIndex: currentIndex,
      expectedChar: currentIndex < text.length ? text[currentIndex] : '',
    };

    setEvents(prev => [...prev, eventData]);
  }, [currentIndex, text]);

  // Render individual character with styling (Kinetic Tape Mode)
  const renderCharacter = (charState, index) => {
    let className = 'char';
    // Display user's typed character if available, otherwise show expected character
    const displayChar = charState.userBuffer || charState.char;
    
    // Determine class based on status and position
    if (index === currentIndex) {
      // Active character - locked at focal point
      className += ' active current';
    } else if (charState.status === 'correct') {
      className += ' correct';
    } else if (charState.status === 'incorrect') {
      className += ' incorrect';
    } else if (charState.status === 'corrected') {
      className += ' corrected';
    } else if (charState.status === 'pending') {
      // Pending character - not yet typed
      className += ' pending';
    }

    return (
      <span key={index} className={className}>
        {displayChar}
      </span>
    );
  };

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
    // Generate new text for the configured mode
    const newWordCount = testConfig.mode === 'words' ? testConfig.wordCount : 200;
    const newData = initializeTextAndStates(wordsData, newWordCount);
    
    // Reset to new text
    setText(newData.text);
    setCharStates(newData.charStates);
    setCurrentIndex(0);
    setEvents([]);
    setSessionActive(false);
    setSessionStarted(false);
    setTimeRemaining(null);
    setTotalKeystrokes(0);
    setMaxIndexReached(0);
    setFirstTimeErrors(new Set());
    sessionStartTimeRef.current = null;
    lastKeystrokeTimeRef.current = null;
  };

  // Apply font settings from user profile
  const getFontFamily = () => {
    return currentUser?.settings.font || 'Courier New';
  };
  
  const getFontSize = () => {
    const size = currentUser?.settings.fontSize || 'M';
    return size === 'S' ? '1.5rem' : size === 'L' ? '2.5rem' : '2rem';
  };

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
              <span>Max Reached: {maxIndexReached}</span>
              <span>Accuracy: {calculateAccuracy(maxIndexReached, firstTimeErrors)}%</span>
              <span className={sessionActive ? 'active' : 'inactive'}>
                {sessionActive ? '● Recording' : '○ Ended'}
              </span>
            </>
          )}
        </div>
      </div>

      <ConfigBar />

      <div className="text-container">
        {/* Caret overlay - fixed at center (50%) */}
        <div className="caret-line"></div>
        
        {/* Text track - moves horizontally to keep active char centered */}
        <div 
          ref={textDisplayRef}
          className="text-display" 
          style={{
            transform: `translateX(${trackTransform}px)`,
            fontFamily: getFontFamily(),
            fontSize: getFontSize()
          }}
        >
          {charStates.map((charState, index) => renderCharacter(charState, index))}
        </div>
      </div>

      <div className="instructions">
        {!sessionStarted ? (
          <p>Start typing to begin the test. The timer starts on your first keystroke.</p>
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
    </div>
  );
}

export default TypingTest;
