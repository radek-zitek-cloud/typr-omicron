# AI Coding Agent Quick Reference

> **⚡ Quick reference for AI agents working on Typr Omicron**
> 
> Read this FIRST before making any changes. See [CODEBASE_DOCUMENTATION.md](CODEBASE_DOCUMENTATION.md) for complete details.

## 🚨 Critical Rules - NEVER BREAK THESE

### 1. Event Recording (TypingTest.jsx)
```javascript
// ✅ REQUIRED: Record BOTH keydown and keyup
handleKeyDown = (e) => {
  eventsRef.current.push({
    type: 'keydown',
    key: e.key,
    code: e.code,
    timestamp: Date.now(),
    relativeTime: ...,
    currentIndex,
    expectedChar: ...
  });
  keyDownTimestampsRef.current.set(e.key, Date.now());
};

handleKeyUp = (e) => {
  eventsRef.current.push({
    type: 'keyup',
    key: e.key,
    timestamp: Date.now(),
    ...
  });
};

// ❌ FORBIDDEN: Removing keyup breaks Analyzer dwell time calculations
```

### 2. Session Data Structure
```javascript
// ✅ REQUIRED: All these fields must be present
{
  sessionId,
  userId,
  timestamp,
  mode,
  modeValue,
  text,
  userInput,
  charStates: [{ char, userBuffer, status }, ...],
  events: [{ type, key, timestamp, ... }, ...],
  sessionDuration,
  accuracy,
  mechanicalCPM,
  productiveCPM,
  totalKeystrokes,
  maxIndexReached,
  firstTimeErrors
}

// ❌ FORBIDDEN: Renaming, removing, or changing any field names
```

### 3. Performance Architecture
```javascript
// ✅ REQUIRED: High-frequency data in refs
const eventsRef = useRef([]);
const userInputRef = useRef([]);
const statusRef = useRef([]);

// ✅ REQUIRED: UI-critical data in state
const [currentIndex, setCurrentIndex] = useState(0);
const [sessionActive, setSessionActive] = useState(false);

// ❌ FORBIDDEN: Putting events in state (causes lag)
const [events, setEvents] = useState([]);  // NO!
```

### 4. Session Start Logic
```javascript
// ✅ REQUIRED: Only start on correct first letter
if (!sessionStarted) {
  if (e.key.length === 1 && e.key === text[0]) {
    setSessionStarted(true);
    // Start session
  } else {
    e.preventDefault();
    return;  // Ignore
  }
}

// ❌ FORBIDDEN: Starting on any keystroke
if (!sessionStarted) {
  setSessionStarted(true);  // NO!
}
```

## 📋 Pre-Change Checklist

Before modifying code:
- [ ] Read [CODEBASE_DOCUMENTATION.md](CODEBASE_DOCUMENTATION.md) sections relevant to your changes
- [ ] Understand component dependencies (see flowcharts below)
- [ ] Check if changes affect Analyzer, History, or session export
- [ ] Review performance implications if touching TypingTest

## 🔄 Component Dependencies

```
TypingTest → builds session data
    ↓
AppContext.saveSession() → saves to backend/localStorage
    ↓
History.getUserSessions() → displays list
    ↓
Analyzer.getSession() → analyzes performance
    ↓
Analyzer calculation functions → REQUIRE keydown+keyup events
```

**Critical:** Changes to TypingTest session export MUST maintain compatibility with Analyzer.

## 🎯 Common Tasks

### Adding a New Metric

**✅ Correct approach:**
```javascript
// 1. Add to session export in TypingTest
const buildSessionData = () => {
  return {
    // ... existing fields
    newMetric: calculateNewMetric(),  // Add new field
  };
};

// 2. Backend database migration (if using backend)
// Add column to sessions table

// 3. Update Analyzer to use new field (optional)
const newData = sessionData.newMetric;

// 4. Test:
// - Complete typing test
// - Verify export includes new field
// - Check backend stores it
// - Verify Analyzer can read it
```

**❌ Wrong approach:**
```javascript
// Replacing existing fields
const buildSessionData = () => {
  return {
    // Removed old fields
    onlyNewMetric: ...  // Breaks History and Analyzer!
  };
};
```

### Improving Performance

**✅ Correct approach:**
```javascript
// Move state to refs if not UI-critical
const metricsRef = useRef({ wpm: 0, accuracy: 0 });

// Update without re-render
metricsRef.current.wpm = newWPM;

// Display in UI only when needed
{sessionActive && <span>WPM: {metricsRef.current.wpm}</span>}
```

**❌ Wrong approach:**
```javascript
// Creating state for every metric
const [wpm, setWpm] = useState(0);  // Re-renders on every update
const [cpm, setCpm] = useState(0);  // Re-renders on every update
const [accuracy, setAccuracy] = useState(0);  // Re-renders on every update
```

### Modifying Event Recording

**✅ Correct approach:**
```javascript
// Add new properties to events
eventsRef.current.push({
  type: 'keydown',
  key: e.key,
  timestamp: Date.now(),
  // ... existing properties
  newProperty: calculateNewProperty(),  // Add new
});

// Test Analyzer still works!
```

**❌ Wrong approach:**
```javascript
// Removing existing properties
eventsRef.current.push({
  type: 'keydown',
  key: e.key,
  // Removed timestamp, currentIndex, etc - breaks Analyzer!
});
```

