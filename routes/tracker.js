const express = require('express');
const Database = require('../models/Database');

const router = express.Router();
const db = new Database();

// Main tracker page
router.get('/', async (req, res) => {
  try {
    const userId = req.session.user.id;
    let date = req.query.date;
    
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      date = new Date().toISOString().split('T')[0];
    }

    // Get user activities
    const activities = await db.getUserActivities(userId);
    
    // Get entries for the date (now as array of time ranges)
    const entries = await db.getEntriesForDate(userId, date);
    
    // Get templates
    const templates = await db.getTemplates(userId);
    
    // Calculate date navigation
    const currentDate = new Date(date);
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    const today = new Date().toISOString().split('T')[0];

    // Get stats
    const stats = await db.getStatsForDate(userId, date);
    const productivity = await db.getProductivityScore(userId, date);
    
    const totalLogged = productivity?.total_logged_hours || 0;
    const productiveHours = productivity?.productive_hours || 0;
    const productivityPercentage = totalLogged > 0 
      ? Math.round((productiveHours / totalLogged) * 100) 
      : 0;
    
    // Calculate unallocated time (in minutes, convert to hours)
    const allocatedMinutes = entries.reduce((sum, e) => sum + (e.end_time - e.start_time), 0);
    const allocatedHours = Math.round((allocatedMinutes / 60) * 10) / 10;
    const unallocatedHours = Math.round((24 - allocatedHours) * 10) / 10;

    // Helper functions for time formatting
    const formatTime = (minutes) => {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 || 12;
      const displayM = m.toString().padStart(2, '0');
      return displayM === '00' ? `${displayH} ${ampm}` : `${displayH}:${displayM} ${ampm}`;
    };
    
    const formatDuration = (minutes) => {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      if (h === 0) return `${m}m`;
      if (m === 0) return `${h}h`;
      return `${h}h ${m}m`;
    };

    res.render('tracker', {
      title: 'Time Tracker',
      date,
      entries,
      activities,
      templates,
      stats,
      productivityPercentage,
      totalLogged,
      allocatedHours,
      unallocatedHours,
      prevDate: prevDate.toISOString().split('T')[0],
      nextDate: nextDate.toISOString().split('T')[0],
      today,
      isToday: date === today,
      formatTime,
      formatDuration
    });
  } catch (error) {
    console.error('Tracker error:', error);
    res.render('error', {
      title: 'Error',
      message: 'Failed to load tracker data'
    });
  }
});

// Create time entry
router.post('/api/entry', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { date, activity_id, start_time, end_time, note } = req.body;
    
    // Validate inputs
    if (!date || start_time === undefined || end_time === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    const start = parseInt(start_time);
    const end = parseInt(end_time);
    
    if (start < 0 || start >= 1440 || end <= 0 || end > 1440 || end <= start) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid time range. Times must be in minutes (0-1439) and end must be after start.' 
      });
    }

    // Create entry
    await db.createEntry(userId, date, activity_id || null, start, end, note || '');
    
    // Get updated stats
    const entries = await db.getEntriesForDate(userId, date);
    const stats = await db.getStatsForDate(userId, date);
    const productivity = await db.getProductivityScore(userId, date);
    
    const totalLogged = productivity?.total_logged_hours || 0;
    const productiveHours = productivity?.productive_hours || 0;
    const productivityPercentage = totalLogged > 0 
      ? Math.round((productiveHours / totalLogged) * 100) 
      : 0;
    
    const allocatedMinutes = entries.reduce((sum, e) => sum + (e.end_time - e.start_time), 0);
    const allocatedHours = Math.round((allocatedMinutes / 60) * 10) / 10;

    res.json({
      success: true,
      entries,
      stats,
      productivityPercentage,
      totalLogged,
      allocatedHours,
      unallocatedHours: Math.round((24 - allocatedHours) * 10) / 10
    });
  } catch (error) {
    console.error('Create entry error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create entry' 
    });
  }
});

// Update time entry
router.put('/api/entry/:id', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const entryId = parseInt(req.params.id);
    const { activity_id, start_time, end_time, note } = req.body;
    
    const updates = {};
    if (activity_id !== undefined) updates.activity_id = activity_id;
    if (start_time !== undefined) updates.start_time = parseInt(start_time);
    if (end_time !== undefined) updates.end_time = parseInt(end_time);
    if (note !== undefined) updates.note = note;

    await db.updateEntry(entryId, userId, updates);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update entry error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to update entry' 
    });
  }
});

// Delete time entry
router.delete('/api/entry/:id', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const entryId = parseInt(req.params.id);
    
    await db.deleteEntry(entryId, userId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete entry error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete entry' 
    });
  }
});

// Copy yesterday's entries
router.post('/api/copy-yesterday', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { toDate } = req.body;
    
    const yesterday = new Date(toDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const fromDate = yesterday.toISOString().split('T')[0];
    
    await db.copyEntries(fromDate, toDate, userId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Copy error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to copy entries' 
    });
  }
});

// Apply template
router.post('/api/apply-template', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { templateId, date } = req.body;
    
    // Get template data
    const templates = await db.getTemplates(userId);
    const template = templates.find(t => t.id === parseInt(templateId));
    
    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }
    
    const data = JSON.parse(template.data);
    
    // Apply template entries (now as array of time ranges)
    if (Array.isArray(data)) {
      for (const entry of data) {
        if (entry.activity_id) {
          try {
            await db.createEntry(userId, date, entry.activity_id, entry.start_time, entry.end_time, entry.note || '');
          } catch (err) {
            // Skip overlapping entries
          }
        }
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Template error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to apply template' 
    });
  }
});

// Save current day as template
router.post('/api/save-template', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { name, date } = req.body;
    
    const entries = await db.getEntriesForDate(userId, date);
    
    // Save all entries with activities
    const data = entries.filter(e => e.activity_id);
    
    const result = await db.saveTemplate(userId, name, data);
    
    res.json({ success: true, templateId: result.lastInsertRowid });
  } catch (error) {
    console.error('Save template error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save template' 
    });
  }
});

module.exports = router;
