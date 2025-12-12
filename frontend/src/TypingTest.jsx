import { useState, useEffect, useRef, useCallback } from 'react';
import './TypingTest.css';
import wordsData from './words.json';

// Configuration constants
const INACTIVITY_TIMEOUT_MS = 5000; // 5 seconds
const SCROLL_SPEED_MULTIPLIER = 0.6; // Controls how fast the text scrolls

function TypingTest() {
  // Helper function to generate random text
  const generateText = () => {
    const words = [];
    for (let i = 0; i < 50; i++) {
      const randomWord = wordsData[Math.floor(Math.random() * wordsData.length)];
      words.push(randomWord);
    }
    return words.join(' ');
  };

  const [text, setText] = useState(generateText);
  const [userInput, setUserInput] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [events, setEvents] = useState([]);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const inactivityTimerRef = useRef(null);
  const sessionStartTimeRef = useRef(null);
  const textDisplayRef = useRef(null);
  const [charWidth, setCharWidth] = useState(SCROLL_SPEED_MULTIPLIER);
  // Track which positions have been typed incorrectly at least once
  const [errorPositions, setErrorPositions] = useState(new Set());
  // Track productive keystrokes (excluding backspace and corrections)
  const [productiveKeystrokes, setProductiveKeystrokes] = useState(0);
  
  // Refs to store latest values for timeout callback
  const textRef = useRef(text);
  const userInputRef = useRef(userInput);
  const eventsRef = useRef(events);
  const errorPositionsRef = useRef(errorPositions);
  const productiveKeystrokesRef = useRef(productiveKeystrokes);
  
  // Update refs when state changes
  useEffect(() => {
    textRef.current = text;
    userInputRef.current = userInput;
    eventsRef.current = events;
    errorPositionsRef.current = errorPositions;
    productiveKeystrokesRef.current = productiveKeystrokes;
  }, [text, userInput, events, errorPositions, productiveKeystrokes]);

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

  // Calculate accuracy - characters marked as incorrect stay incorrect even after correction
  const calculateAccuracy = (input, targetText, errPositions) => {
    if (input.length === 0) return 100;
    let correct = 0;
    for (let i = 0; i < input.length; i++) {
      // A character is correct only if it matches AND was never typed incorrectly
      if (input[i] === targetText[i] && !errPositions.has(i)) {
        correct++;
      }
    }
    return ((correct / input.length) * 100).toFixed(2);
  };

  // End session and export data
  const endSession = useCallback(() => {
    setSessionActive(false);
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    
    // Export data automatically when session ends using refs for latest values
    const sessionData = {
      text: textRef.current,
      userInput: userInputRef.current,
      events: eventsRef.current,
      sessionDuration: sessionStartTimeRef.current 
        ? Date.now() - sessionStartTimeRef.current 
        : 0,
      accuracy: calculateAccuracy(userInputRef.current, textRef.current, errorPositionsRef.current),
      errorPositions: Array.from(errorPositionsRef.current),
      productiveKeystrokes: productiveKeystrokesRef.current,
      timestamp: new Date().toISOString()
    };

    const dataStr = JSON.stringify(sessionData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `typing-session-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    inactivityTimerRef.current = setTimeout(() => {
      endSession();
    }, INACTIVITY_TIMEOUT_MS);
  }, [endSession]);

  // Export session data as JSON (for manual export button)
  const exportData = useCallback(() => {
    const sessionData = {
      text: textRef.current,
      userInput: userInputRef.current,
      events: eventsRef.current,
      sessionDuration: sessionStartTimeRef.current 
        ? Date.now() - sessionStartTimeRef.current 
        : 0,
      accuracy: calculateAccuracy(userInputRef.current, textRef.current, errorPositionsRef.current),
      errorPositions: Array.from(errorPositionsRef.current),
      productiveKeystrokes: productiveKeystrokesRef.current,
      timestamp: new Date().toISOString()
    };

    const dataStr = JSON.stringify(sessionData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `typing-session-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  // Handle key down event
  const handleKeyDown = useCallback((e) => {
    // Start session on first keystroke
    if (!sessionStarted) {
      setSessionStarted(true);
      setSessionActive(true);
      sessionStartTimeRef.current = Date.now();
    }

    const eventData = {
      type: 'keydown',
      key: e.key,
      code: e.code,
      timestamp: Date.now(),
      relativeTime: sessionStartTimeRef.current ? Date.now() - sessionStartTimeRef.current : 0,
      currentIndex: currentIndex,
      expectedChar: text[currentIndex],
    };

    setEvents(prev => [...prev, eventData]);
    resetInactivityTimer();

    // Handle character input
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (userInput.length > 0) {
        setUserInput(prev => prev.slice(0, -1));
        setCurrentIndex(prev => prev - 1);
        // Backspace is not a productive keystroke
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Only process printable characters without modifiers
      e.preventDefault();
      
      // Check if this character is incorrect
      const isIncorrect = e.key !== text[currentIndex];
      
      // Mark position as error if incorrect
      if (isIncorrect) {
        setErrorPositions(prev => new Set(prev).add(currentIndex));
      }
      
      // Only count as productive keystroke if position was never an error
      // and the current keystroke is correct
      if (currentIndex >= userInput.length && !errorPositions.has(currentIndex) && !isIncorrect) {
        // Typing new character at a position that was never an error and is correct - count as productive
        setProductiveKeystrokes(prev => prev + 1);
      } else if (currentIndex < userInput.length && !errorPositions.has(currentIndex) && !isIncorrect) {
        // Retyping a position that was never an error and is correct now
        // This shouldn't normally happen, but count it as productive
        setProductiveKeystrokes(prev => prev + 1);
      }
      // If position is marked as error OR current keystroke is incorrect, don't count as productive
      
      setUserInput(prev => prev + e.key);
      setCurrentIndex(prev => prev + 1);

      // Check if we've reached the end of the text
      if (currentIndex >= text.length - 1) {
        endSession();
      }
    }
  }, [sessionStarted, currentIndex, text, userInput.length, errorPositions, resetInactivityTimer, endSession]);

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
      expectedChar: text[currentIndex],
    };

    setEvents(prev => [...prev, eventData]);
  }, [currentIndex, text]);

  // Render individual character with styling
  const renderCharacter = (char, index) => {
    let className = 'char';
    
    if (index < userInput.length) {
      // Character has been typed
      // Mark as incorrect if it was ever typed incorrectly, even if corrected
      if (errorPositions.has(index)) {
        className += ' incorrect';
      } else if (userInput[index] === text[index]) {
        className += ' correct';
      } else {
        className += ' incorrect';
      }
    } else if (index === currentIndex) {
      // Current character (caret position)
      className += ' current';
    }

    return (
      <span key={index} className={className}>
        {char}
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
    setText(generateText());
    setUserInput('');
    setCurrentIndex(0);
    setEvents([]);
    setSessionActive(false);
    setSessionStarted(false);
    setErrorPositions(new Set());
    setProductiveKeystrokes(0);
    sessionStartTimeRef.current = null;
    
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
  };

  return (
    <div className="typing-test">
      <div className="header">
        <h1>Typing Speed Analyzer</h1>
        <div className="stats">
          {sessionStarted && (
            <>
              <span>Characters: {userInput.length}</span>
              <span>Accuracy: {calculateAccuracy(userInput, text, errorPositions)}%</span>
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
          {text.split('').map((char, index) => renderCharacter(char, index))}
        </div>
        <div className="caret-line"></div>
      </div>

      <div className="instructions">
        {!sessionStarted ? (
          <p>Start typing to begin the test. The timer starts on your first keystroke.</p>
        ) : (
          <p>Session will end after 5 seconds of inactivity.</p>
        )}
      </div>

      <div className="controls">
        <button onClick={reset}>Reset</button>
        {sessionStarted && !sessionActive && (
          <button onClick={exportData}>Download Session Data</button>
        )}
      </div>
    </div>
  );
}

export default TypingTest;
