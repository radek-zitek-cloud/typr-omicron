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

# Install frontend dependencies
cd frontend
npm install
```

### Running the Application

```bash
# Development mode
cd frontend
npm run dev
```

The application will be available at `http://localhost:5173/`

### Building for Production

```bash
cd frontend
npm run build
```

The built files will be in the `frontend/dist/` directory.

## Project Structure

```
typr-omicron/
├── frontend/              # React web application
│   ├── src/
│   │   ├── TypingTest.jsx    # Main typing test component
│   │   ├── TypingTest.css    # Component styles
│   │   ├── words.json        # Word configuration file
│   │   ├── App.jsx           # App entry point
│   │   └── main.jsx          # React entry point
│   ├── package.json
│   └── README.md             # Frontend documentation
└── README.md             # This file
```

## Technology Stack

- **Frontend**: React 19, Vite
- **Styling**: CSS3 with animations
- **Build Tool**: Vite
- **Code Quality**: ESLint

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
