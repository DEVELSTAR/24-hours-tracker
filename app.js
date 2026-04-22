require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const methodOverride = require('method-override');

const Database = require('./models/Database');
const authMiddleware = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const trackerRoutes = require('./routes/tracker');
const activityRoutes = require('./routes/activities');
const statsRoutes = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
let db;

async function initializeApp() {
  db = new Database();
  await db.initialize();
}

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  store: new SQLiteStore({
    dir: './data',
    db: 'sessions.db'
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: true,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if using HTTPS
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));

// Make user data and flash messages available to all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.darkMode = req.session.darkMode || false;
  
  // Make flash messages available and clear them
  res.locals.error = req.session.error || null;
  res.locals.success = req.session.success || null;
  delete req.session.error;
  delete req.session.success;
  
  next();
});

// Routes
app.use('/', authRoutes);
app.use('/tracker', authMiddleware.requireAuth, trackerRoutes);
app.use('/activities', authMiddleware.requireAuth, activityRoutes);
app.use('/api/stats', authMiddleware.requireAuth, statsRoutes);

// Home route - redirect to tracker or login
app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/tracker');
  } else {
    res.redirect('/login');
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).render('error', {
    title: 'Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Not Found',
    message: 'Page not found'
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  if (db) await db.close();
  process.exit(0);
});

// Start server
initializeApp().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize app:', err);
  process.exit(1);
});

module.exports = app;
