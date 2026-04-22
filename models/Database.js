const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const DB_PATH = path.join(__dirname, '..', 'data', 'tracker_v2.db');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.initialized = false;
    this.initPromise = null;
  }

  async ensureInitialized() {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this.initialize();
    return this.initPromise;
  }

  initialize() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }
      
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          console.error('Database initialization error:', err);
          reject(err);
          return;
        }
        console.log('Connected to SQLite database');
        this.createTables().then(() => {
          this.initialized = true;
          resolve(this.db);
        }).catch(reject);
      });
    });
  }

  createTables() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Users table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) reject(err);
        });

        // Activities table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            emoji TEXT DEFAULT '📝',
            color TEXT DEFAULT '#6B7280',
            is_default BOOLEAN DEFAULT 0,
            is_productive BOOLEAN DEFAULT 0,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, name)
          )
        `, (err) => {
          if (err) reject(err);
        });

        // Time entries table (v3 - minute precision with AM/PM)
        this.db.run(`
          CREATE TABLE IF NOT EXISTS time_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            activity_id INTEGER,
            entry_date DATE NOT NULL,
            start_time INTEGER NOT NULL CHECK (start_time >= 0 AND start_time < 1440),
            end_time INTEGER NOT NULL CHECK (end_time > 0 AND end_time <= 1440),
            note TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE SET NULL,
            CHECK (end_time > start_time)
          )
        `, (err) => {
          if (err) reject(err);
        });

        // Templates table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            data TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) reject(err);
        });

        // Indexes
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_entries_user_date ON time_entries(user_id, entry_date)`, (err) => {
          if (err) reject(err);
        });
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_entries_activity ON time_entries(activity_id)`, (err) => {
          if (err) reject(err);
        });
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id)`, (err) => {
          if (err) reject(err);
        });

        // Final callback
        this.db.run('SELECT 1', (err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Database tables ready');
            resolve();
          }
        });
      });
    });
  }

  // User methods
  async createUser(email, password) {
    await this.ensureInitialized();
    const hashedPassword = await bcrypt.hash(password, 10);
    
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(
        'INSERT INTO users (email, password_hash) VALUES (?, ?)'
      );
      stmt.run(email, hashedPassword, function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.lastID);
      });
      stmt.finalize();
    });
  }

  async getUserByEmail(email) {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row);
      });
    });
  }

  async getUserById(id) {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT id, email, created_at FROM users WHERE id = ?', 
        [id], 
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row);
        }
      );
    });
  }

  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  // Default activities
  async createDefaultActivities(userId) {
    await this.ensureInitialized();
    const defaultActivities = [
      { name: 'Sleep', emoji: '😴', color: '#3B82F6', is_productive: false },
      { name: 'Work', emoji: '💼', color: '#10B981', is_productive: true },
      { name: 'Eat', emoji: '🍽️', color: '#F59E0B', is_productive: false },
      { name: 'Exercise', emoji: '💪', color: '#EF4444', is_productive: true },
      { name: 'Leisure', emoji: '🎮', color: '#6366F1', is_productive: false },
      { name: 'Learning', emoji: '📚', color: '#06B6D4', is_productive: true },
      { name: 'Social', emoji: '👥', color: '#EC4899', is_productive: false },
      { name: 'Chores', emoji: '🧹', color: '#6B7280', is_productive: false }
    ];

    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(
        'INSERT INTO activities (user_id, name, emoji, color, is_default, is_productive, sort_order) VALUES (?, ?, ?, ?, 1, ?, ?)'
      );

      let completed = 0;
      defaultActivities.forEach((activity, index) => {
        stmt.run(userId, activity.name, activity.emoji, activity.color, activity.is_productive ? 1 : 0, index, (err) => {
          if (err) {
            reject(err);
            return;
          }
          completed++;
          if (completed === defaultActivities.length) {
            resolve();
          }
        });
      });

      stmt.finalize();
    });
  }

  // Activity methods
  async getUserActivities(userId) {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM activities WHERE user_id = ? ORDER BY sort_order, created_at',
        [userId],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows);
        }
      );
    });
  }

  async getActivityById(id, userId) {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM activities WHERE id = ? AND user_id = ?',
        [id, userId],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row);
        }
      );
    });
  }

  async createActivity(userId, name, emoji, color, isProductive = false) {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT MAX(sort_order) as max_order FROM activities WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          
          const sortOrder = (row?.max_order || 0) + 1;
          
          const stmt = this.db.prepare(
            'INSERT INTO activities (user_id, name, emoji, color, is_productive, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
          );
          
          stmt.run(userId, name, emoji, color, isProductive ? 1 : 0, sortOrder, function(err) {
            if (err) {
              reject(err);
              return;
            }
            resolve({ lastInsertRowid: this.lastID });
          });
          
          stmt.finalize();
        }
      );
    });
  }

  async updateActivity(id, userId, updates) {
    await this.ensureInitialized();
    const fields = [];
    const values = [];
    
    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.emoji !== undefined) {
      fields.push('emoji = ?');
      values.push(updates.emoji);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }
    if (updates.is_productive !== undefined) {
      fields.push('is_productive = ?');
      values.push(updates.is_productive ? 1 : 0);
    }
    if (updates.sort_order !== undefined) {
      fields.push('sort_order = ?');
      values.push(updates.sort_order);
    }
    
    values.push(id, userId);
    
    return new Promise((resolve, reject) => {
      const sql = `UPDATE activities SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
      this.db.run(sql, values, function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ changes: this.changes });
      });
    });
  }

  async deleteActivity(id, userId) {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // First update entries to NULL
        this.db.run(
          'UPDATE time_entries SET activity_id = NULL WHERE activity_id = ? AND user_id = ?',
          [id, userId],
          (err) => {
            if (err) {
              reject(err);
              return;
            }
            
            // Then delete the activity
            this.db.run(
              'DELETE FROM activities WHERE id = ? AND user_id = ? AND is_default = 0',
              [id, userId],
              function(err) {
                if (err) {
                  reject(err);
                  return;
                }
                resolve({ changes: this.changes });
              }
            );
          }
        );
      });
    });
  }

  async getActivityUsageCount(activityId, userId) {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT COUNT(*) as count FROM time_entries WHERE activity_id = ? AND user_id = ?',
        [activityId, userId],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row.count);
        }
      );
    });
  }

  // Time entry methods (v3 - minute precision)
  async getEntriesForDate(userId, date) {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT te.*, a.name as activity_name, a.emoji, a.color 
        FROM time_entries te
        LEFT JOIN activities a ON te.activity_id = a.id
        WHERE te.user_id = ? AND te.entry_date = ?
        ORDER BY te.start_time
      `;
      
      this.db.all(sql, [userId, date], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  async createEntry(userId, date, activityId, startTime, endTime, note) {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      // Check for overlapping entries first
      this.db.get(`
        SELECT * FROM time_entries 
        WHERE user_id = ? AND entry_date = ? 
        AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?))
        LIMIT 1
      `, [userId, date, endTime, startTime, endTime, startTime], (err, existing) => {
        if (err) {
          reject(err);
          return;
        }
        if (existing) {
          reject(new Error('Time range overlaps with existing entry'));
          return;
        }

        const sql = `
          INSERT INTO time_entries (user_id, entry_date, activity_id, start_time, end_time, note, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        
        this.db.run(sql, [userId, date, activityId, startTime, endTime, note || ''], function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve({ lastID: this.lastID });
        });
      });
    });
  }

  async updateEntry(entryId, userId, updates) {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      if (updates.activity_id !== undefined) {
        fields.push('activity_id = ?');
        values.push(updates.activity_id);
      }
      if (updates.start_time !== undefined) {
        fields.push('start_time = ?');
        values.push(updates.start_time);
      }
      if (updates.end_time !== undefined) {
        fields.push('end_time = ?');
        values.push(updates.end_time);
      }
      if (updates.note !== undefined) {
        fields.push('note = ?');
        values.push(updates.note);
      }
      
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(entryId, userId);
      
      const sql = `UPDATE time_entries SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
      
      this.db.run(sql, values, function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ changes: this.changes });
      });
    });
  }

  async deleteEntry(entryId, userId) {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM time_entries WHERE id = ? AND user_id = ?',
        [entryId, userId],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve({ changes: this.changes });
        }
      );
    });
  }

  async copyEntries(fromDate, toDate, userId) {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM time_entries WHERE user_id = ? AND entry_date = ?',
        [userId, fromDate],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          
          let completed = 0;
          if (rows.length === 0) {
            resolve();
            return;
          }
          
          rows.forEach(row => {
            const sql = `
              INSERT INTO time_entries (user_id, entry_date, activity_id, start_time, end_time, note, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `;
            this.db.run(sql, [userId, toDate, row.activity_id, row.start_time, row.end_time, row.note], (err) => {
              if (err) {
                // Ignore overlap errors, just continue
              }
              completed++;
              if (completed === rows.length) resolve();
            });
          });
        }
      );
    });
  }

  // Statistics methods (v3 - using minutes)
  async getStatsForDate(userId, date) {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT a.name, a.color, 
          ROUND(SUM(te.end_time - te.start_time) / 60.0, 1) as hours
        FROM time_entries te
        JOIN activities a ON te.activity_id = a.id
        WHERE te.user_id = ? AND te.entry_date = ?
        GROUP BY a.id
      `;
      
      this.db.all(sql, [userId, date], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  async getWeeklyStats(userId, endDate) {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT te.entry_date, a.name, a.is_productive, 
          ROUND(SUM(te.end_time - te.start_time) / 60.0, 1) as hours
        FROM time_entries te
        JOIN activities a ON te.activity_id = a.id
        WHERE te.user_id = ? AND te.entry_date >= date(?, '-6 days') AND te.entry_date <= ?
        GROUP BY te.entry_date, a.id
        ORDER BY te.entry_date
      `;
      
      this.db.all(sql, [userId, endDate, endDate], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  async getActivityStats(userId, days = 30) {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT a.name, a.color, a.is_productive, 
          ROUND(SUM(te.end_time - te.start_time) / 60.0, 1) as total_hours
        FROM time_entries te
        JOIN activities a ON te.activity_id = a.id
        WHERE te.user_id = ? AND te.entry_date >= date('now', ?)
        GROUP BY a.id
        ORDER BY total_hours DESC
      `;
      
      this.db.all(sql, [userId, `-${days} days`], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  async getHourlyHeatmap(userId, days = 30) {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      // Generate series of hours 0-23 and join with entries that cover each hour (using minutes)
      const sql = `
        WITH RECURSIVE hours(hour) AS (
          SELECT 0 UNION ALL SELECT hour + 1 FROM hours WHERE hour < 23
        )
        SELECT hours.hour, COUNT(te.id) as activity_count
        FROM hours
        LEFT JOIN time_entries te ON te.user_id = ? 
          AND te.entry_date >= date('now', ?)
          AND te.activity_id IS NOT NULL
          AND hours.hour * 60 >= te.start_time AND hours.hour * 60 < te.end_time
        GROUP BY hours.hour
        ORDER BY hours.hour
      `;
      
      this.db.all(sql, [userId, `-${days} days`], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  async getProductivityScore(userId, date) {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          ROUND(SUM(CASE WHEN a.is_productive = 1 THEN (te.end_time - te.start_time) ELSE 0 END) / 60.0, 1) as productive_hours,
          ROUND(SUM(te.end_time - te.start_time) / 60.0, 1) as total_logged_hours
        FROM time_entries te
        JOIN activities a ON te.activity_id = a.id
        WHERE te.user_id = ? AND te.entry_date = ?
      `;
      
      this.db.get(sql, [userId, date], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row);
      });
    });
  }

  // Template methods
  async getTemplates(userId) {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM templates WHERE user_id = ?',
        [userId],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows);
        }
      );
    });
  }

  async saveTemplate(userId, name, data) {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(
        'INSERT INTO templates (user_id, name, data) VALUES (?, ?, ?)'
      );
      
      stmt.run(userId, name, JSON.stringify(data), function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ lastInsertRowid: this.lastID });
      });
      
      stmt.finalize();
    });
  }

  async deleteTemplate(id, userId) {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM templates WHERE id = ? AND user_id = ?',
        [id, userId],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve({ changes: this.changes });
        }
      );
    });
  }

  close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          } else {
            console.log('Database connection closed');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = DatabaseManager;
