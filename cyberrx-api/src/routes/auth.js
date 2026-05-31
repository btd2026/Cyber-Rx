'use strict';

/**
 * Authentication Routes
 * Task: T-304, T-305
 *
 * Provides JWT-based authentication for the CyberRx API
 * - POST /api/auth/login - Rate-limited login with JWT issuance
 * - POST /api/auth/signup - Org-scoped user creation
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../utils/db');
const { authLoginLimiter, authSignupLimiter } = require('../middleware/rateLimit');

/**
 * POST /api/auth/login
 * Authenticate user and issue JWT token
 * Rate-limited to 5 attempts per IP per minute (Redis-backed)
 */
router.post('/login', authLoginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const users = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = users[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password (in production, use bcrypt.compare)
    // For demo purposes with plain text passwords:
    const passwordMatch = user.password === password ||
                           (await bcrypt.compare(password, user.password || ''));

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get organization details
    const orgs = await query('SELECT * FROM orgs WHERE id = $1', [user.org_id]);
    const org = orgs[0];

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        orgId: user.org_id,
        role: user.role
      },
      process.env.JWT_SECRET || 'cyberrx-dev-secret',
      {
        expiresIn: '8h',
        issuer: 'cyberrx-api',
        audience: 'cyberrx-frontend'
      }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        orgId: user.org_id
      },
      organization: org ? {
        id: org.id,
        name: org.name,
        type: org.type
      } : null
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/signup
 * Create a new user scoped to an organization
 * No cross-org signup allowed - must have valid org_id
 * Rate-limited to 3 attempts per IP per minute (Redis-backed)
 */
router.post('/signup', authSignupLimiter, async (req, res) => {
  try {
    const { email, password, role, orgId, name } = req.body;

    if (!email || !password || !orgId) {
      return res.status(400).json({ error: 'Email, password, and orgId are required' });
    }

    // Verify organization exists
    const orgs = await query('SELECT id FROM orgs WHERE id = $1', [orgId]);
    if (orgs.length === 0) {
      return res.status(400).json({ error: 'Invalid organization ID' });
    }

    // Check if user already exists
    const existingUsers = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = `user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    await query(`
      INSERT INTO users (id, email, password, role, org_id, name)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, email, hashedPassword, role || 'viewer', orgId, name || '']);

    // Generate JWT token
    const token = jwt.sign(
      {
        userId,
        email,
        orgId,
        role: role || 'viewer'
      },
      process.env.JWT_SECRET || 'cyberrx-dev-secret',
      {
        expiresIn: '8h',
        issuer: 'cyberrx-api',
        audience: 'cyberrx-frontend'
      }
    );

    res.status(201).json({
      token,
      user: {
        id: userId,
        email,
        role: role || 'viewer',
        orgId
      }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current user info from JWT token
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cyberrx-dev-secret');

    // Get full user info
    const users = await query('SELECT id, email, role, org_id, name FROM users WHERE id = $1', [decoded.userId]);
    const user = users[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Auth verification error:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
