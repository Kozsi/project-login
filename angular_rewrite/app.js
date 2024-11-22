// Import necessary modules
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise'); // Ensure promise-based version is used
const bcrypt = require('bcryptjs');
const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json()); // Parse JSON requests
require('dotenv').config();

// Session configuration
app.use(
    session({
        secret: 'your-secret-key', // Change this to a more secure secret
        resave: false,
        saveUninitialized: true,
    })
);

// MySQL database connection
let db;

// Initialize the database connection asynchronously
async function initializeDbConnection() {
    try {
        db = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });
        console.log('Connected to database.');
    } catch (err) {
        console.error('Database connection failed: ' + err.stack);
        process.exit(1); // Exit if the connection fails
    }
}

// Call the function to initialize the DB
initializeDbConnection();

// API Routes

// API: Fetch user's profile
app.get('/api/profile', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const username = req.session.user.username;

    try {
        const [results] = await db.query('SELECT * FROM user_profiles WHERE username = ?', [username]);

        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).json({ error: 'Profile not found' });
        }
    } catch (err) {
        console.error('Error fetching profile:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// API: Update user's profile
app.put('/api/profile', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { first_name, last_name, pet_name, birth_date, phone_number } = req.body;
    const username = req.session.user.username;

    try {
        await db.query(
            `UPDATE user_profiles SET first_name = ?, last_name = ?, pet_name = ?, birth_date = ?, phone_number = ? WHERE username = ?`,
            [first_name, last_name, pet_name, birth_date, phone_number, username]
        );

        res.status(200).json({ message: 'Profile updated successfully' });
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// API: Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const [results] = await db.query('SELECT * FROM users WHERE username = ?', [username]);

        if (results.length > 0) {
            const user = results[0];
            const match = await bcrypt.compare(password, user.password);

            if (match) {
                req.session.user = user;
                return res.status(200).json({ message: 'Login successful', user });
            } else {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
        } else {
            return res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// API: Register
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (username, password) VALUES (?, ?)', [
            username,
            hashedPassword,
        ]);
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// API: Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.status(200).json({ message: 'Logout successful' });
    });
});

// API: Fetch all calendar events for a specific month
app.get('/api/registrations', async (req, res) => {
    const { month } = req.query;

    if (!month) {
        return res.status(400).json({ error: 'Month query parameter is required' });
    }

    try {
        const startDate = new Date(month);
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

        const [registrations] = await db.query(
            `SELECT * FROM day_registrations WHERE registration_date BETWEEN ? AND ?`,
            [startDate, endDate]
        );

        res.json(registrations);
    } catch (err) {
        console.error('Error fetching registrations:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// API: Register a new calendar event
app.post('/api/register-event', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { pet_name, registration_date } = req.body;
    const user_id = req.session.user.id;

    try {
        const [result] = await db.query(
            'INSERT INTO day_registrations (user_id, pet_name, registration_date) VALUES (?, ?, ?)',
            [user_id, pet_name, registration_date]
        );

        res.status(201).json({ message: 'Event registered successfully', id: result.insertId });
    } catch (err) {
        console.error('Error registering event:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// API: Update an existing calendar event
app.put('/api/update-event/:id', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { pet_name, registration_date } = req.body;
    const user_id = req.session.user.id;

    try {
        const [result] = await db.query(
            'UPDATE day_registrations SET pet_name = ?, registration_date = ? WHERE id = ? AND user_id = ?',
            [pet_name, registration_date, id, user_id]
        );

        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Event updated successfully' });
        } else {
            res.status(404).json({ error: 'Event not found or unauthorized' });
        }
    } catch (err) {
        console.error('Error updating event:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// API: Delete a calendar event
app.delete('/api/delete-event/:id', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const user_id = req.session.user.id;

    try {
        const [result] = await db.query(
            'DELETE FROM day_registrations WHERE id = ? AND user_id = ?',
            [id, user_id]
        );

        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Event deleted successfully' });
        } else {
            res.status(404).json({ error: 'Event not found or unauthorized' });
        }
    } catch (err) {
        console.error('Error deleting event:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
