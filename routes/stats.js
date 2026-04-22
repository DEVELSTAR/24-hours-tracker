const express = require('express');
const Database = require('../models/Database');

const router = express.Router();
const db = new Database();

// Get statistics for a date
router.get('/:date', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const date = req.params.date;
    
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }
    
    const stats = await db.getStatsForDate(userId, date);
    const productivity = await db.getProductivityScore(userId, date);
    
    const totalLogged = productivity?.total_logged_hours || 0;
    const productiveHours = productivity?.productive_hours || 0;
    const productivityPercentage = totalLogged > 0
      ? Math.round((productiveHours / totalLogged) * 100)
      : 0;
    
    res.json({
      success: true,
      stats,
      productivityPercentage,
      totalLogged,
      productiveHours
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics'
    });
  }
});

// Get weekly stats
router.get('/weekly/:endDate', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const endDate = req.params.endDate;
    
    const weeklyStats = await db.getWeeklyStats(userId, endDate);
    
    // Format data for chart
    const dates = [];
    const dateLabels = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dates.push(dateStr);
      dateLabels.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    }
    
    // Get activities for labels
    const activities = await db.getUserActivities(userId);
    const datasets = activities.map(activity => ({
      label: `${activity.emoji} ${activity.name}`,
      data: dates.map(date => {
        const entry = weeklyStats.find(s => s.entry_date === date && s.name === activity.name);
        return entry ? entry.count : 0;
      }),
      backgroundColor: activity.color,
      borderColor: activity.color,
      borderWidth: 1
    }));
    
    res.json({
      success: true,
      labels: dateLabels,
      datasets
    });
  } catch (error) {
    console.error('Weekly stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get weekly statistics'
    });
  }
});

// Get activity statistics
router.get('/activities/summary', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const days = parseInt(req.query.days) || 30;
    
    const activityStats = await db.getActivityStats(userId, days);
    const heatmap = await db.getHourlyHeatmap(userId, days);
    
    // Format heatmap data (24 hours)
    const heatmapData = Array(24).fill(0);
    heatmap.forEach(h => {
      heatmapData[h.hour] = h.activity_count;
    });
    
    res.json({
      success: true,
      activityStats,
      heatmap: heatmapData
    });
  } catch (error) {
    console.error('Activity stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get activity statistics'
    });
  }
});

// Export data
router.get('/export/:format', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const format = req.params.format;
    const days = parseInt(req.query.days) || 30;
    
    // Get entries for the period
    const entries = await new Promise((resolve, reject) => {
      db.db.all(`
        SELECT te.entry_date, te.hour, te.note, a.name as activity_name, a.emoji
        FROM time_entries te
        LEFT JOIN activities a ON te.activity_id = a.id
        WHERE te.user_id = ? AND te.entry_date >= date('now', ?)
        ORDER BY te.entry_date DESC, te.hour
      `, [userId, `-${days} days`], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="tracker-export-${new Date().toISOString().split('T')[0]}.json"`);
      res.json({
        exported_at: new Date().toISOString(),
        entries,
        total_entries: entries.length
      });
    } else if (format === 'csv') {
      const csvHeader = 'Date,Hour,Activity,Emoji,Note\n';
      const csvRows = entries.map(e => {
        return `"${e.entry_date}",${e.hour},"${e.activity_name || 'None'}","${e.emoji || ''}","${(e.note || '').replace(/"/g, '""')}"`;
      }).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="tracker-export-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvHeader + csvRows);
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid format. Use "json" or "csv"'
      });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data'
    });
  }
});

module.exports = router;
