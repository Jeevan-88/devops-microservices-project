const express = require('express');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

const pool = new Pool({
    host: process.env.DB_HOST || 'postgres',
    port: 5432,
    database: process.env.DB_NAME || 'leadgen',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
});

// Email transporter
const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER || 'your-email@gmail.com',
        pass: process.env.SMTP_PASS || 'your-app-password'
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'email-service' });
});

// Send single email
app.post('/api/email/send', async (req, res) => {
    try {
        const { to, subject, html, text } = req.body;

        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"LeadGen Pro" <noreply@leadgenpro.com>',
            to,
            subject,
            text,
            html
        });

        await pool.query(
            'INSERT INTO email_logs (recipient, subject, status, message_id) VALUES ($1, $2, $3, $4)',
            [to, subject, 'sent', info.messageId]
        );

        res.json({ message: 'Email sent successfully', messageId: info.messageId });
    } catch (error) {
        console.error('Send email error:', error);
        await pool.query(
            'INSERT INTO email_logs (recipient, subject, status, error) VALUES ($1, $2, $3, $4)',
            [req.body.to, req.body.subject, 'failed', error.message]
        );
        res.status(500).json({ error: 'Failed to send email' });
    }
});

// Create email campaign
app.post('/api/email/campaign', async (req, res) => {
    try {
        const { name, subject, html_template, recipients } = req.body;

        const result = await pool.query(
            'INSERT INTO campaigns (name, subject, html_template, total_recipients, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, subject, html_template, recipients.length, 'pending']
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create campaign error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get campaigns
app.get('/api/email/campaigns', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM campaigns ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Get campaigns error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get email stats
app.get('/api/email/stats', async (req, res) => {
    try {
        const total = await pool.query('SELECT COUNT(*) FROM email_logs');
        const sent = await pool.query("SELECT COUNT(*) FROM email_logs WHERE status = 'sent'");
        const failed = await pool.query("SELECT COUNT(*) FROM email_logs WHERE status = 'failed'");

        res.json({
            total: parseInt(total.rows[0].count),
            sent: parseInt(sent.rows[0].count),
            failed: parseInt(failed.rows[0].count),
            success_rate: total.rows[0].count > 0
                ? ((parseInt(sent.rows[0].count) / parseInt(total.rows[0].count)) * 100).toFixed(2)
                : 0
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

async function initializeDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS email_logs (
                id SERIAL PRIMARY KEY,
                recipient VARCHAR(255),
                subject VARCHAR(500),
                status VARCHAR(50),
                message_id VARCHAR(255),
                error TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS campaigns (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                subject VARCHAR(500),
                html_template TEXT,
                total_recipients INTEGER DEFAULT 0,
                sent_count INTEGER DEFAULT 0,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Email service database initialized');
    } catch (error) {
        console.error('Database initialization error:', error);
    }
}

app.listen(PORT, async () => {
    await initializeDatabase();
    console.log(`Email service running on port ${PORT}`);
});

module.exports = app;
