# Typing Speed Analyzer

A React-based web application designed to measure and analyze touch typing skills with maximum precision.

## Features

- **Real-time Typing Test**: Type a sequence of random English words displayed in the center of the screen
- **Visual Feedback**: 
  - Green highlighting for correctly typed letters
  - Red highlighting for incorrectly typed letters
  - Animated caret that stays centered on the screen
  - Smooth horizontal scrolling of text
- **Precise Event Tracking**: Records all keyboard events (keydown/keyup) with millisecond precision
- **Backspace Support**: Users can backtrack and correct mistakes
- **Automatic Session Management**:
  - Timer starts on first keystroke
  - Session ends after 5 seconds of inactivity
  - Automatic JSON export of session data
- **Performance Metrics**: Real-time display of characters typed and accuracy percentage

## Getting Started

### Prerequisites

- Node.js (v20 or higher)
- npm (v10 or higher)

### Installation

```bash
cd frontend
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173/`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Usage

1. Open the application in your browser
2. Start typing - the timer will begin automatically with your first keystroke
3. Type the displayed words as accurately as possible
4. Use backspace to correct mistakes
5. After 5 seconds of inactivity, the session will automatically end and download a JSON file with your session data

## Session Data

The application exports a JSON file containing:

- `text`: The complete word sequence that was displayed
- `userInput`: What the user actually typed
- `events`: Array of all keyboard events with precise timestamps:
  - `type`: 'keydown' or 'keyup'
  - `key`: The key that was pressed
  - `code`: The key code
  - `timestamp`: Absolute timestamp
  - `relativeTime`: Time relative to session start
  - `currentIndex`: Character position when event occurred
  - `expectedChar`: What character was expected at that position
- `sessionDuration`: Total session duration in milliseconds
- `accuracy`: Typing accuracy percentage
- `timestamp`: ISO timestamp of when session ended

## Configuration

### Word List

The word list can be customized by editing `src/words.json`. This file contains an array of English words used for the typing test.

### Session Timeout

To change the inactivity timeout (default: 5 seconds), modify the timeout value in `src/TypingTest.jsx`:

```javascript
inactivityTimerRef.current = setTimeout(() => {
  endSession();
}, 5000); // Change this value (in milliseconds)
```

### Scroll Threshold

To adjust when text scrolling begins (default: after 20 characters), modify the threshold in `src/TypingTest.jsx`:

```javascript
if (currentIndex > 20) { // Change this value
  setScrollOffset(prev => prev + 1);
}
```

## Technology Stack

- **React 19**: UI framework
- **Vite**: Build tool and development server
- **CSS3**: Styling with animations and transitions

## License

This project is part of the typr-omicron repository.
