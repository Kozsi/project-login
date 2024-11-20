// Import necessary modules
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise'); // Ensure promise-based version is used
const bcrypt = require('bcryptjs');
const app = express();
const port = 3000;

// Middleware
app.locals.layout = 'layout'; // This sets the default layout
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve static files
app.set('view engine', 'ejs');
app.use(express.json());


// Session configuration
app.use(session({
    secret: 'your-secret-key', // Change this to a more secure secret
    resave: false,
    saveUninitialized: true,
}));

// MySQL database connection
let db;

// Initialize the database connection asynchronously
async function initializeDbConnection() {
    try {
        db = await mysql.createConnection({
            host: 'localhost',
            user: 'userdb_service',
            password: 'password',  // replace with your MySQL password
            database: 'userdb'
        });
        console.log('Connected to database.');
    } catch (err) {
        console.log('Database connection failed: ' + err.stack);
        process.exit(1); // Exit if the connection fails
    }
}

// Call the function to initialize the DB
initializeDbConnection();

// Moment.js or date-fns can be used for date manipulations if needed
const moment = require('moment');

// Route for displaying the calendar
app.get('/calendar', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login'); // Redirect if not logged in
    }

    const currentUser = req.session.user; // User info stored in session

    // Check if the incoming month query parameter exists
    const monthQuery = req.query.month;

    // Parse the incoming month, or default to current month if not provided
    let monthDate;
    if (monthQuery) {
        monthDate = new Date(monthQuery); // Create a date from the query parameter
    } else {
        monthDate = new Date(); // Default to current date
    }

    // Normalize the monthDate to the first day of the month
    monthDate.setDate(1); // Ensure we are at the first day of the month

    // If this is the initial load and there's no monthQuery, redirect to include current month in the URL
    if (!monthQuery) {
        const currentMonth = monthDate.toISOString().split('T')[0]; // Format the month as YYYY-MM-DD
        return res.redirect(`/calendar?month=${currentMonth}`); // Redirect to the current month URL
    }

    // Calculate previous and next months based on monthDate
    const previousMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 0); // Last day of the previous month
    const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 2, 0); // Last day of the next month

    // Fetch registrations for the selected month
    const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

    try {
        const [registrations] = await db.query(
            'SELECT * FROM day_registrations WHERE registration_date BETWEEN ? AND ?',
            [startOfMonth, endOfMonth]
        );

        // Format the results to be used in the calendar
        const formattedRegistrations = registrations.map(reg => ({
            petName: reg.pet_name,
            registrationDate: new Date(reg.registration_date).toISOString().split('T')[0], // Format date as YYYY-MM-DD
        }));

        // Render the calendar page with registration data
        res.render('calendar', {
            currentUser,
            monthDate,
            previousMonth,
            nextMonth,
            registrations: formattedRegistrations, // Pass the registrations to the calendar view
        });
    } catch (err) {
        console.log("Error fetching registrations:", err);
        return res.status(500).send('Error fetching registrations');
    }
});

// Route for the welcome page
app.get('/', (req, res) => {
    res.render('welcome', { user: req.session.user });
});

// Route for registration
app.get('/register', (req, res) => {
    res.render('register', { message: null });
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    // Hash the password
    try {
        const hash = await bcrypt.hash(password, 10);

        // Save the user to the database
        await db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash]);

        req.session.user = { username }; // Store user in session
        res.redirect('/'); // Redirect to welcome page
    } catch (err) {
        console.log("Error registering user:", err);
        res.render('register', { message: 'User already exists.' });
    }
});

// Route for login
app.get('/login', (req, res) => {
    res.render('login', { message: null });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const [results] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (results.length > 0) {
            const user = results[0];
            // Compare passwords
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                req.session.user = user; // Store user in session
                return res.redirect('/'); // Redirect to welcome page
            } else {
                return res.render('login', { message: 'Invalid credentials.' });
            }
        } else {
            return res.render('login', { message: 'User not found.' });
        }
    } catch (err) {
        console.log("Error logging in:", err);
        return res.render('login', { message: 'An error occurred. Please try again.' });
    }
});

// Route for logout
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/');
        }
        res.redirect('/');
    });
});

// Route for profile setup
app.get('/profile/setup', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('profile-setup', { user: req.session.user, message: null });
});

app.post('/profile/setup', async (req, res) => {
    const { first_name, last_name, pet_name, birth_date, phone_number } = req.body;
    const username = req.session.user.username;

    try {
        await db.query('INSERT INTO user_profiles (username, first_name, last_name, pet_name, birth_date, phone_number) VALUES (?, ?, ?, ?, ?, ?)', 
            [username, first_name, last_name, pet_name, birth_date, phone_number]);

        res.redirect('/profile'); // Redirect to profile page after setup
    } catch (err) {
        console.log("Error saving profile:", err);
        return res.render('profile-setup', { user: req.session.user, message: "An error occurred. Please try again." });
    }
});

