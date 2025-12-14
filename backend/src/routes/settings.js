import express from 'express';
import db from '../database.js';

const router = express.Router();

// Get user settings
router.get('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    const settings = db.prepare(`
      SELECT font, font_size, theme, sound_enabled
      FROM user_settings
      WHERE user_id = ?
    `).get(userId);
    
    if (!settings) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    
    // Convert SQLite integer to boolean for sound_enabled
    const formattedSettings = {
      font: settings.font,
      fontSize: settings.font_size,
      theme: settings.theme,
      soundEnabled: Boolean(settings.sound_enabled)
    };
    
    res.json(formattedSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update user settings
router.put('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { font, fontSize, theme, soundEnabled } = req.body;
    
    // Check if user exists
    const user = db.prepare('SELECT user_id FROM users WHERE user_id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];
    
    if (font !== undefined) {
      updates.push('font = ?');
      values.push(font);
    }
    if (fontSize !== undefined) {
      updates.push('font_size = ?');
      values.push(fontSize);
    }
    if (theme !== undefined) {
      updates.push('theme = ?');
      values.push(theme);
    }
    if (soundEnabled !== undefined) {
      updates.push('sound_enabled = ?');
      values.push(soundEnabled ? 1 : 0);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No settings to update' });
    }
    
    values.push(userId);
    const updateQuery = `UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = ?`;
    
    db.prepare(updateQuery).run(...values);
    
    // Fetch and return updated settings
    const updatedSettings = db.prepare(`
      SELECT font, font_size, theme, sound_enabled
      FROM user_settings
      WHERE user_id = ?
    `).get(userId);
    
    const formattedSettings = {
      font: updatedSettings.font,
      fontSize: updatedSettings.font_size,
      theme: updatedSettings.theme,
      soundEnabled: Boolean(updatedSettings.sound_enabled)
    };
    
    res.json(formattedSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
