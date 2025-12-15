# Typr Omicron - Complete Application Specification

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Technology Stack](#technology-stack)
4. [Frontend Application](#frontend-application)
5. [Backend Application](#backend-application)
6. [Data Models and Formats](#data-models-and-formats)
7. [Features and Functionality](#features-and-functionality)
8. [Analytics and Visualization](#analytics-and-visualization)
9. [User Experience Flow](#user-experience-flow)
10. [Configuration and Customization](#configuration-and-customization)
11. [Performance Optimizations](#performance-optimizations)
12. [Deployment and Build](#deployment-and-build)

---

## Executive Summary

Typr Omicron is a comprehensive web-based typing speed analysis application designed to measure and analyze touch typing skills with maximum precision. The application records detailed keystroke data at millisecond precision, providing in-depth analysis of typing performance, biomechanical patterns, strengths, and weaknesses.

### Core Purpose
- Measure typing speed (WPM/CPM) with high accuracy
- Capture and analyze detailed keystroke timing data
- Identify typing patterns, bottlenecks, and areas for improvement
- Track progress over time through session history
- Provide advanced analytics including digraph analysis, error patterns, and rhythm visualization

### Key Differentiators
- Millisecond-level keystroke precision tracking
- Kinetic text rendering with active character centered
- Comprehensive V2 analytics (digraph latency, error confusion matrix, rhythm visualization, shift penalty)
- Dual storage backend (SQLite database with localStorage fallback)
- Multiple test modes (time-based and word count-based)
- Export functionality for external analysis

---

## Architecture Overview

### System Architecture

The application follows a client-server architecture with graceful degradation:

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Client)                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           React Frontend (Port 5173)                  │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐   │  │
│  │  │ Typing Test │  │   Analyzer   │  │  History   │   │  │
│  │  └─────────────┘  └──────────────┘  └────────────┘   │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐   │  │
│  │  │  Settings   │  │ User Profile │  │ ConfigBar  │   │  │
│  │  └─────────────┘  └──────────────┘  └────────────┘   │  │
│  │                                                         │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │         AppContext (Global State)              │  │  │
│  │  │  - User Management                              │  │  │
│  │  │  - Test Configuration                           │  │  │
│  │  │  - Backend Health Monitoring                    │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                        ↓                               │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │         API Service Layer                      │  │  │
│  │  │  - Backend Communication                        │  │  │
│  │  │  - Automatic localStorage Fallback              │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                        ↓ HTTP                              │
└────────────────────────┼───────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              Express Backend (Port 3001)                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐   │  │
│  │  │ Users Routes │  │Settings Route│  │Sessions   │   │  │
│  │  └──────────────┘  └──────────────┘  └───────────┘   │  │
│  │                        ↓                               │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │      Database Layer (better-sqlite3)           │  │  │
│  │  │  - Users Table                                  │  │  │
│  │  │  - User Settings Table                          │  │  │
│  │  │  - Sessions Table                               │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                        ↓                                    │
│                  SQLite Database                            │
│              (backend/data/typr.db)                         │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Patterns

**With Backend Available:**
1. User actions → Frontend Component
2. Component → AppContext
3. AppContext → API Service
4. API Service → Backend Express Routes
5. Backend Routes → SQLite Database
6. Response flows back through the same chain

**With Backend Unavailable (Fallback Mode):**
1. User actions → Frontend Component
2. Component → AppContext
3. AppContext detects backend unavailable
4. Data stored/retrieved from localStorage directly
5. Periodic health checks attempt backend reconnection

### Communication Protocols

- **Frontend ↔ Backend:** RESTful HTTP/JSON API
- **Frontend ↔ localStorage:** Direct browser API calls
- **Health Check:** Periodic polling every 10 seconds
- **Rate Limiting:** 100 requests per 15 minutes (general), 50 requests per 15 minutes (write operations)

---

## Technology Stack

### Frontend

**Core Framework:**
- **React 19.2.0** - UI library with modern hooks and concurrent features
- **React Router DOM 7.10.1** - Client-side routing for SPA navigation
- **Vite 7.2.4** - Build tool and dev server with HMR

**Development Tools:**
- **ESLint 9.39.1** - Code quality and style enforcement
- **@vitejs/plugin-react 5.1.1** - Vite React plugin with Fast Refresh

**Browser APIs Used:**
- **Web Audio API** - Sound feedback generation
- **Canvas API** - Font detection and measurement
- **Font Access API** - System font enumeration (when available)
- **localStorage API** - Client-side data persistence
- **Performance API** - High-resolution timestamps

### Backend

**Core Framework:**
- **Node.js v20+** - JavaScript runtime
- **Express.js 5.2.1** - Web application framework

**Database:**
- **better-sqlite3 12.5.0** - Synchronous SQLite3 bindings

**Middleware & Utilities:**
- **cors 2.8.5** - Cross-origin resource sharing
- **dotenv 17.2.3** - Environment variable management
- **express-rate-limit 8.2.1** - Rate limiting middleware

### Data Storage

**Primary Storage (with backend):**
- **SQLite Database** - Relational database for structured data
  - Location: `backend/data/typr.db`
  - Schema: Users, Settings, Sessions tables with foreign keys

**Fallback Storage (without backend):**
- **localStorage** - Browser-based key-value storage
  - Keys: `typr_users`, `typr_current_user`, `typr_session_{id}`, `typr_custom_words`
  - Automatic sync when backend becomes available

### Build and Development

**Build Process:**
- Frontend: Vite → optimized static assets in `frontend/dist/`
- Backend: Runs directly from source (no build step)

**Development Servers:**
- Frontend: Vite dev server on port 5173 (configurable)
- Backend: Express server on port 3001 (configurable via .env)

---

## Frontend Application

### Application Structure

```
frontend/
├── src/
│   ├── main.jsx                  # React entry point
│   ├── App.jsx                   # Root component with routing
│   ├── AppContext.jsx            # Global state management
│   ├── apiService.js             # Backend API client
│   │
│   ├── TypingTest.jsx            # Main typing test component
│   ├── Analyzer.jsx              # Session analysis and statistics
│   ├── History.jsx               # Session history viewer
│   ├── Settings.jsx              # User settings panel
│   ├── ConfigBar.jsx             # Test mode configuration
│   ├── UserProfile.jsx           # User profile switcher
│   │
│   ├── KeyboardHeatmap.jsx       # Keyboard visualization
│   ├── HandHeatmap.jsx           # Hand/finger visualization
│   │
│   ├── soundUtils.js             # Audio feedback utilities
│   ├── fontDetection.js          # Monospaced font detection
│   │
│   ├── fingermap.json            # Key-to-finger mapping
│   ├── words.json                # Default 1000 common words
│   │
│   └── *.css                     # Component stylesheets
│
├── public/                       # Static assets
├── index.html                    # HTML template
├── vite.config.js               # Vite configuration
└── package.json                 # Dependencies and scripts
```

### Core Components

#### App.jsx - Root Component
**Purpose:** Application shell with routing and navigation

**Features:**
- React Router setup with 4 main routes
- Navigation bar with active route highlighting
- Backend connection status indicator
- User profile switcher in header

**Routes:**
- `/` - Typing Test (TypingTest component)
- `/history` - Session History (History component)
- `/analyzer` - Session Analysis (Analyzer component)
- `/settings` - User Settings (Settings component)

#### AppContext.jsx - Global State Management
**Purpose:** Centralized state and API orchestration

**State Management:**
- Current user and user list
- Test configuration (mode, time/word count)
- Backend availability status
- Automatic backend health monitoring

**Key Functions:**
```javascript
- createUser(username)          // Create new user profile
- switchUser(userId)             // Switch active user
- updateUserSettings(settings)   // Update user preferences
- saveSession(sessionData)       // Persist typing session
- getSession(sessionId)          // Retrieve session data
- getUserSessions()              // Get all user sessions
- checkBackendHealth()           // Health check endpoint
```

**Backend Fallback Logic:**
1. Attempts operation with backend API
2. On failure, falls back to localStorage
3. Logs appropriate messages for debugging
4. Periodic health checks for reconnection

#### TypingTest.jsx - Main Typing Interface
**Purpose:** Core typing test with real-time feedback

**Key Features:**

1. **Text Generation:**
   - Generates random text from word source (default 1000 common words)
   - Supports custom word lists via localStorage
   - Configurable word count based on test mode

2. **Visual Feedback System:**
   - Character states: pending, active, correct, incorrect, corrected
   - Color-coded display (gold for correct, red for incorrect, orange for corrected)
   - Kinetic text rendering with active character centered
   - GPU-accelerated transforms for smooth scrolling

3. **Event Tracking:**
   - Records keydown and keyup events with timestamps
   - Tracks dwell time (key press duration)
   - Captures expected vs actual characters
   - Stores complete event history for analysis

4. **Performance Metrics:**
   - Real-time character count
   - Accuracy calculation (correct chars / total chars)
   - Mechanical CPM (all keystrokes including corrections)
   - Productive CPM (forward progress only)

5. **Test Modes:**
   - **Time Mode:** 15s, 30s, 60s, 120s options
   - **Word Count Mode:** 10, 25, 50, 100 words options
   - Automatic session end when limit reached

6. **Audio Feedback:**
   - Optional sound effects (configurable in settings)
   - Correct keystroke: 800Hz sine wave (50ms)
   - Error keystroke: 200Hz square wave (80ms)
   - Linear gain ramps to avoid audio glitches

7. **State Management:**
   - Uses refs for high-frequency updates (avoid re-renders)
   - Force update only when visual changes needed
   - Optimized centering with requestAnimationFrame batching

8. **Character State Tracking:**
```javascript
{
  char: "expected character",
  userBuffer: "what user typed",
  status: "pending|correct|incorrect|corrected"
}
```

#### Analyzer.jsx - Session Analysis
**Purpose:** Comprehensive typing performance analysis

**Analysis Capabilities:**

1. **Basic Statistics:**
   - Net WPM (productive characters / 5 / minutes)
   - Raw WPM (all keystrokes / 5 / minutes)
   - Productive CPM (forward progress)
   - Mechanical CPM (all keystrokes)
   - Accuracy percentage
   - Session duration (excluding trailing time)
   - Total keystroke count
   - First-time error count

2. **Dwell Time Analysis:**
   - Per-key dwell time (keydown to keyup duration)
   - Per-finger average dwell time
   - Identifies slow-pressing keys/fingers
   - Heatmap visualization

3. **Flight Time Analysis:**
   - Per-key flight time (previous keyup to current keydown)
   - Per-finger average flight time
   - Identifies slow-transitioning keys/fingers
   - Heatmap visualization

4. **V2 Analytics - Digraph Latency:**
   - Character pair transition times
   - Same-finger vs different-finger comparisons
   - Slowest digraphs identification
   - Finger change patterns (e.g., "Left Index → Right Middle")
   - Color-coded same-finger indicators (red highlight)

5. **V2 Analytics - Error Confusion Matrix:**
   - Maps expected characters to actual typed characters
   - Counts error frequency for each confusion pair
   - Identifies systematic typing errors
   - Helps diagnose muscle memory issues

6. **V2 Analytics - Rhythm Visualization:**
   - Keydown-to-keydown intervals over time
   - Seismograph-style chart showing consistency
   - Identifies flow states, hesitation, and fatigue patterns
   - Only includes correct keystrokes for clean analysis

7. **V2 Analytics - Shift Penalty:**
   - Compares uppercase vs lowercase typing speed
   - Calculates average interval for each category
   - Shows percentage slowdown for capitalization
   - Measures biomechanical cost of shift key usage

8. **WPM Over Time:**
   - 1-second bucketing of typing speed
   - 2-second simple moving average smoothing
   - Error markers (red dots on chart)
   - Backspace markers (orange dots on chart)
   - SVG-based responsive chart

**Data Format Support:**
- Backward compatible with old and new session formats
- Graceful handling of missing fields
- Null-safe calculations throughout

#### History.jsx - Session History
**Purpose:** Display and navigate past typing sessions

**Features:**
- Chronological list of all user sessions
- Session metadata display:
  - Timestamp (formatted locale string)
  - Test mode and parameters
  - WPM and accuracy
  - Session duration
- WPM trend sparkline (last 10 sessions)
- Click to open detailed analysis
- Refresh button for manual reload
- Empty state when no sessions exist

#### Settings.jsx - User Customization
**Purpose:** User preferences and configuration

**Settings Categories:**

1. **Visual Customization:**
   - **Font Family:** Dropdown of available monospaced fonts
     - Auto-detected using canvas measurement
     - Fallback list of common fonts
   - **Font Size:** Small (S), Medium (M), Large (L) buttons
   - **Sound Enabled:** Toggle for audio feedback

2. **Custom Word Source:**
   - **File Upload:** JSON array of words
   - **Paste Text:** Space-separated words
   - Stored in localStorage as `typr_custom_words`
   - Validation for array format

**Font Detection Algorithm:**
1. Check for Font Access API support
2. If available, enumerate system fonts
3. Filter for monospaced fonts using canvas width measurement
4. Measure 'i', 'm', 'w' widths - must be equal (within tolerance)
5. Fallback to predefined list if API unavailable

#### ConfigBar.jsx - Test Configuration
**Purpose:** Quick test mode switching

**Interface:**
- Mode toggle: Time Mode ↔ Word Count Mode
- Time options: 15s, 30s, 60s, 120s
- Word count options: 10, 25, 50, 100 words
- Active selection highlighting
- Updates AppContext test configuration

#### UserProfile.jsx - User Management
**Purpose:** User profile switching and creation

**Features:**
- Dropdown showing all available users
- Current user display with username
- "Create New User" option
- Modal/prompt for username input
- Syncs with backend when available
- Falls back to localStorage

#### Visualization Components

**KeyboardHeatmap.jsx:**
- Displays QWERTY keyboard layout
- Color-coded keys based on data values
- Gradient from green (low/fast) to red (high/slow)
- Supports dwell time, flight time, or any key-based metric
- Tooltips showing exact values

**HandHeatmap.jsx:**
- Displays 10 fingers (5 per hand)
- Finger codes: LP, LR, LM, LI, LT (left), RT, RI, RM, RR, RP (right)
- Color-coded based on metric values
- Shows finger names and values
- Visual representation of hand loading

### Utility Modules

#### soundUtils.js - Audio Feedback
**Functions:**
```javascript
playCorrectSound()      // 800Hz sine, 50ms duration
playErrorSound()        // 200Hz square, 80ms duration
resumeAudioContext()    // Resume suspended audio context
```

**Implementation Details:**
- Singleton AudioContext pattern
- Linear gain ramps (avoid exponential at value 0)
- State checks before playing (ctx.state !== 'running')
- Browser autoplay policy compliance

#### fontDetection.js - Font Detection
**Functions:**
```javascript
getAvailableMonospacedFonts()  // Returns Promise<Array<{value, label}>>
isFontAvailableCanvas(name)    // Canvas-based detection
isMonospacedFont(name)         // Width measurement check
```

**Detection Methods:**
1. Primary: Font Access API (`window.queryLocalFonts`)
2. Fallback: Canvas measurement technique
3. Cache results to prevent re-detection on re-renders

#### apiService.js - Backend Communication
**API Methods:**

**Users:**
```javascript
getUsers()                    // GET /api/users
getUser(userId)               // GET /api/users/:userId
createUser(username)          // POST /api/users
deleteUser(userId)            // DELETE /api/users/:userId
```

**Settings:**
```javascript
getSettings(userId)           // GET /api/settings/:userId
updateSettings(userId, data)  // PUT /api/settings/:userId
```

**Sessions:**
```javascript
getUserSessions(userId, limit, offset)  // GET /api/sessions/user/:userId
getSession(sessionId)                   // GET /api/sessions/:sessionId
createSession(sessionData)              // POST /api/sessions
deleteSession(sessionId)                // DELETE /api/sessions/:sessionId
```

**Health:**
```javascript
checkHealth()                 // GET /health
```

**Error Handling:**
- Returns boolean false for health check failures
- Throws errors for API failures (caught by AppContext)
- Automatic fallback to localStorage in AppContext

### Data Files

#### fingermap.json
Maps keyboard keys to finger codes for biomechanical analysis:
```json
{
  "LP": ["Left Pinky keys"],
  "LR": ["Left Ring keys"],
  "LM": ["Left Middle keys"],
  "LI": ["Left Index keys"],
  "LT": ["Left Thumb - Space"],
  "RT": ["Right Thumb - Space"],
  "RI": ["Right Index keys"],
  "RM": ["Right Middle keys"],
  "RR": ["Right Ring keys"],
  "RP": ["Right Pinky keys"]
}
```

#### words.json
Array of 1000 most common English words for text generation.
Format: `["the", "be", "to", "of", "and", ...]`

---

## Backend Application

### Application Structure

```
backend/
├── src/
│   ├── index.js              # Express server entry point
│   ├── database.js           # SQLite setup and schema
│   └── routes/
│       ├── users.js          # User management endpoints
│       ├── settings.js       # Settings management endpoints
│       └── sessions.js       # Session management endpoints
│
├── data/                     # SQLite database files (gitignored)
│   └── typr.db              # Main database
│
├── .env.example             # Environment variable template
└── package.json             # Dependencies and scripts
```

### Server Configuration

**index.js - Express Server:**

**Middleware Stack:**
1. CORS - Allow frontend origin (configurable via env)
2. JSON body parser (10MB limit for large session data)
3. Rate limiting on API routes
4. Error handling middleware

**Rate Limiting Configuration:**
- Window: 15 minutes
- General limit: 100 requests
- Write operations: 50 requests (stricter)
- Response headers: `RateLimit-*` standard headers

**Security Features:**
- CORS restricted to specific origin
- Request size limits
- Foreign key constraints in database
- Input validation in routes
- Error message sanitization

### Database Layer

**database.js - SQLite Setup:**

**Database Location:** `backend/data/typr.db`

**Configuration:**
- Foreign keys enabled (`PRAGMA foreign_keys = ON`)
- Synchronous operations (better-sqlite3)
- Automatic directory creation
- Database initialization on module load

**Schema:**

**Users Table:**
```sql
CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
)
```

**User Settings Table:**
```sql
CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY,
  font TEXT NOT NULL DEFAULT 'Courier New',
  font_size TEXT NOT NULL DEFAULT 'M',
  theme TEXT NOT NULL DEFAULT 'dark',
  sound_enabled INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
)
```

**Sessions Table:**
```sql
CREATE TABLE sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  mode TEXT NOT NULL,                -- 'time' or 'words'
  mode_value INTEGER NOT NULL,        -- time limit or word count
  text TEXT NOT NULL,                 -- original text displayed
  user_input TEXT NOT NULL,           -- what user typed
  events TEXT NOT NULL,               -- JSON array of keystroke events
  session_duration INTEGER NOT NULL,  -- milliseconds
  accuracy REAL NOT NULL,             -- percentage
  max_index_reached INTEGER,          -- furthest position reached
  mechanical_cpm REAL,                -- all keystrokes CPM
  productive_cpm REAL,                -- forward progress CPM
  char_states TEXT,                   -- JSON array of character states
  timestamp TEXT NOT NULL,            -- ISO timestamp
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
)
```

**Indexes:**
```sql
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_timestamp ON sessions(timestamp);
```

**Default Data:**
- Guest user created on initialization
- Default settings for guest user

### API Routes

#### Users Routes (routes/users.js)

**GET /api/users**
- Returns all users
- Response: Array of user objects
```json
[{
  "user_id": "string",
  "username": "string",
  "created_at": "integer"
}]
```

**GET /api/users/:userId**
- Returns specific user
- 404 if not found
- Response: User object

**POST /api/users**
- Creates new user
- Body: `{ "username": "string" }`
- Generates user_id: `user_${timestamp}`
- Creates default settings automatically
- 409 if username exists
- Response: Created user object (201)

**DELETE /api/users/:userId**
- Deletes user (cascade deletes settings and sessions)
- 403 for guest user deletion attempt
- 404 if user not found
- Response: 204 No Content

#### Settings Routes (routes/settings.js)

**GET /api/settings/:userId**
- Returns user settings
- Creates default settings if none exist
- Response: Settings object
```json
{
  "font": "string",
  "fontSize": "S|M|L",
  "theme": "dark|light",
  "soundEnabled": boolean
}
```

**PUT /api/settings/:userId**
- Updates user settings (partial updates supported)
- Creates settings if none exist
- Body: Settings object (any subset)
- Response: Updated settings object

#### Sessions Routes (routes/sessions.js)

**GET /api/sessions/user/:userId**
- Returns all sessions for user
- Query params: `limit` (optional), `offset` (optional)
- Ordered by timestamp DESC (newest first)
- Parses JSON fields (events, charStates)
- Filters out parsing errors
- Response: Array of session objects

**GET /api/sessions/:sessionId**
- Returns specific session
- Parses JSON fields
- 404 if not found
- Response: Session object
```json
{
  "sessionId": "string",
  "userId": "string",
  "mode": "time|words",
  "modeValue": "number",
  "text": "string",
  "userInput": "string",
  "events": [],
  "sessionDuration": "number",
  "accuracy": "number",
  "maxIndexReached": "number",
  "mechanicalCPM": "number",
  "productiveCPM": "number",
  "charStates": [],
  "timestamp": "ISO string"
}
```

**POST /api/sessions**
- Creates new session
- Body: Complete session data object
- Stringifies JSON arrays (events, charStates)
- Response: Created session object (201)

**DELETE /api/sessions/:sessionId**
- Deletes session
- 404 if not found
- Response: 204 No Content

### Environment Configuration

**.env Variables:**
```
PORT=3001                                    # Backend server port
FRONTEND_URL=http://localhost:5173          # CORS allowed origin
```

---

## Data Models and Formats

### Session Data Format

**Complete Session Object:**
```json
{
  "sessionId": "session_1702345678901",
  "userId": "user_1702345678900",
  "mode": "time",
  "modeValue": 60,
  "text": "complete word sequence displayed...",
  "userInput": "what user actually typed...",
  "charStates": [
    {
      "char": "t",
      "userBuffer": "t",
      "status": "correct"
    },
    {
      "char": "h",
      "userBuffer": "g",
      "status": "incorrect"
    },
    {
      "char": "e",
      "userBuffer": "e",
      "status": "corrected"
    }
  ],
  "events": [
    {
      "type": "keydown",
      "key": "t",
      "code": "KeyT",
      "timestamp": 1702345678901,
      "relativeTime": 0,
      "currentIndex": 0,
      "expectedChar": "t"
    },
    {
      "type": "keyup",
      "key": "t",
      "code": "KeyT",
      "timestamp": 1702345678950,
      "relativeTime": 49,
      "currentIndex": 0,
      "expectedChar": "t"
    }
  ],
  "sessionDuration": 60000,
  "mechanicalCPM": 425.5,
  "productiveCPM": 380.2,
  "accuracy": 95.5,
  "totalKeystrokes": 450,
  "maxIndexReached": 400,
  "firstTimeErrors": [25, 67, 103],
  "timestamp": "2023-12-12T10:30:45.901Z"
}
```

**Field Descriptions:**

- `sessionId`: Unique session identifier
- `userId`: Owner user identifier
- `mode`: Test mode ("time" or "words")
- `modeValue`: Time limit (seconds) or word count
- `text`: Original text displayed to user
- `userInput`: Actual characters typed (forward progress only)
- `charStates`: Per-character state tracking
  - `char`: Expected character
  - `userBuffer`: What user actually typed at this position
  - `status`: "pending"|"correct"|"incorrect"|"corrected"
- `events`: Complete keystroke event history
  - `type`: "keydown" or "keyup"
  - `key`: Character/key name
  - `code`: Physical key code
  - `timestamp`: Absolute timestamp (milliseconds since epoch)
  - `relativeTime`: Milliseconds from session start
  - `currentIndex`: Cursor position in text
  - `expectedChar`: Character that should be typed
- `sessionDuration`: Total time in milliseconds (last keystroke - first keystroke)
- `mechanicalCPM`: Characters per minute including all keystrokes (errors, corrections)
- `productiveCPM`: Characters per minute for forward progress only
- `accuracy`: Percentage of characters typed correctly on first attempt
- `totalKeystrokes`: Total key presses including backspace
- `maxIndexReached`: Furthest position reached in text
- `firstTimeErrors`: Array of indices where first-time errors occurred
- `timestamp`: ISO 8601 timestamp of session completion

### User Data Format

**User Object:**
```json
{
  "userId": "user_1702345678900",
  "username": "JohnDoe",
  "settings": {
    "font": "JetBrains Mono",
    "fontSize": "M",
    "theme": "dark",
    "soundEnabled": true
  },
  "sessions": ["session_id1", "session_id2"]
}
```

### localStorage Keys

**Key Structure:**
- `typr_users`: Array of all user objects
- `typr_current_user`: Current user ID string
- `typr_session_{sessionId}`: Individual session data
- `typr_custom_words`: Custom word list array

---

## Features and Functionality

### User Profiles and Authentication

**Multi-User Support:**
- Create multiple user profiles
- Switch between users via dropdown
- Each user has independent settings and session history
- Default "Guest" user always available
- User data persists in database or localStorage

**User Creation Flow:**
1. Click user dropdown
2. Select "Create New User"
3. Enter username in prompt
4. System generates unique user_id
5. Creates default settings
6. Switches to new user automatically

### Test Modes and Configuration

**Time Mode:**
- Fixed duration tests: 15s, 30s, 60s, 120s
- Timer countdown display
- Auto-end when time expires
- Generates sufficient text (200+ words)

**Word Count Mode:**
- Fixed word targets: 10, 25, 50, 100 words
- No timer (type at your own pace)
- Auto-end when word count reached
- Word count ≈ 6 characters average

**Dynamic Configuration:**
- Change mode before starting test
- Configuration persists in AppContext
- Affects text generation and session metadata

### Typing Test Experience

**Visual Feedback System:**

**Character States:**
1. **Pending (50% opacity):** Not yet typed
2. **Active (scale 1.1, white):** Current character to type
3. **Correct (gold #E2B714):** Typed correctly
4. **Incorrect (red):** Typed wrong character
5. **Corrected (orange):** Was wrong, then corrected via backspace

**Kinetic Text Rendering:**
- Active character locked at viewport center (50% left)
- Text scrolls horizontally as you type
- GPU-accelerated transforms (translate3d)
- Smooth animation with requestAnimationFrame
- No manual scrolling required

**Real-Time Metrics Display:**
- Character count (current position)
- Live accuracy percentage
- Timer countdown (time mode)
- Word progress (word count mode)

**Backspace Support:**
- Full correction capability
- Can backtrack arbitrarily
- Maintains complete event history
- Updates character states (incorrect → corrected)

### Session Management

**Session Recording:**
- Automatic capture of all keystrokes
- Millisecond-precision timestamps
- Complete event reconstruction capability
- Character state tracking

**Session Saving:**
1. End session (auto or manual)
2. Build complete session data object
3. Save to backend (or localStorage fallback)
4. Automatic JSON file download
5. Success/error notification display

**Session Retrieval:**
- Load from backend by session ID
- Parse JSON fields (events, charStates)
- Fallback to localStorage if backend unavailable
- Error-tolerant parsing

### Settings and Customization

**Visual Settings:**
- **Font Selection:** Auto-detected monospaced fonts
- **Font Size:** Three size options (S/M/L)
- **Theme:** Dark/light mode (placeholder for future)

**Audio Settings:**
- **Sound Enabled:** Toggle for keystroke feedback
- Distinct sounds for correct vs error keystrokes
- Respects browser autoplay policies

**Custom Word Sources:**
- Upload JSON file with word array
- Paste text and auto-split into words
- Stored in localStorage
- Overrides default 1000-word list

**Settings Persistence:**
- Saved to backend user_settings table
- Fallback to localStorage
- Per-user settings isolation
- Instant application on change

### History and Tracking

**Session History View:**
- Chronological list of all sessions
- Session cards showing:
  - Date and time
  - Test mode and parameters
  - WPM and accuracy
  - Session duration
- Click to analyze in detail
- Refresh button for reload

**Progress Tracking:**
- WPM trend sparkline (last 10 sessions)
- Visual performance trend
- Comparison across sessions

### Export Functionality

**Automatic Download:**
- Every session auto-downloads JSON file
- Filename: `typing-session-{timestamp}.json`
- Contains complete session data
- Suitable for external analysis tools

**Manual Download:**
- Download current session data anytime
- Same format as automatic download

---

## Analytics and Visualization

### Basic Statistics

**Speed Metrics:**
- **Net WPM:** Productive characters / 5 / minutes
- **Raw WPM:** All keystrokes / 5 / minutes
- **Productive CPM:** Forward progress only
- **Mechanical CPM:** All keystrokes including corrections

**Accuracy Metrics:**
- **Accuracy %:** Correct chars / total chars × 100
- **First-Time Errors:** Count of chars wrong on first attempt
- **Total Keystrokes:** All key presses
- **Max Index Reached:** Furthest position in text

**Timing Metrics:**
- **Session Duration:** Last keystroke - first keystroke
- **Excludes trailing time** after last keystroke

### Dwell Time Analysis

**Definition:** Duration of key press (keydown to keyup)

**Per-Key Analysis:**
- Average dwell time for each key
- Identifies keys pressed slowly
- Keyboard heatmap visualization
- Green (fast) to red (slow) gradient

**Per-Finger Analysis:**
- Average dwell time for each finger
- Uses fingermap.json for mapping
- Hand heatmap visualization
- Identifies weak fingers

**Use Cases:**
- Diagnose finger strength issues
- Identify sticky keys or slow presses
- Optimize finger pressure technique

### Flight Time Analysis

**Definition:** Time between keystrokes (previous keyup to current keydown)

**Per-Key Analysis:**
- Average flight time to each key
- Identifies hard-to-reach keys
- Keyboard heatmap visualization

**Per-Finger Analysis:**
- Average flight time to each finger
- Hand heatmap visualization
- Identifies slow finger transitions

**Use Cases:**
- Diagnose finger coordination issues
- Identify problematic key locations
- Optimize hand positioning

### Digraph Latency Analysis (V2)

**Definition:** Character-pair transition times

**Metrics Calculated:**
- Average latency per character pair
- Occurrence count for each digraph
- Source and destination finger identification
- Same-finger vs cross-finger classification

**Visualization:**
- Sorted by slowest transitions
- Top 20 slowest digraphs displayed
- Same-finger pairs highlighted in red
- Finger change pattern shown (e.g., "LI → RP")

**Analysis Insights:**
- **Same-Finger Digraphs:** Anatomical limitation (highlighted)
- **Cross-Finger Digraphs:** Coordination or hand positioning issues
- **High Latency:** Target for focused practice

**Algorithm:**
1. Track consecutive keydown events
2. Calculate time between character pairs
3. Aggregate by unique digraph
4. Calculate average latency
5. Map to finger assignments
6. Sort by slowest first

### Error Confusion Matrix (V2)

**Definition:** Maps expected characters to actual typed characters

**Data Structure:**
```javascript
{
  expected: "e",
  actualChars: [
    { actual: "r", count: 5 },
    { actual: "w", count: 2 }
  ],
  totalErrors: 7
}
```

**Visualization:**
- Sorted by most-confused characters
- Shows all substitution errors
- Helps identify systematic mistakes

**Analysis Insights:**
- **Adjacent Keys:** Finger aim issues
- **Same Finger:** Finger placement problems
- **Consistent Errors:** Muscle memory issues to retrain

**Use Cases:**
- Diagnose systematic typing errors
- Identify muscle memory problems
- Guide targeted practice exercises

### Rhythm Visualization (V2)

**Definition:** Keydown-to-keydown interval progression

**Data Captured:**
- Only correct keystrokes (clean rhythm signal)
- Timestamp relative to session start
- Inter-keystroke interval
- Character typed

**Visualization:**
- Seismograph-style scatter plot
- X-axis: Session time
- Y-axis: Interval (ms)
- Average line overlay

**Pattern Recognition:**
- **Consistent Low Intervals:** Flow state, good rhythm
- **Increasing Intervals:** Fatigue onset
- **Spikes:** Hesitation points (difficult sequences)
- **Clusters:** Repeated pattern intervals

**Analysis Insights:**
- Identify flow state periods
- Detect fatigue patterns
- Find hesitation points
- Measure consistency

### Shift Penalty Analysis (V2)

**Definition:** Speed cost of capitalization

**Metrics Calculated:**
- Average interval for uppercase letters
- Average interval for lowercase letters
- Penalty: avgUppercase - avgLowercase
- Percent slower: (penalty / avgLowercase) × 100

**Visualization:**
- Bar chart comparing uppercase vs lowercase
- Numeric penalty display
- Percentage impact
- Sample counts for each category

**Analysis Insights:**
- **High Penalty:** Shift key usage inefficiency
- **Negative Penalty:** Unusual (might indicate issues)
- **Low Penalty:** Good shift key technique

**Typical Results:**
- 10-30% slower for uppercase is normal
- >40% indicates room for improvement
- <10% indicates excellent shift technique

### WPM Over Time Chart

**Purpose:** Visualize typing speed progression throughout session

**Calculation Method:**
1. **Bucketing:** 1-second time buckets
2. Count characters typed per bucket
3. Convert to instant WPM: (chars / 5) × 60
4. **Smoothing:** 2-second simple moving average
5. Overlay error and backspace markers

**Chart Features:**
- SVG responsive chart (800×350 viewBox)
- Grid lines for readability
- Axis labels (time in seconds, WPM)
- Smoothed line in blue
- Error markers (red dots)
- Backspace markers (orange dots)

**Analysis Insights:**
- **Increasing Trend:** Warming up, gaining confidence
- **Decreasing Trend:** Fatigue, difficulty increase
- **Plateaus:** Consistent typing speed
- **Valleys:** Error clusters or hesitation
- **Error Correlation:** Errors often precede speed drops

### Visualization Components

**Keyboard Heatmap:**
- Full QWERTY layout representation
- Color gradient: green (low) → yellow → red (high)
- Special key handling (Backspace, Enter, Shift, etc.)
- Tooltips with exact values
- Adaptive scaling (min-max normalization)

**Hand Heatmap:**
- 10 finger visualization (5 per hand)
- Left hand: LP, LR, LM, LI, LT
- Right hand: RT, RI, RM, RR, RP
- Color gradient matching keyboard
- Finger names and values displayed

**Chart Components:**
- SVG-based for scalability
- Responsive viewBox
- Grid lines and axes
- Legend and labels
- Interactive tooltips (via title attributes)

---

## User Experience Flow

### First-Time User Journey

1. **Landing Page:** Opens to Typing Test by default
2. **Default User:** Starts as "Guest" user
3. **Quick Start:** Can immediately start typing
4. **Configuration:** Optional - choose test mode before starting
5. **Typing:** Type displayed text with real-time feedback
6. **Completion:** Session auto-ends, downloads JSON, shows save status
7. **Analysis:** Navigate to Analyzer, upload JSON to see stats
8. **History:** View past sessions in History page

### Returning User Journey

1. **Auto-Login:** Last used user loaded from localStorage
2. **Backend Sync:** Sessions sync from database if backend available
3. **Continue Testing:** Previous test configuration preserved
4. **Review History:** Access all past sessions in History
5. **Analyze Progress:** Compare sessions via sparkline

### Typical Session Flow

1. **Configure Test:**
   - Select Time or Word Count mode
   - Choose duration or count
   - Optionally customize settings

2. **Start Typing:**
   - Focus on text area automatically
   - Type displayed words
   - Receive visual/audio feedback
   - See real-time metrics

3. **Handle Errors:**
   - Backspace to correct
   - Character state updates
   - Accuracy recalculates

4. **Complete Session:**
   - Timer expires or word count reached
   - Session data compiles
   - Auto-save to backend/localStorage
   - JSON file downloads automatically
   - Success notification appears

5. **Review Performance:**
   - Navigate to History
   - Click session to analyze
   - Or upload JSON in Analyzer
   - Explore all analytics sections

### Navigation Flow

```
App Root
├── Typing Test (/)
│   └── ConfigBar at top
│       └── Start typing immediately
│
├── History (/history)
│   └── Session list
│       └── Click session → Analyzer with data
│
├── Analyzer (/analyzer)
│   ├── Upload JSON file
│   └── Or auto-load via query param from History
│       └── View all analytics sections
│
└── Settings (/settings)
    ├── Visual customization
    └── Custom word source
```

### Error States and Recovery

**Backend Unavailable:**
- Orange disconnection indicator
- Automatic fallback to localStorage
- Reconnect button in status bar
- Periodic background health checks
- Auto-resume when backend returns

**No Sessions:**
- Empty state message in History
- Prompt to take a typing test

**Invalid JSON Upload:**
- Alert with error message
- Analyzer remains in upload state
- User can try different file

**Parsing Errors:**
- Graceful degradation
- Show available statistics only
- Null checks throughout analytics

---

## Configuration and Customization

### Frontend Configuration

**Vite Configuration (vite.config.js):**
```javascript
{
  plugins: [react()],
  server: {
    port: 5173,  // Configurable dev server port
    proxy: {
      // Optional proxy to backend
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
}
```

**Environment Variables (.env):**
```
VITE_API_URL=http://localhost:3001/api
```

### Backend Configuration

**Environment Variables (.env):**
```
PORT=3001
FRONTEND_URL=http://localhost:5173
```

**Rate Limiting (index.js):**
```javascript
{
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // requests per window
}
```

**CORS Configuration:**
```javascript
{
  origin: process.env.FRONTEND_URL,
  credentials: true
}
```

**JSON Size Limit:**
```javascript
express.json({ limit: '10mb' })
```

### User Customization Options

**Visual Settings:**
- Font family (auto-detected monospaced fonts)
- Font size (S: small, M: medium, L: large)
- Theme (dark/light - extendable)

**Audio Settings:**
- Sound enabled/disabled toggle
- Affects correct and error keystroke sounds

**Test Settings (via ConfigBar):**
- Mode: Time or Word Count
- Time: 15s, 30s, 60s, 120s
- Words: 10, 25, 50, 100

**Word Source:**
- Default: 1000 common English words
- Custom: Upload JSON array
- Custom: Paste space-separated text
- Stored in localStorage

### CSS Customization

**CSS Custom Properties:** Theme-ready structure
```css
:root {
  --primary-color: #E2B714;
  --error-color: #ff0000;
  --correct-color: #E2B714;
  --bg-color: #1a1a1a;
}
```

**Font Size Mapping:**
- S: 1.5rem
- M: 2rem
- L: 2.5rem

**Character States:**
- .pending: 50% opacity
- .active: scale(1.1), white color
- .correct: gold (#E2B714)
- .incorrect: red
- .corrected: orange

### Default Values

**Default User:**
```javascript
{
  userId: 'guest',
  username: 'Guest',
  settings: {
    font: 'Courier New',
    fontSize: 'M',
    theme: 'dark',
    soundEnabled: false
  }
}
```

**Default Test Config:**
```javascript
{
  mode: 'time',
  timeLimit: 60,
  wordCount: 50,
  wordSource: 'common1k'
}
```

---

## Performance Optimizations

### Frontend Optimizations

**React Performance:**

1. **Memoization:**
   - Character component memoized with custom comparison
   - Only re-renders when userChar, status, or isActive changes
   - Prevents thousands of unnecessary re-renders

2. **Ref Usage:**
   - High-frequency state stored in refs (userInput, status, events)
   - Avoids re-render cascade for every keystroke
   - Force update only when visual change needed

3. **RequestAnimationFrame Batching:**
   - Centering updates batched with RAF
   - Prevents layout thrashing
   - Smooth 60fps animations

4. **GPU Acceleration:**
   - Transform: translate3d (triggers GPU compositing)
   - Will-change: transform (optimization hint)
   - Smooth kinetic scrolling

5. **Event Handler Optimization:**
   - Single keydown/keyup handlers
   - Minimal state updates
   - Direct ref manipulation

**Font Detection Caching:**
```javascript
let cachedFonts = null;  // Module-level cache
// Detect once, reuse on re-renders
```

**Lazy Loading:**
- React Router code splitting (potential)
- On-demand JSON loading for sessions

### Backend Optimizations

**Database:**
1. **Indexes:**
   - sessions.user_id (frequent filter)
   - sessions.timestamp (ordering)

2. **Synchronous Queries:**
   - better-sqlite3 for zero latency
   - No async overhead for simple queries

3. **Prepared Statements:**
   - Pre-compiled SQL
   - Reusable across requests
   - Parameter binding

**JSON Handling:**
- Store as TEXT in SQLite
- Parse only on retrieval
- Stringify once on storage

### Algorithm Optimizations

**Digraph Latency:**
- Single pass through events
- O(n) time complexity
- Early filtering for valid characters

**Error Confusion Matrix:**
- Single pass through charStates
- HashMap for O(1) aggregation
- Sort only final results

**WPM Over Time:**
- Bucketing for O(n) processing
- Simple moving average (not exponential)
- Marker arrays for efficient rendering

**Dwell/Flight Time:**
- Map-based tracking for O(1) lookup
- Single pass algorithms
- Aggregate only at end

---

## Deployment and Build

### Development Setup

**Prerequisites:**
- Node.js v20+
- npm v10+

**Installation:**
```bash
# Clone repository
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

**Running Development Servers:**

**Option 1: Using start.sh (recommended)**
```bash
./start.sh
# Installs dependencies if needed
# Starts both backend and frontend
```

**Option 2: Manual**
```bash
# Terminal 1 - Backend
cd backend
npm start
# Runs on http://localhost:3001

# Terminal 2 - Frontend
cd frontend
npm run dev
# Runs on http://localhost:5173
```

### Production Build

**Frontend Build:**
```bash
cd frontend
npm run build
# Outputs to frontend/dist/
# Static files ready for deployment
```

**Backend:**
- No build step required
- Runs directly from source
```bash
cd backend
npm install --production
npm start
```

### Deployment Options

**Option 1: Static Frontend + Backend Server**
1. Build frontend → `frontend/dist/`
2. Serve static files via nginx/Apache/CDN
3. Deploy backend as Node.js process
4. Configure CORS in backend .env
5. Update VITE_API_URL in frontend build

**Option 2: Backend Serves Frontend**
```javascript
// In backend/src/index.js
app.use(express.static(path.join(__dirname, '../../frontend/dist')));
```

**Option 3: Separate Deployments**
- Frontend: Vercel/Netlify/CloudFlare Pages
- Backend: Heroku/Railway/DigitalOcean
- Configure environment variables for each

**Option 4: Docker Containers**
```dockerfile
# Frontend Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Backend Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ ./
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment Configuration

**Frontend (.env.production):**
```
VITE_API_URL=https://api.typr-omicron.com/api
```

**Backend (.env.production):**
```
PORT=3001
FRONTEND_URL=https://typr-omicron.com
NODE_ENV=production
```

### Database Considerations

**SQLite in Production:**
- Single-file database (backend/data/typr.db)
- Ensure write permissions for backend process
- Regular backups recommended
- Consider volume mount in containerized environments

**Migration Path:**
- Easy migration to PostgreSQL/MySQL if needed
- Similar schema structure
- Update database.js connection logic

### Monitoring and Logging

**Backend Logging:**
- Console logs for debugging (stdout)
- Error logs for failures
- Consider Winston/Pino for production

**Frontend Logging:**
- Console logs for development
- Consider error tracking (Sentry) for production

### Performance Considerations

**Frontend:**
- Enable gzip/brotli compression
- Serve with CDN for static assets
- Enable HTTP/2
- Cache headers for built files

**Backend:**
- Reverse proxy (nginx) recommended
- Rate limiting already implemented
- Consider clustering for high traffic
- Database connection pooling (if migrating from SQLite)

### Security Checklist

- [ ] HTTPS in production
- [ ] Environment variables properly configured
- [ ] CORS restricted to frontend domain
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] Database foreign keys enforced
- [ ] No secrets in source code
- [ ] Regular dependency updates

---

## Appendix

### File Size Reference

- **words.json:** 1000 words (common English)
- **fingermap.json:** ~80 lines (10 finger mappings)
- **Session JSON:** Varies (typical: 50-200KB)
  - Depends on session length
  - Events array is largest component

### Browser Compatibility

**Required Features:**
- ES6+ JavaScript
- Fetch API
- localStorage API
- Canvas API
- Web Audio API (optional, for sound)
- Font Access API (optional, for font detection)

**Tested Browsers:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Known Limitations:**
- Font Access API only in Chrome 103+ (degrades gracefully)
- Web Audio autoplay policies vary by browser

### Common Issues and Solutions

**Backend Connection Failures:**
- Check if backend server is running
- Verify FRONTEND_URL in backend .env
- Check CORS configuration
- Application falls back to localStorage automatically

**Audio Not Playing:**
- Click anywhere first (autoplay policy)
- Check soundEnabled setting
- Verify browser supports Web Audio API

**Font Detection Issues:**
- Falls back to common font list
- Canvas-based detection in unsupported browsers
- Always includes 'monospace' fallback

**Session Not Saving:**
- Check browser localStorage not disabled
- Verify backend connection
- Check browser console for errors

### Future Enhancement Possibilities

**Features:**
- Live multiplayer typing races
- Achievement system and badges
- Personalized practice recommendations
- AI-driven weak point detection
- Mobile/touch typing support
- Theme customization beyond dark/light
- Leaderboards and social features
- Practice mode for specific characters/digraphs
- Replay visualization of typing sessions
- Export to external analysis tools (CSV, etc.)

**Technical:**
- Real-time sync (WebSocket)
- Progressive Web App (offline support)
- Service worker caching
- Migration to PostgreSQL for scalability
- GraphQL API alternative
- SSR/SSG with Next.js
- TypeScript migration
- Automated testing suite
- CI/CD pipeline

### Glossary

- **CPM:** Characters Per Minute
- **WPM:** Words Per Minute (CPM / 5)
- **Mechanical CPM:** All keystrokes including corrections
- **Productive CPM:** Forward progress only
- **Dwell Time:** Duration of key press (keydown to keyup)
- **Flight Time:** Time between keystrokes (keyup to next keydown)
- **Digraph:** Character pair (two consecutive characters)
- **Kinetic Text:** Scrolling text with active character centered
- **Char State:** Status of a character (pending/correct/incorrect/corrected)
- **Session:** Single typing test instance with all recorded data

---

## Conclusion

Typr Omicron is a sophisticated typing analysis application that combines real-time feedback with deep analytics. The architecture supports both online and offline modes, making it resilient and user-friendly. The comprehensive analytics engine provides insights that go far beyond simple WPM measurements, helping users understand and improve their typing technique at a biomechanical level.

**Key Strengths:**
1. High-precision data capture (millisecond-level)
2. Comprehensive analytics (10+ metrics)
3. Dual storage architecture (reliability)
4. Modern, responsive UI with smooth animations
5. Extensible and maintainable codebase

**Ideal Use Cases:**
- Personal typing skill improvement
- Typing technique research
- Educational typing programs
- Performance tracking and gamification
- Ergonomic keyboard evaluation

This specification provides a complete blueprint for understanding, maintaining, and extending the Typr Omicron application.
