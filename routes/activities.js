const express = require('express');
const { body, validationResult } = require('express-validator');
const Database = require('../models/Database');

const router = express.Router();
const db = new Database();

// Activities management page
router.get('/', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const activities = await db.getUserActivities(userId);
    
    // Add usage count to each activity
    const activitiesWithCount = await Promise.all(activities.map(async activity => ({
      ...activity,
      usage_count: await db.getActivityUsageCount(activity.id, userId)
    })));
    
    res.render('activities', {
      title: 'Manage Activities',
      activities: activitiesWithCount
    });
  } catch (error) {
    console.error('Activities page error:', error);
    res.render('error', {
      title: 'Error',
      message: 'Failed to load activities'
    });
  }
});

// Create activity
router.post('/', [
  body('name')
    .trim()
    .isLength({ min: 1, max: 30 }).withMessage('Name must be 1-30 characters'),
  body('emoji')
    .trim()
    .isLength({ max: 5 }).withMessage('Emoji must be 5 characters or less'),
  body('color')
    .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid color format'),
  body('is_productive')
    .optional()
    .isBoolean()
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  try {
    const userId = req.session.user.id;
    const { name, emoji, color, is_productive } = req.body;
    
    // Check for duplicate name
    const activities = await db.getUserActivities(userId);
    if (activities.some(a => a.name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Activity with this name already exists'
      });
    }
    
    const result = await db.createActivity(
      userId, 
      name.trim(), 
      emoji || '📝', 
      color, 
      is_productive === '1' || is_productive === true
    );
    
    res.json({
      success: true,
      activity: {
        id: result.lastInsertRowid,
        name: name.trim(),
        emoji: emoji || '📝',
        color,
        is_productive: is_productive === '1' || is_productive === true
      }
    });
  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create activity'
    });
  }
});

// Update activity
router.put('/:id', [
  body('name')
    .trim()
    .isLength({ min: 1, max: 30 }).withMessage('Name must be 1-30 characters'),
  body('emoji')
    .trim()
    .isLength({ max: 5 }).withMessage('Emoji must be 5 characters or less'),
  body('color')
    .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid color format'),
  body('is_productive')
    .optional()
    .isBoolean()
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  try {
    const userId = req.session.user.id;
    const activityId = parseInt(req.params.id);
    const { name, emoji, color, is_productive } = req.body;
    
    // Check if activity exists and belongs to user
    const activity = await db.getActivityById(activityId, userId);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }
    
    // Check for duplicate name (excluding current activity)
    const activities = await db.getUserActivities(userId);
    if (activities.some(a => a.id !== activityId && a.name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Activity with this name already exists'
      });
    }
    
    await db.updateActivity(activityId, userId, {
      name: name.trim(),
      emoji: emoji || '📝',
      color,
      is_productive: is_productive === '1' || is_productive === true
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update activity'
    });
  }
});

// Delete activity
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const activityId = parseInt(req.params.id);
    
    // Check if activity exists
    const activity = await db.getActivityById(activityId, userId);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }
    
    // Don't allow deleting default activities
    if (activity.is_default) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete default activities'
      });
    }
    
    const result = await db.deleteActivity(activityId, userId);
    
    if (result.changes === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete default activity'
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete activity'
    });
  }
});

// Reorder activities
router.post('/reorder', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { order } = req.body;
    
    if (!Array.isArray(order)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order data'
      });
    }
    
    await Promise.all(order.map((activityId, index) => 
      db.updateActivity(activityId, userId, { sort_order: index })
    ));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Reorder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder activities'
    });
  }
});

module.exports = router;
