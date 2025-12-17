const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const Redis = require('ioredis');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
    host: process.env.DB_HOST || 'postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'leadgen',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
});

// Redis connection
const redis = new Redis({
    host: process.env.REDIS_HOST || 'redis',
    port: process.env.REDIS_PORT || 6379
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';

// Passport configuration
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
    callbackURL: '/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [profile.emails[0].value]
        );

        if (result.rows.length > 0) {
            return done(null, result.rows[0]);
        }

        const newUser = await pool.query(
            'INSERT INTO users (email, name, auth_provider, auth_provider_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [profile.emails[0].value, profile.displayName, 'google', profile.id]
        );

        return done(null, newUser.rows[0]);
    } catch (error) {
        return done(error, null);
    }
}));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID || 'your-facebook-app-id',
    clientSecret: process.env.FACEBOOK_APP_SECRET || 'your-facebook-app-secret',
    callbackURL: '/api/auth/facebook/callback',
    profileFields: ['id', 'emails', 'name']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
            return done(new Error('No email provided'), null);
        }

        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length > 0) {
            return done(null, result.rows[0]);
        }

        const newUser = await pool.query(
            'INSERT INTO users (email, name, auth_provider, auth_provider_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [email, `${profile.name.givenName} ${profile.name.familyName}`, 'facebook', profile.id]
        );

        return done(null, newUser.rows[0]);
    } catch (error) {
        return done(error, null);
    }
}));

// Generate JWT tokens
function generateTokens(user) {
    const accessToken = jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
        { id: user.id },
        JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
}

// Middleware to verify JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// ===== ROUTES =====

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'auth-service' });
});

// Register with email/password
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, password, and name are required' });
        }

        // Check if user exists
        const existingUser = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const result = await pool.query(
            'INSERT INTO users (email, password, name, auth_provider) VALUES ($1, $2, $3, $4) RETURNING id, email, name, created_at',
            [email, hashedPassword, name, 'email']
        );

        const user = result.rows[0];
        const tokens = generateTokens(user);

        // Store refresh token in Redis
        await redis.set(`refresh_token:${user.id}`, tokens.refreshToken, 'EX', 7 * 24 * 60 * 60);

        res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            },
            ...tokens
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login with email/password
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Check if user registered with OAuth
        if (user.auth_provider !== 'email') {
            return res.status(400).json({
                error: `Please login with ${user.auth_provider}`
            });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const tokens = generateTokens(user);

        // Store refresh token in Redis
        await redis.set(`refresh_token:${user.id}`, tokens.refreshToken, 'EX', 7 * 24 * 60 * 60);

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            },
            ...tokens
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Refresh access token
app.post('/api/auth/refresh-token', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token required' });
        }

        jwt.verify(refreshToken, JWT_REFRESH_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(403).json({ error: 'Invalid refresh token' });
            }

            // Check if refresh token exists in Redis
            const storedToken = await redis.get(`refresh_token:${decoded.id}`);

            if (storedToken !== refreshToken) {
                return res.status(403).json({ error: 'Invalid refresh token' });
            }

            // Get user
            const result = await pool.query(
                'SELECT id, email, name FROM users WHERE id = $1',
                [decoded.id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const user = result.rows[0];
            const tokens = generateTokens(user);

            // Update refresh token in Redis
            await redis.set(`refresh_token:${user.id}`, tokens.refreshToken, 'EX', 7 * 24 * 60 * 60);

            res.json(tokens);
        });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logout
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
    try {
        // Remove refresh token from Redis
        await redis.del(`refresh_token:${req.user.id}`);
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, email, name, created_at FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Google OAuth routes
app.get('/api/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

app.get('/api/auth/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login' }),
    (req, res) => {
        const tokens = generateTokens(req.user);
        res.redirect(`/auth-success?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`);
    }
);

// Facebook OAuth routes
app.get('/api/auth/facebook', passport.authenticate('facebook', {
    scope: ['email']
}));

app.get('/api/auth/facebook/callback',
    passport.authenticate('facebook', { session: false, failureRedirect: '/login' }),
    (req, res) => {
        const tokens = generateTokens(req.user);
        res.redirect(`/auth-success?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`);
    }
);

// Initialize database schema
async function initializeDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255),
                name VARCHAR(255) NOT NULL,
                auth_provider VARCHAR(50) DEFAULT 'email',
                auth_provider_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Database initialized');
    } catch (error) {
        console.error('Database initialization error:', error);
    }
}

// Start server
app.listen(PORT, async () => {
    await initializeDatabase();
    console.log(`Auth service running on port ${PORT}`);
});

module.exports = app;
