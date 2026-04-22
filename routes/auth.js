const express = require('express');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const Database = require('../models/Database');

const router = express.Router();
const db = new Database();

// Login page
router.get('/login', authMiddleware.requireGuest, (req, res) => {
  res.render('auth/login', { title: 'Login' });
});

// Signup page
router.get('/signup', authMiddleware.requireGuest, (req, res) => {
  res.render('auth/signup', { title: 'Sign Up', errors: {}, formData: {} });
});

// Signup handler
router.post('/signup', [
  body('email')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMap = {};
    errors.array().forEach(err => {
      errorMap[err.path] = err.msg;
    });
    
    return res.render('auth/signup', {
      title: 'Sign Up',
      error: null,
      errors: errorMap,
      formData: req.body
    });
  }

  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.render('auth/signup', {
        title: 'Sign Up',
        error: 'Email already registered',
        errors: {},
        formData: req.body
      });
    }

    // Create user
    const userId = await db.createUser(email, password);
    
    // Create default activities
    await db.createDefaultActivities(userId);
    
    // Set session
    req.session.user = {
      id: userId,
      email: email
    };
    req.session.darkMode = false;

    res.redirect('/tracker');
  } catch (error) {
    console.error('Signup error:', error);
    res.render('auth/signup', {
      title: 'Sign Up',
      error: 'An error occurred. Please try again.',
      errors: {},
      formData: req.body
    });
  }
});

// Login handler
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    req.session.error = 'Please enter valid email and password';
    return res.redirect('/login');
  }

  try {
    const { email, password, remember } = req.body;
    
    const user = await db.getUserByEmail(email);
    
    if (!user || !(await db.verifyPassword(password, user.password_hash))) {
      req.session.error = 'Invalid email or password';
      return res.redirect('/login');
    }

    // Set session
    req.session.user = {
      id: user.id,
      email: user.email
    };
    req.session.darkMode = false;

    // Extend session if remember me is checked
    if (remember) {
      req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30; // 30 days
    }

    res.redirect('/tracker');
  } catch (error) {
    console.error('Login error:', error);
    req.session.error = 'An error occurred. Please try again.';
    res.redirect('/login');
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login');
  });
});

// Toggle dark mode
router.post('/toggle-dark-mode', authMiddleware.requireAuth, (req, res) => {
  req.session.darkMode = !req.session.darkMode;
  res.json({ darkMode: req.session.darkMode });
});

// Get current dark mode status
router.get('/dark-mode-status', authMiddleware.requireAuth, (req, res) => {
  res.json({ darkMode: req.session.darkMode || false });
});

module.exports = router;