// Profile route
app.get('/profile', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const currentUser = req.session.user;

    try {
        const [results] = await db.query('SELECT * FROM user_profiles WHERE username = ?', [currentUser.username]);
        const profile = results.length > 0 ? results[0] : null;

        if (!profile) {
            return res.redirect('/profile/setup');
        }

        res.render('profile', { user: currentUser, profile });
    } catch (err) {
        console.log("Error fetching profile:", err);
        return res.redirect('/');
    }
});

// Edit profile route
app.get('/edit-profile', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const currentUser = req.session.user;

    try {
        const [results] = await db.query('SELECT * FROM user_profiles WHERE username = ?', [currentUser.username]);
        const profile = results.length > 0 ? results[0] : null;
        res.render('edit-profile', { user: currentUser, profile });
    } catch (err) {
        console.log("Error fetching profile data:", err);
        return res.redirect('/profile');
    }
});

app.post('/edit-profile', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const { first_name, last_name, pet_name, birth_date, phone_number } = req.body;
    const currentUser = req.session.user;

    try {
        await db.query(
            'UPDATE user_profiles SET first_name = ?, last_name = ?, pet_name = ?, birth_date = ?, phone_number = ? WHERE username = ?',
            [first_name, last_name, pet_name, birth_date, phone_number, currentUser.username]
        );
        res.redirect('/profile');
    } catch (err) {
        console.log("Error updating profile:", err);
        return res.redirect('/edit-profile');
    }
});

// Backend changes for pet registration
app.get('/api/registrations', async (req, res) => {
    const { month } = req.query;

    if (!month) {
        return res.status(400).json({ error: 'Month query parameter is required' });
    }

    // Start date (1st day of the month, beginning of the day in UTC)
    const monthStart = new Date(month);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0); // Set to midnight UTC
    const formattedStart = monthStart.toISOString().split('T')[0]; // 'YYYY-MM-DD'

    // End date (last day of the month, end of the day in UTC)
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999); // Set to the last moment of the month UTC
    const formattedEnd = monthEnd.toISOString().split('T')[0]; // 'YYYY-MM-DD'

    console.log("Fetching registrations from:", formattedStart, "to:", formattedEnd);

    try {
        // Query the database using async/await
        const [registrations] = await db.query(`
            SELECT pet_name, registration_date
            FROM day_registrations
            WHERE registration_date >= ? AND registration_date <= ?`, 
            [formattedStart, formattedEnd]
        );

        console.log("Registrations fetched:", registrations); // Log the registrations to check if the dates are correct
        
        // Adjust dates based on the local time zone after fetching the data
        const adjustedRegistrations = registrations.map(registration => {
            const utcDate = new Date(registration.registration_date);
            const localDate = new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * 60000);
            registration.registration_date = localDate.toISOString().split('T')[0]; // Adjusted local date
            return registration;
        });

        res.json(adjustedRegistrations); // Send the adjusted registrations back as JSON
    } catch (err) {
        console.log('Database error:', err);
        res.status(500).json({ error: 'Failed to fetch registrations' });
    }
});

app.post('/api/register-pet', (req, res) => {
    if (!req.session.user) {
        console.log('Unauthorized access attempt');
        return res.status(401).send('Unauthorized');
    }

    const { pet_name, registration_date } = req.body;
    const user_id = req.session.user.id;
    console.log("pet_name: " + pet_name)
    console.log("registration_date: " + registration_date)
    if (!pet_name || !registration_date) {
        console.log('Missing pet_name or registration_date in request');
        return res.status(400).send('Pet name and registration date are required');
    }

    db.query(
        'INSERT INTO day_registrations (user_id, pet_name, registration_date) VALUES (?, ?, ?)',
        [user_id, pet_name, registration_date],
        (err) => {
            if (err) {
                console.log('Error registering pet:', err);
                return res.status(500).send('Error registering pet');
            }
            res.status(200).send('Pet registered successfully');
        }
    );
});

app.delete('/api/remove-registration/:id', (req, res) => {
    const { id } = req.params;
    const user_id = req.session.user.id;

    db.query(
        'DELETE FROM day_registrations WHERE id = ? AND user_id = ?',
        [id, user_id],
        (err) => {
            if (err) return res.status(500).send('Error removing registration');
            res.status(200).send('Registration removed successfully');
        }
    );
});


// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
