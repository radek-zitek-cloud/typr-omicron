# Typr Omicron

A comprehensive typing speed analysis application designed to measure and analyze touch typing skills with maximum precision.

## Project Overview

This project provides a web-based typing test application that records detailed keystroke data for in-depth analysis of typing performance, strengths, and weaknesses.

## Features

- **Precision Keystroke Tracking**: Records keydown and keyup events with millisecond-level precision
- **Visual Feedback**: Real-time color-coded feedback (green for correct, red for incorrect)
- **Smart Text Scrolling**: Keeps the typing caret centered while text scrolls horizontally
- **Manual Session Control**: End the session with a dedicated "End Session" button when you're ready
- **Data Export**: Automatic JSON export of complete session data for analysis
- **Backspace Support**: Full support for corrections and backtracking
- **Performance Metrics**: Real-time accuracy and character count display
- **Accurate Duration Tracking**: Session duration excludes trailing time after the last keystroke

### V2 Analytics Features

- **Digraph Latency Analysis**: Identifies the slowest character-pair transitions (digraphs) to reveal anatomical bottlenecks between fingers
- **Error Confusion Matrix**: Diagnoses typing errors by showing what you typed instead of the target character
- **Typing Rhythm Visualization**: Seismograph-style chart showing your typing consistency, flow state, hesitation, and fatigue patterns
- **Shift Key Penalty**: Measures the biomechanical cost of using capital letters compared to lowercase

## Getting Started

### Prerequisites

- Node.js v20 or higher
- npm v10 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/radek-zitek-cloud/typr-omicron.git
cd typr-omicron

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Running the Application

**Option 1: With Backend (Recommended)**

```bash
# Terminal 1 - Start the backend server
cd backend
npm start

# Terminal 2 - Start the frontend
cd frontend
npm run dev
```

The backend will be available at `http://localhost:3001/`
The frontend will be available at `http://localhost:5173/`

When the backend is running, all data (user profiles, settings, and session history) will be persisted in a SQLite database. If the backend is not available, the application will fall back to using localStorage.

**Option 2: Without Backend (localStorage only)**

```bash
# Development mode
cd frontend
npm run dev
```

The application will be available at `http://localhost:5173/` and will use localStorage for data persistence.

### Building for Production

```bash
# Build frontend
cd frontend
npm run build

# Build backend (backend runs directly from source)
cd backend
npm install --production
```

The frontend built files will be in the `frontend/dist/` directory.

## Project Structure

```
typr-omicron/
├── backend/               # Express API server with SQLite
│   ├── src/
│   │   ├── routes/           # API route handlers
│   │   ├── database.js       # Database setup and schema
│   │   └── index.js          # Express server entry point
│   ├── data/                 # SQLite database files (gitignored)
│   ├── package.json
│   └── README.md
├── frontend/              # React web application
│   ├── src/
│   │   ├── TypingTest.jsx    # Main typing test component
│   │   ├── Analyzer.jsx      # Session analysis and statistics
│   │   ├── AppContext.jsx    # Global state and API integration
│   │   ├── apiService.js     # Backend API service layer
│   │   ├── History.jsx       # Session history viewer
│   │   ├── Settings.jsx      # User settings management
│   │   ├── App.jsx           # App entry point
│   │   └── main.jsx          # React entry point
│   ├── package.json
│   └── README.md             # Frontend documentation
└── README.md             # This file
```

## Technology Stack

- **Backend**: Node.js, Express.js 5.x, SQLite (better-sqlite3)
- **Frontend**: React 19, Vite
- **Styling**: CSS3 with animations
- **Build Tool**: Vite
- **Code Quality**: ESLint
- **Data Persistence**: SQLite database (with localStorage fallback)

## Session Data Format

Each typing session exports a JSON file containing:

```json
{
  "text": "complete word sequence displayed",
  "userInput": "what user actually typed",
  "events": [
    {
      "type": "keydown|keyup",
      "key": "character pressed",
      "code": "key code",
      "timestamp": "absolute timestamp",
      "relativeTime": "milliseconds from session start",
      "currentIndex": "cursor position",
      "expectedChar": "expected character"
    }
  ],
  "sessionDuration": "total duration in ms",
  "accuracy": "percentage accuracy",
  "timestamp": "ISO timestamp"
}
```

## Use Cases

- **Typing Skill Analysis**: Identify typing patterns, strengths, and weaknesses
- **Performance Tracking**: Monitor typing improvement over time
- **Research**: Study human-computer interaction and typing behavior
- **Training**: Develop targeted typing improvement programs

## Configuration

See [frontend/README.md](frontend/README.md) for detailed configuration options including:
- Custom word lists
- Scroll threshold customization

## License

See LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
