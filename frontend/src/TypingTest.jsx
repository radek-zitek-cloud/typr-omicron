import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './TypingTest.css';
import wordsData from './words.json';

// Configuration constants
const SCROLL_SPEED_MULTIPLIER = 0.6; // Controls how fast the text scrolls

// Helper function to generate random text and initialize char states
function initializeTextAndStates(wordsData) {
  const words = [];
  for (let i = 0; i < 50; i++) {
    const randomWord = wordsData[Math.floor(Math.random() * wordsData.length)];
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
  // Generate initial data once using useMemo (memoized, won't regenerate)
  const initialData = useMemo(() => initializeTextAndStates(wordsData), []);
  
  const [text, setText] = useState(initialData.text);
  const [charStates, setCharStates] = useState(initialData.charStates);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [events, setEvents] = useState([]);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const sessionStartTimeRef = useRef(null);
  const lastKeystrokeTimeRef = useRef(null);
  const textDisplayRef = useRef(null);
  const [charWidth, setCharWidth] = useState(SCROLL_SPEED_MULTIPLIER);
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

  // Measure character width for precise scrolling
  useEffect(() => {
    if (textDisplayRef.current) {
      // Get the first character element to measure its width
      const firstChar = textDisplayRef.current.querySelector('.char');
      if (firstChar) {
        const rect = firstChar.getBoundingClientRect();
        const computedStyle = getComputedStyle(textDisplayRef.current);
        if (computedStyle && computedStyle.fontSize) {
          const fontSize = parseFloat(computedStyle.fontSize);
          // Convert pixel width to em units, fallback to SCROLL_SPEED_MULTIPLIER if invalid
          const widthInEm = rect.width / fontSize;
          if (!isNaN(widthInEm) && widthInEm > 0) {
            setCharWidth(widthInEm);
          }
        }
      }
    }
  }, [text]); // Recalculate when text changes

  // Calculate accuracy - productive accuracy only (first-time attempts)
  const calculateAccuracy = (maxReached, errors) => {
    if (maxReached === 0) return 100;
    const productiveChars = maxReached;
    const firstTimeErrorCount = errors.size;
    const correct = productiveChars - firstTimeErrorCount;
    return ((correct / productiveChars) * 100).toFixed(2);
  };

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
  }, []);

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
    downloadSessionFile(sessionData);
  }, [buildSessionData, downloadSessionFile]);

  // Download session data without modifying state (for already-ended sessions)
  const downloadSessionData = useCallback(() => {
    const sessionData = buildSessionData();
    downloadSessionFile(sessionData);
  }, [buildSessionData, downloadSessionFile]);

  // Handle key down event
  const handleKeyDown = useCallback((e) => {
    // Prevent actions if we've completed the text
    if (currentIndex >= text.length) return;
    
    // Prevent actions if session ended (but allow starting new session)
    if (sessionStarted && !sessionActive) return;
    
    // Start session on first keystroke
    if (!sessionStarted) {
      setSessionStarted(true);
      setSessionActive(true);
      sessionStartTimeRef.current = Date.now();
    }

    // Update last keystroke time for every keystroke
    lastKeystrokeTimeRef.current = Date.now();

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
  }, [sessionStarted, sessionActive, currentIndex, text]);

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

  // Render individual character with styling
  const renderCharacter = (charState, index) => {
    let className = 'char';
    // Display user's typed character if available, otherwise show expected character
    const displayChar = charState.userBuffer || charState.char;
    
    // Determine class based on status
    if (charState.status === 'correct') {
      className += ' correct';
    } else if (charState.status === 'incorrect') {
      className += ' incorrect';
    } else if (charState.status === 'corrected') {
      className += ' corrected';
    } else if (index === currentIndex) {
      // Current character (caret position)
      className += ' current';
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
    // Reset to initial state (same text for retry)
    setText(initialData.text);
    setCharStates(initialData.charStates);
    setCurrentIndex(0);
    setEvents([]);
    setSessionActive(false);
    setSessionStarted(false);
    setTotalKeystrokes(0);
    setMaxIndexReached(0);
    setFirstTimeErrors(new Set());
    sessionStartTimeRef.current = null;
    lastKeystrokeTimeRef.current = null;
  };

  return (
    <div className="typing-test">
      <div className="header">
        <h1>Typing Speed Analyzer</h1>
        <div className="stats">
          {sessionStarted && (
            <>
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

      <div className="text-container">
        <div 
          ref={textDisplayRef}
          className="text-display" 
          style={{
            transform: `translateX(${-currentIndex * charWidth}em)`,
            marginLeft: '50%'
          }}
        >
          {charStates.map((charState, index) => renderCharacter(charState, index))}
        </div>
        <div className="caret-line"></div>
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
