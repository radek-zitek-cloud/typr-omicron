import express from 'express';
import db from '../database.js';

const router = express.Router();

// Get all users
router.get('/', (req, res) => {
  try {
    const users = db.prepare('SELECT user_id, username, created_at FROM users').all();
    console.log(`Fetched ${users.length} users from database`);
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get a specific user by ID
router.get('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const user = db.prepare('SELECT user_id, username, created_at FROM users WHERE user_id = ?').get(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create a new user
router.post('/', (req, res) => {
  try {
    const { username } = req.body;
    
    console.log('Received user creation request:', { username });
    
    if (!username) {
      console.error('Username is required but not provided');
      return res.status(400).json({ error: 'Username is required' });
    }
    
    const userId = `user_${Date.now()}`;
    
    console.log('Creating user with ID:', userId);
    
    // Insert user
    const insertUser = db.prepare('INSERT INTO users (user_id, username) VALUES (?, ?)');
    insertUser.run(userId, username);
    
    // Create default settings for the user
    const insertSettings = db.prepare('INSERT INTO user_settings (user_id) VALUES (?)');
    insertSettings.run(userId);
    
    const user = db.prepare('SELECT user_id, username, created_at FROM users WHERE user_id = ?').get(userId);
    
    console.log('User created successfully:', user);
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Delete a user
router.delete('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    // Prevent deletion of guest user
    if (userId === 'guest') {
      return res.status(403).json({ error: 'Cannot delete guest user' });
    }
    
    const deleteUser = db.prepare('DELETE FROM users WHERE user_id = ?');
    const result = deleteUser.run(userId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
