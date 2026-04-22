const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'tracker.db');

let db = null;

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
      createTables().then(() => resolve()).catch(reject);
    });
  });
}

function createTables() {
  return new Promise((resolve, reject) => {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS time_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        hour INTEGER NOT NULL,
        activity TEXT DEFAULT 'none',
        note TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date, hour)
      )
    `;
    
    db.run(createTableSQL, (err) => {
      if (err) {
        console.error('Error creating table:', err);
        reject(err);
        return;
      }
      console.log('Time entries table ready');
      resolve();
    });
  });
}

function getEntriesForDate(date) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT hour, activity, note FROM time_entries WHERE date = ? ORDER BY hour';
    db.all(sql, [date], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      // Create a map with all 24 hours initialized to default
      const entries = {};
      for (let i = 0; i < 24; i++) {
        entries[i] = { activity: 'none', note: '' };
      }
      // Fill in existing entries
      rows.forEach(row => {
        entries[row.hour] = { 
          activity: row.activity || 'none', 
          note: row.note || '' 
        };
      });
      resolve(entries);
    });
  });
}

function saveEntry(date, hour, activity, note) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO time_entries (date, hour, activity, note, updated_at) 
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(date, hour) DO UPDATE SET 
        activity = excluded.activity, 
        note = excluded.note,
        updated_at = excluded.updated_at
    `;
    
    db.run(sql, [date, hour, activity, note || ''], function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ id: this.lastID });
    });
  });
}

function getStatsForDate(date) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT activity, COUNT(*) as count 
      FROM time_entries 
      WHERE date = ? AND activity != 'none'
      GROUP BY activity
    `;
    
    db.all(sql, [date], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      const stats = {
        sleep: 0, work: 0, eat: 0, exercise: 0,
        leisure: 0, learning: 0, social: 0, chores: 0,
        none: 24
      };
      let filled = 0;
      rows.forEach(row => {
        stats[row.activity] = row.count;
        filled += row.count;
      });
      stats.none = 24 - filled;
      resolve(stats);
    });
  });
}

function getWeeklyStats(endDate) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT date, activity, COUNT(*) as count 
      FROM time_entries 
      WHERE date > date(?, '-7 days') AND date <= ? AND activity != 'none'
      GROUP BY date, activity
    `;
    
    db.all(sql, [endDate, endDate], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log('Database connection closed');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  initializeDatabase,
  getEntriesForDate,
  saveEntry,
  getStatsForDate,
  getWeeklyStats,
  closeDatabase
};
