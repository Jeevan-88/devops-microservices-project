const express = require('express');
const { Pool } = require('pg');
const Redis = require('ioredis');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

const pool = new Pool({
    host: process.env.DB_HOST || 'postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'leadgen',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
});

const redis = new Redis({
    host: process.env.REDIS_HOST || 'redis',
    port: process.env.REDIS_PORT || 6379
});

// Lead scoring algorithm
function calculateLeadScore(lead) {
    let score = 0;

    if (lead.email && lead.email.includes('.com')) score += 20;
    if (lead.phone) score += 15;
    if (lead.company) score += 25;
    if (lead.job_title) score += 20;
    if (lead.website) score += 10;
    if (lead.notes && lead.notes.length > 50) score += 10;

    return Math.min(score, 100);
}

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'lead-service' });
});

// Create lead
app.post('/api/leads', async (req, res) => {
    try {
        const { name, email, phone, company, job_title, website, source, notes, user_id } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        const score = calculateLeadScore(req.body);

        const result = await pool.query(
            `INSERT INTO leads (name, email, phone, company, job_title, website, source, notes, score, status, user_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [name, email, phone, company, job_title, website, source, notes, score, 'new', user_id || 1]
        );

        // Invalidate cache
        await redis.del('leads:all');

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create lead error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all leads with pagination
app.get('/api/leads', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const status = req.query.status;
        const source = req.query.source;

        let query = 'SELECT * FROM leads WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (status) {
            query += ` AND status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        if (source) {
            query += ` AND source = $${paramCount}`;
            params.push(source);
            paramCount++;
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        const countResult = await pool.query('SELECT COUNT(*) FROM leads');
        const total = parseInt(countResult.rows[0].count);

        res.json({
            leads: result.rows,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get leads error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single lead
app.get('/api/leads/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const cacheKey = `lead:${id}`;
        const cached = await redis.get(cacheKey);

        if (cached) {
            return res.json(JSON.parse(cached));
        }

        const result = await pool.query('SELECT * FROM leads WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        await redis.set(cacheKey, JSON.stringify(result.rows[0]), 'EX', 3600);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get lead error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update lead
app.put('/api/leads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, company, job_title, website, source, notes, status } = req.body;

        const score = calculateLeadScore(req.body);

        const result = await pool.query(
            `UPDATE leads SET name = $1, email = $2, phone = $3, company = $4, job_title = $5,
             website = $6, source = $7, notes = $8, score = $9, status = $10, updated_at = CURRENT_TIMESTAMP
             WHERE id = $11 RETURNING *`,
            [name, email, phone, company, job_title, website, source, notes, score, status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        await redis.del(`lead:${id}`);
        await redis.del('leads:all');

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update lead error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete lead
app.delete('/api/leads/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query('DELETE FROM leads WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        await redis.del(`lead:${id}`);
        await redis.del('leads:all');

        res.json({ message: 'Lead deleted successfully' });
    } catch (error) {
        console.error('Delete lead error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Recalculate lead score
app.post('/api/leads/:id/score', async (req, res) => {
    try {
        const { id } = req.params;

        const leadResult = await pool.query('SELECT * FROM leads WHERE id = $1', [id]);

        if (leadResult.rows.length === 0) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        const score = calculateLeadScore(leadResult.rows[0]);

        const result = await pool.query(
            'UPDATE leads SET score = $1 WHERE id = $2 RETURNING *',
            [score, id]
        );

        await redis.del(`lead:${id}`);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Recalculate score error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get leads analytics
app.get('/api/leads/stats/overview', async (req, res) => {
    try {
        const total = await pool.query('SELECT COUNT(*) FROM leads');
        const newLeads = await pool.query("SELECT COUNT(*) FROM leads WHERE status = 'new'");
        const contacted = await pool.query("SELECT COUNT(*) FROM leads WHERE status = 'contacted'");
        const qualified = await pool.query("SELECT COUNT(*) FROM leads WHERE status = 'qualified'");
        const converted = await pool.query("SELECT COUNT(*) FROM leads WHERE status = 'converted'");

        res.json({
            total: parseInt(total.rows[0].count),
            new: parseInt(newLeads.rows[0].count),
            contacted: parseInt(contacted.rows[0].count),
            qualified: parseInt(qualified.rows[0].count),
            converted: parseInt(converted.rows[0].count),
            conversion_rate: total.rows[0].count > 0
                ? ((parseInt(converted.rows[0].count) / parseInt(total.rows[0].count)) * 100).toFixed(2)
                : 0
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Initialize database
async function initializeDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS leads (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                company VARCHAR(255),
                job_title VARCHAR(255),
                website VARCHAR(255),
                source VARCHAR(100),
                notes TEXT,
                score INTEGER DEFAULT 0,
                status VARCHAR(50) DEFAULT 'new',
                user_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Lead service database initialized');
    } catch (error) {
        console.error('Database initialization error:', error);
    }
}

app.listen(PORT, async () => {
    await initializeDatabase();
    console.log(`Lead service running on port ${PORT}`);
});

module.exports = app;
