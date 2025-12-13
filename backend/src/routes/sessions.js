import express from 'express';
import db from '../database.js';

const router = express.Router();

// Get all sessions for a user
router.get('/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { limit, offset } = req.query;
    
    let query = `
      SELECT session_id, user_id, mode, mode_value, text, user_input, events,
             session_duration, accuracy, max_index_reached, mechanical_cpm,
             productive_cpm, char_states, timestamp, created_at
      FROM sessions
      WHERE user_id = ?
      ORDER BY timestamp DESC
    `;
    
    const params = [userId];
    
    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit, 10));
      
      if (offset) {
        query += ' OFFSET ?';
        params.push(parseInt(offset, 10));
      }
    }
    
    const sessions = db.prepare(query).all(...params);
    
    // Parse JSON fields
    const formattedSessions = sessions.map(session => ({
      sessionId: session.session_id,
      userId: session.user_id,
      mode: session.mode,
      modeValue: session.mode_value,
      text: session.text,
      userInput: session.user_input,
      events: JSON.parse(session.events),
      sessionDuration: session.session_duration,
      accuracy: session.accuracy,
      maxIndexReached: session.max_index_reached,
      mechanicalCPM: session.mechanical_cpm,
      productiveCPM: session.productive_cpm,
      charStates: session.char_states ? JSON.parse(session.char_states) : null,
      timestamp: session.timestamp
    }));
    
    res.json(formattedSessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Get a specific session by ID
router.get('/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = db.prepare(`
      SELECT session_id, user_id, mode, mode_value, text, user_input, events,
             session_duration, accuracy, max_index_reached, mechanical_cpm,
             productive_cpm, char_states, timestamp, created_at
      FROM sessions
      WHERE session_id = ?
    `).get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Parse JSON fields
    const formattedSession = {
      sessionId: session.session_id,
      userId: session.user_id,
      mode: session.mode,
      modeValue: session.mode_value,
      text: session.text,
      userInput: session.user_input,
      events: JSON.parse(session.events),
      sessionDuration: session.session_duration,
      accuracy: session.accuracy,
      maxIndexReached: session.max_index_reached,
      mechanicalCPM: session.mechanical_cpm,
      productiveCPM: session.productive_cpm,
      charStates: session.char_states ? JSON.parse(session.char_states) : null,
      timestamp: session.timestamp
    };
    
    res.json(formattedSession);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// Create a new session
router.post('/', (req, res) => {
  try {
    const {
      userId,
      mode,
      modeValue,
      text,
      userInput,
      events,
      sessionDuration,
      accuracy,
      maxIndexReached,
      mechanicalCPM,
      productiveCPM,
      charStates,
      timestamp
    } = req.body;
    
    // Validate required fields
    if (!userId || !mode || !modeValue || !text || !userInput || !events || 
        sessionDuration === undefined || accuracy === undefined || !timestamp) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if user exists
    const user = db.prepare('SELECT user_id FROM users WHERE user_id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const sessionId = `session_${Date.now()}`;
    
    const insertSession = db.prepare(`
      INSERT INTO sessions (
        session_id, user_id, mode, mode_value, text, user_input, events,
        session_duration, accuracy, max_index_reached, mechanical_cpm,
        productive_cpm, char_states, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertSession.run(
      sessionId,
      userId,
      mode,
      modeValue,
      text,
      userInput,
      JSON.stringify(events),
      sessionDuration,
      accuracy,
      maxIndexReached || null,
      mechanicalCPM || null,
      productiveCPM || null,
      charStates ? JSON.stringify(charStates) : null,
      timestamp
    );
    
    // Fetch and return the created session
    const session = db.prepare(`
      SELECT session_id, user_id, mode, mode_value, text, user_input, events,
             session_duration, accuracy, max_index_reached, mechanical_cpm,
             productive_cpm, char_states, timestamp, created_at
      FROM sessions
      WHERE session_id = ?
    `).get(sessionId);
    
    const formattedSession = {
      sessionId: session.session_id,
      userId: session.user_id,
      mode: session.mode,
      modeValue: session.mode_value,
      text: session.text,
      userInput: session.user_input,
      events: JSON.parse(session.events),
      sessionDuration: session.session_duration,
      accuracy: session.accuracy,
      maxIndexReached: session.max_index_reached,
      mechanicalCPM: session.mechanical_cpm,
      productiveCPM: session.productive_cpm,
      charStates: session.char_states ? JSON.parse(session.char_states) : null,
      timestamp: session.timestamp
    };
    
    res.status(201).json(formattedSession);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Delete a session
router.delete('/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const deleteSession = db.prepare('DELETE FROM sessions WHERE session_id = ?');
    const result = deleteSession.run(sessionId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

export default router;
