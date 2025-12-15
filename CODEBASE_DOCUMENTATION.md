# Typr Omicron - Complete Codebase Documentation

> **Critical Documentation for Developers and AI Coding Agents**
> 
> This document describes the complete functionality, architecture, and critical dependencies of the Typr Omicron typing test application. **Read this before making any code changes** to avoid breaking functionality.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Critical Data Structures](#critical-data-structures)
3. [Component Reference](#component-reference)
4. [Data Flow & Dependencies](#data-flow--dependencies)
5. [Performance Considerations](#performance-considerations)
6. [API Contracts](#api-contracts)
7. [Testing Requirements](#testing-requirements)
8. [Common Pitfalls](#common-pitfalls)

---

## Architecture Overview

### Technology Stack

**Frontend:**
- React 18.3+ with Vite
- React Router for navigation
- Context API for global state
- CSS with custom properties

**Backend:**
- Node.js 20+
- Express 5.x
- SQLite with better-sqlite3
- CORS enabled for frontend

**Storage:**
- Primary: SQLite database (when backend available)
- Fallback: Browser localStorage
- Automatic switching between storage methods

### Application Structure

```
typr-omicron/
├── frontend/                # React SPA
│   ├── src/
│   │   ├── main.jsx        # App entry point
│   │   ├── App.jsx         # Router & navigation
│   │   ├── AppContext.jsx  # Global state management
│   │   ├── apiService.js   # Backend API client
│   │   ├── TypingTest.jsx  # Core typing test (CRITICAL)
│   │   ├── Analyzer.jsx    # Session analysis (CRITICAL)
│   │   ├── History.jsx     # Session history viewer
│   │   ├── Settings.jsx    # User settings
│   │   ├── UserProfile.jsx # User management
│   │   ├── ConfigBar.jsx   # Test configuration
│   │   ├── KeyboardHeatmap.jsx  # Visual analytics
│   │   ├── HandHeatmap.jsx      # Hand usage visualization
│   │   ├── soundUtils.js   # Audio feedback
│   │   ├── fontDetection.js     # Font availability
│   │   ├── fingermap.json  # Keyboard-to-finger mapping
│   │   └── words.json      # Word lists for tests
├── backend/                 # Express API server
│   ├── src/
│   │   ├── index.js        # Server entry point
│   │   ├── database.js     # SQLite initialization
│   │   └── routes/
│   │       ├── users.js    # User CRUD endpoints
│   │       ├── settings.js # Settings endpoints
│   │       └── sessions.js # Session CRUD endpoints
│   └── data/
│       └── typr.db         # SQLite database (created on first run)
└── start.sh                # Automated startup script
```

---

## Critical Data Structures

### 1. Session Data Format

**CRITICAL:** The session data structure is used by TypingTest, Analyzer, and History components. **DO NOT modify without updating all consumers.**

```javascript
{
  // Identity
  sessionId: "session_1234567890",      // Unique identifier
  userId: "user_1234567890",            // Foreign key to user
  timestamp: "2025-12-14T10:30:00.000Z", // ISO 8601 string
  
  // Test Configuration
  mode: "time" | "words",               // Test type
  modeValue: 60 | 50,                   // Seconds for time mode, word count for words mode
  
  // Test Content
  text: "the quick brown fox...",       // Expected text
  userInput: "the quick brwon fox...",  // User's typed text
  
  // Performance Metrics (NEW FORMAT - preferred)
  sessionDuration: 60000,               // Milliseconds (CRITICAL: from first to last keystroke)
  accuracy: 98.5,                       // Percentage (0-100)
  mechanicalCPM: 350.5,                 // Raw characters per minute
  productiveCPM: 345.2,                 // Effective characters per minute (NEW)
  totalKeystrokes: 350,                 // Total key presses including backspace
  maxIndexReached: 345,                 // Furthest character position reached
  firstTimeErrors: [5, 12, 23],        // Array of error positions (NEW)
  
  // Character States (CRITICAL for Analyzer)
  charStates: [
    {
      char: "t",                        // Expected character
      userBuffer: "t",                  // What user typed (null if not typed)
      status: "correct" | "incorrect" | "corrected" | "pending"
    },
    // ... one entry per character in text
  ],
  
  // Keystroke Events (CRITICAL for Analyzer dwell/flight time)
  events: [
    {
      type: "keydown" | "keyup",        // Event type (BOTH required for analysis)
      key: "t",                         // Key pressed
      code: "KeyT",                     // Physical key code
      timestamp: 1702547400000,         // Absolute Unix timestamp (ms)
      relativeTime: 150,                // Milliseconds since session start
      currentIndex: 0,                  // Cursor position when event occurred
      expectedChar: "t"                 // Character expected at that position
    },
    // ... paired keydown/keyup events for every keystroke
  ]
}
```

**Event Recording Requirements:**
- ✅ **MUST** record both `keydown` AND `keyup` events
- ✅ **MUST** include precise timestamps (millisecond accuracy)
- ✅ **MUST** pair keydown with keyup for same key
- ✅ Used by Analyzer for: dwell time, flight time, rhythm analysis

### 2. User Data Format

```javascript
{
  userId: "user_1234567890" | "guest",  // Unique identifier
  username: "Alice",                    // Display name
  settings: {
    font: "Courier New",                // Font family
    fontSize: "S" | "M" | "L",         // Size preset
    theme: "dark" | "light",           // Color scheme
    soundEnabled: false                 // Audio feedback toggle
  },
  sessions: ["session_123", ...]        // Array of session IDs (frontend only)
}
```

### 3. Test Configuration

```javascript
{
  mode: "time" | "words",               // Test mode
  timeLimit: 60,                        // Seconds (for time mode)
  wordCount: 50,                        // Number of words (for words mode)
  wordSource: "common1k"                // Word list identifier
}
```

---

## Component Reference

### Core Components

#### 1. TypingTest.jsx ⚠️ **CRITICAL - HIGH PERFORMANCE**

**Purpose:** Main typing interface with real-time keystroke capture and visual feedback.

**Key Features:**
- Kinetic tape scrolling (active character centered)
- Real-time character state visualization
- Precise keystroke event recording
- Session start control (must type first letter correctly)
- Performance-optimized rendering

**Critical Implementation Details:**

**✅ DO:**
- Use refs for high-frequency data (events, metrics, character states)
- Only update state for UI-critical values (currentIndex, sessionActive, timeRemaining)
- Record BOTH keydown and keyup events with timestamps
- Use memoized Character components with custom equality check
- Use requestAnimationFrame for DOM measurements

**❌ DON'T:**
- Store events in state (causes re-renders)
- Copy large arrays with spread operator in render path
- Query DOM on every keystroke without RAF batching
- Remove keyup event recording (breaks Analyzer)
- Start session on any keystroke (must be correct first letter)

**Performance Metrics:**
- Supports 150+ WPM typing without lag
- <16ms keystroke response time
- 99% reduction in character re-renders via memoization

**Data Dependencies:**
```javascript
// REQUIRED event structure for Analyzer compatibility
eventsRef.current = [
  { type: 'keydown', key: 't', timestamp: 123, ... },
  { type: 'keyup', key: 't', timestamp: 150, ... },
  // ... paired events
];

// REQUIRED character state tracking
userInputRef.current = ['t', 'h', 'e', ...];  // What user typed
statusRef.current = ['correct', 'incorrect', ...];  // Character statuses
```

#### 2. Analyzer.jsx ⚠️ **CRITICAL - DEPENDS ON EVENT DATA**

**Purpose:** Deep analysis of typing performance using keystroke event data.

**Critical Dependencies:**
- **REQUIRES** both keydown AND keyup events in session data
- **REQUIRES** precise timestamps on all events
- **REQUIRES** charStates array for error analysis

**Analysis Functions:**

```javascript
// Dwell Time: How long key held down
calculateDwellTimeByKey(events) {
  // Matches keydown timestamp to keyup timestamp
  // BREAKS if keyup events missing
  const dwellTime = keyupTimestamp - keydownTimestamp;
}

// Flight Time: Time between keys
calculateFlightTimeByKey(events) {
  // Measures keyup(key1) to keydown(key2)
  // REQUIRES alternating keyup/keydown events
  const flightTime = nextKeydown - prevKeyup;
}

// Digraph Latency: Two-key combination speed
calculateDigraphLatency(events) {
  // Analyzes character pairs for bottlenecks
  // REQUIRES events with currentIndex
}

// Error Confusion Matrix: What typed instead of what
calculateErrorConfusionMatrix(charStates) {
  // REQUIRES charStates with char and userBuffer
}
```

**✅ DO:**
- Maintain event structure exactly as documented
- Include all event properties (type, key, timestamp, currentIndex)
- Test analysis functions after any TypingTest changes

**❌ DON'T:**
- Remove keyup events from recording
- Change event timestamp format
- Modify charStates structure
- Remove any event properties used in calculations

#### 3. AppContext.jsx ⚠️ **CRITICAL - GLOBAL STATE**

**Purpose:** Central state management and backend synchronization.

**Key Responsibilities:**
1. **Backend Health Monitoring**
   - Checks backend every 10 seconds
   - Automatic switch between database and localStorage
   - User notification of connection status

2. **User Management**
   - Load users from backend on connection
   - Sync localStorage with backend
   - Create/switch users with proper backend save

3. **Session Management**
   - Save sessions to backend or localStorage
   - Retrieve session data for History/Analyzer
   - Include all session data properties

**Critical Functions:**

```javascript
// MUST include all session properties
saveSession(sessionData) {
  const sessionWithId = {
    ...sessionData,           // From TypingTest
    sessionId: `session_${Date.now()}`,
    userId: currentUser.userId,
    mode: testConfig.mode,
    modeValue: testConfig.mode === 'time' ? testConfig.timeLimit : testConfig.wordCount
  };
  // Save to backend or localStorage
}

// MUST return complete session data
getUserSessions() {
  // Returns array of session objects with ALL properties
}
```

**✅ DO:**
- Preserve all session data fields when saving
- Log backend connection status changes
- Fallback gracefully to localStorage
- Sync users when backend reconnects

**❌ DON'T:**
- Filter or transform session data
- Remove any data properties during save
- Skip backend health checks
- Fail silently on errors

#### 4. History.jsx

**Purpose:** Display session history with sortable list and WPM trend visualization.

**Data Requirements:**
- Loads sessions via `getUserSessions()`
- Displays: date, mode, WPM, accuracy, mechanical CPM
- Calculates WPM from productiveCPM or fallback to maxIndexReached

**✅ DO:**
- Handle both old and new session formats
- Show loading states during data fetch
- Provide refresh button for manual reload

#### 5. Settings.jsx

**Purpose:** User preference configuration.

**Settings:**
- Font family (Courier New, Consolas, Monaco, etc.)
- Font size (S/M/L)
- Theme (dark/light)
- Sound effects (on/off)

**Persistence:**
- Saves via AppContext `updateUserSettings()`
- Syncs to backend if available
- Falls back to localStorage

#### 6. UserProfile.jsx

**Purpose:** User account management dropdown.

**Features:**
- Switch between users
- Create new users
- User list from AppContext

**Backend Integration:**
- Creates users via `createUser()` which calls API
- Switches users via `switchUser()` which loads from backend

---

## Data Flow & Dependencies

### Session Creation Flow

```
User Types → TypingTest.jsx
├── Records keydown event → eventsRef.current
├── Updates character state → statusRef.current, userInputRef.current  
├── Records keyup event → eventsRef.current
└── On session end:
    ├── buildSessionData() → Complete session object
    ├── saveSession() → AppContext
    │   ├── Backend available? → POST /api/sessions
    │   └── Backend offline? → localStorage.setItem()
    └── downloadSessionFile() → JSON download
```

### Session Analysis Flow

```
User Opens Analyzer → Analyzer.jsx
├── getSession(sessionId) → AppContext
│   ├── Backend available? → GET /api/sessions/:sessionId
│   └── Backend offline? → localStorage.getItem()
├── Receives session data with events array
├── calculateDwellTimeByKey(events)
│   └── Pairs keydown/keyup by key and timestamp
├── calculateFlightTimeByKey(events)
│   └── Measures gaps between keyup → keydown
├── calculateDigraphLatency(events)
│   └── Analyzes two-key combinations
└── Displays heatmaps and statistics
```

### User Synchronization Flow

```
Frontend Loads → AppContext.jsx
├── Check backend health → GET /health
├── Backend available?
│   ├── YES → Sync users from backend
│   │   ├── GET /api/users → Load all users
│   │   ├── GET /api/settings/:userId → Load settings for each
│   │   ├── Replace localStorage users with backend users
│   │   └── Set current user from backend
│   └── NO → Use localStorage users
└── Every 10 seconds → Re-check backend health
    └── On reconnection → Re-sync users from backend
```

---

## Performance Considerations

### TypingTest Performance Architecture

**The Hybrid Approach: Refs for Data, State for UI**

```javascript
// ❌ SLOW: State updates cause re-renders
const [events, setEvents] = useState([]);
setEvents(prev => [...prev, newEvent]);  // Re-renders entire component!

// ✅ FAST: Refs bypass React rendering
const eventsRef = useRef([]);
eventsRef.current.push(newEvent);  // No re-render!
```

**What Goes in State vs Refs:**

| Data Type | Storage | Reason |
|-----------|---------|--------|
| currentIndex | ✅ State | UI needs to update cursor position |
| sessionActive | ✅ State | UI shows different buttons |
| timeRemaining | ✅ State | Timer display updates |
| text | ✅ State | Display value |
| events array | ❌ Ref | No visual impact, updated frequently |
| userInput array | ❌ Ref | Rendered via memoized components |
| charStates array | ❌ Ref | Rendered via memoized components |
| metrics (WPM, etc) | ❌ Ref | Only shown in stats, updated at end |

**Character Rendering Optimization:**

```javascript
// Memoized character component
const Character = memo(({ char, userChar, status, isActive }) => {
  // Render logic
}, (prevProps, nextProps) => {
  // Custom equality check - only re-render if changed
  return prevProps.userChar === nextProps.userChar &&
         prevProps.status === nextProps.status &&
         prevProps.isActive === nextProps.isActive;
});

// Result: Only 1-2 characters re-render per keystroke
// vs 500+ without memoization
```

**DOM Query Optimization:**

```javascript
// ❌ SLOW: Queries DOM on every state change
useEffect(() => {
  const char = document.querySelector('.active');
  // Measure position, causes layout thrashing
}, [currentIndex]);

// ✅ FAST: Batched with browser paint cycle
useEffect(() => {
  requestAnimationFrame(() => {
    const char = textDisplayRef.current.children[currentIndex];
    // Measure position in RAF, no thrashing
  });
}, [currentIndex]);
```

### Performance Metrics Target

- **Keystroke Response:** <16ms (60 FPS)
- **State Updates per Key:** ≤2
- **Character Re-renders:** 1-2 per keystroke
- **Supported WPM:** 150+
- **Memory per 1000 keystrokes:** ~200 KB

---

## API Contracts

### Backend Endpoints

#### Health Check
```
GET /health
Response: { status: "ok", timestamp: "..." }
Purpose: Verify backend availability
```

#### Users
```
GET /api/users
Response: [{ user_id, username, created_at }, ...]

GET /api/users/:userId
Response: { user_id, username, created_at }

POST /api/users
Body: { username: "Alice" }
Response: { user_id, username, created_at }

DELETE /api/users/:userId
Response: 204 No Content
```

#### Settings
```
GET /api/settings/:userId
Response: { font, font_size, theme, sound_enabled }

PUT /api/settings/:userId
Body: { font?: "...", fontSize?: "...", theme?: "...", soundEnabled?: boolean }
Response: { font, font_size, theme, sound_enabled }
```

#### Sessions
```
GET /api/sessions/user/:userId?limit=10&offset=0
Response: [{ sessionId, userId, mode, modeValue, text, userInput, events, ... }, ...]

GET /api/sessions/:sessionId
Response: { sessionId, userId, mode, modeValue, text, userInput, events, ... }

POST /api/sessions
Body: { userId, mode, modeValue, text, userInput, events, sessionDuration, accuracy, ... }
Response: { sessionId, userId, mode, modeValue, text, userInput, events, ... }

DELETE /api/sessions/:sessionId
Response: 204 No Content
```

### API Field Mapping

**Database → Frontend:**
```javascript
{
  session_id → sessionId,
  user_id → userId,
  mode_value → modeValue,
  user_input → userInput,
  session_duration → sessionDuration,
  max_index_reached → maxIndexReached,
  mechanical_cpm → mechanicalCPM,
  productive_cpm → productiveCPM,
  char_states → charStates (JSON parsed),
  events → events (JSON parsed)
}
```

---

## Testing Requirements

### Before Any Code Changes

**1. Backend Changes:**
```bash
# Start backend
cd backend && npm start

# Test health endpoint
curl http://localhost:3001/health

# Test user creation
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"TestUser"}'

# Verify database
sqlite3 backend/data/typr.db "SELECT * FROM users;"
```

**2. Frontend Changes:**
```bash
# Start frontend
cd frontend && npm run dev

# Manual test checklist:
□ Complete typing test → verify session saves
□ Check History → verify sessions appear
□ Open Analyzer → verify analysis works
□ Switch users → verify user sync
□ Stop backend → verify localStorage fallback
□ Restart backend → verify reconnection
```

**3. TypingTest Changes:**
```bash
# Test typing at different speeds
□ Slow typing (30 WPM) → smooth
□ Normal typing (60 WPM) → smooth
□ Fast typing (100+ WPM) → smooth
□ Check Chrome DevTools Performance tab
□ Verify <16ms frame time
□ Verify events array has keydown + keyup pairs
```

**4. Analyzer Changes:**
```bash
# Test with session data
□ Load existing session
□ Verify dwell time calculations
□ Verify flight time calculations
□ Verify error matrix displays
□ Check console for errors
```

### Session Data Validation

**After any TypingTest changes, verify session export:**

```javascript
// Required fields in exported session
{
  sessionId: ✓,
  userId: ✓,
  timestamp: ✓,
  mode: ✓,
  modeValue: ✓,
  text: ✓,
  userInput: ✓,
  events: ✓ [
    { type: 'keydown', timestamp: ..., key: ..., ... },
    { type: 'keyup', timestamp: ..., key: ..., ... },
  ],
  charStates: ✓ [
    { char: ..., userBuffer: ..., status: ... },
  ],
  sessionDuration: ✓,
  accuracy: ✓,
  mechanicalCPM: ✓,
  productiveCPM: ✓,
  totalKeystrokes: ✓,
  maxIndexReached: ✓,
  firstTimeErrors: ✓
}
```

---

## Common Pitfalls

### 1. ⚠️ Removing Event Properties

**Problem:**
```javascript
// ❌ BAD: Removed keyup events to "improve performance"
if (e.key.length === 1) {
  eventsRef.current.push({ type: 'keydown', ... });
  // Missing keyup recording!
}
```

**Impact:** Breaks Analyzer dwell time calculations completely.

**Solution:**
```javascript
// ✅ GOOD: Record both, use refs to avoid re-renders
handleKeyDown = (e) => {
  eventsRef.current.push({ type: 'keydown', timestamp: Date.now(), ... });
  keyDownTimestampsRef.current.set(e.key, Date.now());
};

handleKeyUp = (e) => {
  eventsRef.current.push({ type: 'keyup', timestamp: Date.now(), ... });
  keyDownTimestampsRef.current.delete(e.key);
};
```

### 2. ⚠️ Modifying Session Data Structure

**Problem:**
```javascript
// ❌ BAD: Changed field names for "clarity"
const sessionData = {
  id: sessionId,           // Was: sessionId
  user: userId,            // Was: userId
  typedText: userInput,    // Was: userInput
  // ...
};
```

**Impact:** Breaks Analyzer, History, and backend API.

**Solution:** Never rename fields. Add new fields if needed, keep old ones.

### 3. ⚠️ Using State for High-Frequency Updates

**Problem:**
```javascript
// ❌ BAD: Updating state on every keystroke
const [events, setEvents] = useState([]);
handleKeyDown = (e) => {
  setEvents(prev => [...prev, newEvent]);  // Re-render!
};
```

**Impact:** Severe lag, poor performance, unusable at high WPM.

**Solution:**
```javascript
// ✅ GOOD: Use refs for data, state only for UI
const eventsRef = useRef([]);
handleKeyDown = (e) => {
  eventsRef.current.push(newEvent);  // No re-render
};
```

### 4. ⚠️ Breaking Backend Synchronization

**Problem:**
```javascript
// ❌ BAD: Removed backend health checks
useEffect(() => {
  // checkBackend();  // Commented out
}, []);
```

**Impact:** Frontend never syncs with backend, users/sessions not loaded.

**Solution:** Keep periodic health checks (every 10 seconds).

### 5. ⚠️ Incorrect Session Start Logic

**Problem:**
```javascript
// ❌ BAD: Starts on any keystroke
if (!sessionStarted) {
  setSessionStarted(true);
  // No validation!
}
```

**Impact:** Session starts accidentally, poor user experience.

**Solution:**
```javascript
// ✅ GOOD: Only start on correct first letter
if (!sessionStarted) {
  if (e.key.length === 1 && e.key === text[0]) {
    setSessionStarted(true);
  } else {
    e.preventDefault();
    return;  // Ignore other keys
  }
}
```

### 6. ⚠️ Missing Error Handling

**Problem:**
```javascript
// ❌ BAD: No error handling
const session = await apiService.getSession(id);
// If backend down, crashes
```

**Impact:** Application breaks when backend unavailable.

**Solution:**
```javascript
// ✅ GOOD: Graceful fallback
try {
  const session = await apiService.getSession(id);
  return session;
} catch (error) {
  console.error('Failed to load from backend:', error);
  // Try localStorage
  return localStorage.getItem(`typr_session_${id}`);
}
```

---

## Critical Code Sections - DO NOT MODIFY

### 1. Event Recording in TypingTest.jsx

```javascript
// ⚠️ CRITICAL: Analyzer depends on this exact structure
eventsRef.current.push({
  type: 'keydown',
  key: e.key,
  code: e.code,
  timestamp: Date.now(),
  relativeTime: sessionStartTimeRef.current ? Date.now() - sessionStartTimeRef.current : 0,
  currentIndex,
  expectedChar: currentIndex < text.length ? text[currentIndex] : '',
});

// ⚠️ CRITICAL: Must record keyup for dwell time
eventsRef.current.push({
  type: 'keyup',
  key: e.key,
  code: e.code,
  timestamp: Date.now(),
  relativeTime: timestamp - sessionStartTimeRef.current,
  currentIndex,
  expectedChar: currentIndex < text.length ? text[currentIndex] : '',
});
```

### 2. Session Data Export in TypingTest.jsx

```javascript
// ⚠️ CRITICAL: Analyzer and History depend on this format
const buildSessionData = () => {
  return {
    text,
    userInput: userInputStr,
    charStates: charStatesFromRefs,
    events: eventsRef.current,           // Must include all events
    sessionDuration: duration,
    mechanicalCPM: parseFloat(mechanicalCPM),
    productiveCPM: parseFloat(productiveCPM),
    accuracy: parseFloat(accuracy),
    totalKeystrokes: totalKeystrokesRef.current,
    maxIndexReached: maxIndexReachedRef.current,
    firstTimeErrors: Array.from(firstTimeErrorsRef.current),
    timestamp: new Date().toISOString()
  };
};
```

### 3. Backend User Sync in AppContext.jsx

```javascript
// ⚠️ CRITICAL: Runs on backend reconnection
useEffect(() => {
  const syncUsersFromBackend = async () => {
    if (!useBackend) return;
    
    const backendUsers = await apiService.getUsers();
    const formattedUsers = await Promise.all(
      backendUsers.map(async (backendUser) => {
        const settings = await apiService.getSettings(backendUser.user_id);
        return {
          userId: backendUser.user_id,
          username: backendUser.username,
          settings,
          sessions: []
        };
      })
    );
    
    setUsers(formattedUsers);
    // ... user validation logic
  };
  
  if (useBackend) syncUsersFromBackend();
}, [useBackend]);
```

### 4. Dwell Time Calculation in Analyzer.jsx

```javascript
// ⚠️ CRITICAL: Requires paired keydown/keyup events
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

  // Calculate averages...
};
```

---

## Development Workflow

### Making Changes Safely

1. **Before Coding:**
   - Read this documentation
   - Understand component dependencies
   - Check if change affects critical sections
   - Review data structure requirements

2. **During Development:**
   - Maintain event recording structure
   - Preserve all session data fields
   - Keep backend sync logic intact
   - Use refs for high-frequency data
   - Log changes for debugging

3. **After Changes:**
   - Run full typing test
   - Verify session export structure
   - Test Analyzer with new session
   - Check History displays correctly
   - Test with backend on/off
   - Verify no console errors

4. **Performance Testing:**
   - Type at 100+ WPM
   - Check Chrome DevTools Performance
   - Verify <16ms frame times
   - Ensure no memory leaks
   - Test on slower devices

### Debugging Tips

**Session Data Issues:**
```javascript
// Add temporary logging in TypingTest
const buildSessionData = () => {
  const data = { ... };
  console.log('Session data:', {
    eventCount: data.events.length,
    hasKeyup: data.events.some(e => e.type === 'keyup'),
    hasKeydown: data.events.some(e => e.type === 'keydown'),
    charStatesLength: data.charStates.length,
  });
  return data;
};
```

**Backend Sync Issues:**
```javascript
// Check AppContext sync status
useEffect(() => {
  console.log('Backend status:', {
    useBackend,
    backendReady,
    userCount: users.length,
    currentUser: currentUser?.username
  });
}, [useBackend, backendReady, users, currentUser]);
```

**Performance Issues:**
```javascript
// Measure render time
useEffect(() => {
  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    if (duration > 16) {
      console.warn('Slow render:', duration, 'ms');
    }
  };
});
```

---

## Summary - Critical Rules

### ✅ Always Do:
1. Record both keydown AND keyup events with timestamps
2. Use refs for high-frequency data (events, metrics)
3. Maintain session data structure exactly
4. Test with backend on and off
5. Verify Analyzer works after TypingTest changes
6. Check performance at 100+ WPM
7. Log errors and state changes
8. Keep backend health checks running
9. Preserve backward compatibility

### ❌ Never Do:
1. Remove keyup event recording
2. Change session data field names
3. Use state for event arrays
4. Skip error handling in async operations
5. Disable backend health checks
6. Modify critical code sections without testing
7. Start session on any keystroke
8. Remove timestamps from events
9. Break memoization optimizations
10. Ignore performance implications

---

## Version History

- **v1.0** - Initial implementation with localStorage
- **v2.0** - Added backend, SQLite, user profiles
- **v2.1** - Performance optimizations (ref-based architecture)
- **v2.2** - Backend sync, user management
- **v2.3** - Session start control, event recording restored

---

## Getting Help

When debugging issues:

1. Check console logs for errors
2. Verify backend is running (🟢 indicator)
3. Inspect session data structure
4. Test Analyzer with the session
5. Check browser DevTools Network tab
6. Review this documentation
7. Test with backend off (localStorage mode)

For performance issues:
1. Open Chrome DevTools Performance tab
2. Record while typing
3. Check frame rate (should be 60 FPS)
4. Look for long tasks (>50ms)
5. Check re-render count
6. Verify memoization is working

---

**Last Updated:** December 14, 2025  
**Maintained By:** Typr Omicron Development Team
