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
  
  // Refs to store latest values for timeout callback
  const textRef = useRef(text);
  const userInputRef = useRef(userInput);
  const eventsRef = useRef(events);
  
  // Update refs when state changes
  useEffect(() => {
    textRef.current = text;
    userInputRef.current = userInput;
    eventsRef.current = events;
  }, [text, userInput, events]);

  // Measure character width for precise scrolling
  useEffect(() => {
    if (textDisplayRef.current) {
      // Get the first character element to measure its width
      const firstChar = textDisplayRef.current.querySelector('.char');
      if (firstChar) {
        const rect = firstChar.getBoundingClientRect();
        const fontSize = parseFloat(getComputedStyle(textDisplayRef.current).fontSize);
        // Convert pixel width to em units
        const widthInEm = rect.width / fontSize;
        setCharWidth(widthInEm);
      }
    }
  }, [text]); // Recalculate when text changes

  // Calculate accuracy
  const calculateAccuracy = (input, targetText) => {
    if (input.length === 0) return 100;
    let correct = 0;
    for (let i = 0; i < input.length; i++) {
      if (input[i] === targetText[i]) {
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
      accuracy: calculateAccuracy(userInputRef.current, textRef.current),
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
      accuracy: calculateAccuracy(userInputRef.current, textRef.current),
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
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Only process printable characters without modifiers
      e.preventDefault();
      setUserInput(prev => prev + e.key);
      setCurrentIndex(prev => prev + 1);

      // Check if we've reached the end of the text
      if (currentIndex >= text.length - 1) {
        endSession();
      }
    }
  }, [sessionStarted, currentIndex, text, userInput.length, resetInactivityTimer, endSession]);

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
      if (userInput[index] === text[index]) {
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
              <span>Accuracy: {calculateAccuracy(userInput, text)}%</span>
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