## 🧪 Testing Requirements

### After ANY TypingTest Changes:

1. **Manual Typing Test:**
   ```bash
   npm run dev
   # Type at least 50 words at 60+ WPM
   # End session
   # Verify JSON export downloaded
   ```

2. **Verify Session Structure:**
   ```javascript
   // Check downloaded JSON has all required fields
   {
     sessionId: ✓,
     events: ✓ [{ type: 'keydown', ... }, { type: 'keyup', ... }],
     charStates: ✓,
     // ... all other required fields
   }
   ```

3. **Test Analyzer:**
   ```bash
   # Open History → Click "View Analysis" on session
   # Verify no console errors
   # Verify dwell time chart displays
   # Verify flight time displays
   # Verify error matrix works
   ```

4. **Performance Check:**
   ```bash
   # Chrome DevTools → Performance tab
   # Record while typing at 100+ WPM
   # Verify frame rate stays ~60 FPS
   # Verify scripting time <16ms per keystroke
   ```

### After Backend Changes:

1. **Test CRUD Operations:**
   ```bash
   # Create user
   curl -X POST http://localhost:3001/api/users -H "Content-Type: application/json" -d '{"username":"Test"}'
   
   # Create session
   curl -X POST http://localhost:3001/api/sessions -H "Content-Type: application/json" -d @session.json
   
   # Get sessions
   curl http://localhost:3001/api/sessions/user/guest
   ```

2. **Test Frontend Integration:**
   ```bash
   # Start backend
   # Open frontend - verify 🟢 Backend Connected
   # Create session - verify saves to database
   # Stop backend - verify 🔴 Backend Offline
   # Create session - verify saves to localStorage
   # Restart backend - verify reconnects within 10s
   ```

### After Analyzer Changes:

1. **Use Test Session:**
   ```javascript
   // Create a session with known data
   const testSession = {
     events: [
       { type: 'keydown', key: 't', timestamp: 1000 },
       { type: 'keyup', key: 't', timestamp: 1100 },
       // ... more events
     ],
     // ... other required fields
   };
   ```

2. **Verify Calculations:**
   ```javascript
   // Dwell time should be 100ms for 't'
   const dwellTimes = calculateDwellTimeByKey(testSession.events);
   console.assert(dwellTimes['t'] === 100);
   ```

## 🐛 Debugging Checklist

### "Session not saving"
- [ ] Check backend is running (🟢 indicator)
- [ ] Check console for errors
- [ ] Verify `saveSession()` is being called
- [ ] Check Network tab for API requests
- [ ] Verify session data structure is complete

### "Analyzer showing errors"
- [ ] Verify session has `events` array
- [ ] Check events have both keydown and keyup
- [ ] Verify timestamps are present
- [ ] Check `charStates` array exists
- [ ] Look for specific error in console

### "Typing feels laggy"
- [ ] Check if events are in state (should be refs)
- [ ] Verify Character components are memoized
- [ ] Check Chrome DevTools Performance tab
- [ ] Look for excessive re-renders
- [ ] Verify frame rate is ~60 FPS

### "Users not syncing"
- [ ] Check backend is running
- [ ] Verify health check is enabled
- [ ] Check console for sync logs
- [ ] Test `GET /api/users` manually
- [ ] Clear localStorage and reload

## 📚 Documentation Files

1. **[README.md](README.md)** - User-facing setup and features
2. **[CODEBASE_DOCUMENTATION.md](CODEBASE_DOCUMENTATION.md)** - Complete technical reference (READ THIS)
3. **[IMPLEMENTATION.md](IMPLEMENTATION.md)** - Backend implementation details
4. **[PERFORMANCE_OPTIMIZATIONS.md](PERFORMANCE_OPTIMIZATIONS.md)** - Performance architecture
5. **[TEST_USER_SYNC.md](TEST_USER_SYNC.md)** - User synchronization testing
6. **This file** - Quick reference for AI agents

## 🎓 Learning Path

For comprehensive understanding:

1. Start → [README.md](README.md) - Get overview
2. Then → [CODEBASE_DOCUMENTATION.md](CODEBASE_DOCUMENTATION.md) - Understand architecture
3. Review → Component you're modifying
4. Check → Dependencies in data flow section
5. Read → Critical sections that apply
6. Finally → Make changes and test

## ⚡ Quick Answers

**Q: Can I remove keyup events for performance?**  
A: ❌ NO. Analyzer requires them for dwell time calculations.

**Q: Can I rename session fields?**  
A: ❌ NO. Breaks Analyzer, History, and backend API.

**Q: Can I put events in state?**  
A: ❌ NO. Causes severe performance issues. Use refs.

**Q: Can I change session start behavior?**  
A: ⚠️ Maybe. Must start on correct first letter only.

**Q: Can I add new session fields?**  
A: ✅ YES. Add alongside existing fields, don't replace.

**Q: Can I optimize character rendering?**  
A: ✅ YES. Use memoization and refs, maintain visual accuracy.

**Q: Can I change backend endpoints?**  
A: ⚠️ Maybe. Must update apiService.js and maintain contracts.

**Q: Can I modify Analyzer calculations?**  
A: ✅ YES. Test with known data, maintain event structure.

---

**Remember:** When in doubt, check [CODEBASE_DOCUMENTATION.md](CODEBASE_DOCUMENTATION.md) for details!
