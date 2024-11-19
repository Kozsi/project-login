// Import necessary modules
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const app = express();
const port = 3000;

// Middleware
// Middleware to set up the layout for all views
app.locals.layout = 'layout'; // This sets the default layout
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve static files
app.set('view engine', 'ejs');

// Session configuration
app.use(session({
    secret: 'your-secret-key', // Change this to a more secure secret
    resave: false,
    saveUninitialized: true,
}));

// MySQL database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'userdb_service',
    password: 'password',  // replace with your MySQL password
    database: 'userdb'
});

// Connect to the database
db.connect(err => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to database.');
});

const moment = require('moment'); // If using moment
// const { format, startOfMonth, endOfMonth, eachDayOfInterval } = require('date-fns'); // If using date-fns

// app.js
// Inside your route for displaying the calendar
app.get('/calendar', (req, res) => {
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

    db.query(
        'SELECT * FROM day_registrations WHERE registration_date BETWEEN ? AND ?',
        [startOfMonth, endOfMonth],
        (err, results) => {
            if (err) {
                console.error("Error fetching registrations:", err);
                return res.status(500).send('Error fetching registrations');
            }

            // Format the results to be used in the calendar
            const registrations = results.map(reg => ({
                petName: reg.pet_name,
                registrationDate: new Date(reg.registration_date).toISOString().split('T')[0], // Format date as YYYY-MM-DD
            }));

            // Render the calendar page with registration data
            res.render('calendar', {
                currentUser,
                monthDate,
                previousMonth,
                nextMonth,
                registrations // Pass the registrations to the calendar view
            });
        }
    );
});


// Route for the welcome page
app.get('/', (req, res) => {
    res.render('welcome', { user: req.session.user });
});

// Route for registration
app.get('/register', (req, res) => {
    res.render('register', { message: null });
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;

    // Hash the password
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) throw err;

        // Save the user to the database
        db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash], (err) => {
            if (err) {
                return res.render('register', { message: 'User already exists.' });
            }

            req.session.user = { username }; // Store user in session
            res.redirect('/'); // Redirect to welcome page
        });
    });
});

// Route for login
app.get('/login', (req, res) => {
    res.render('login', { message: null });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Query the database for the user
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            const user = results[0];
            // Compare passwords
            bcrypt.compare(password, user.password, (err, match) => {
                if (match) {
                    req.session.user = user; // Store user in session
                    return res.redirect('/'); // Redirect to welcome page
                } else {
                    return res.render('login', { message: 'Invalid credentials.' });
                }
            });
        } else {
            return res.render('login', { message: 'User not found.' });
        }
    });
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

app.post('/profile/setup', (req, res) => {
    const { first_name, last_name, pet_name, birth_date, phone_number } = req.body;
    const username = req.session.user.username;

    // Insert the profile data into the database
    db.query('INSERT INTO user_profiles (username, first_name, last_name, pet_name, birth_date, phone_number) VALUES (?, ?, ?, ?, ?, ?)', 
        [username, first_name, last_name, pet_name, birth_date, phone_number], 
        (err) => {
            if (err) {
                console.error("Error saving profile:", err);
                return res.render('profile-setup', { user: req.session.user, message: "An error occurred. Please try again." });
            }
            res.redirect('/profile'); // Redirect to profile page after setup
        }
    );
});

// Profile route
app.get('/profile', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const currentUser = req.session.user;

    db.query('SELECT * FROM user_profiles WHERE username = ?', [currentUser.username], (err, results) => {
        if (err) {
            console.error("Error fetching profile:", err);
            return res.redirect('/');
        }

        const profile = results.length > 0 ? results[0] : null;

        if (!profile) {
            return res.redirect('/profile/setup');
        }

        res.render('profile', { user: currentUser, profile });
    });
});

// Edit profile route
app.get('/edit-profile', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const currentUser = req.session.user;

    db.query('SELECT * FROM user_profiles WHERE username = ?', [currentUser.username], (err, results) => {
        if (err) {
            console.error("Error fetching profile data:", err);
            return res.redirect('/profile');
        }

        const profile = results.length > 0 ? results[0] : null;
        res.render('edit-profile', { user: currentUser, profile });
    });
});

app.post('/edit-profile', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const { first_name, last_name, pet_name, birth_date, phone_number } = req.body;
    const currentUser = req.session.user;

    db.query(
        'UPDATE user_profiles SET first_name = ?, last_name = ?, pet_name = ?, birth_date = ?, phone_number = ? WHERE username = ?',
        [first_name, last_name, pet_name, birth_date, phone_number, currentUser.username],
        (err) => {
            if (err) {
                console.error("Error updating profile:", err);
                return res.redirect('/edit-profile');
            }
            res.redirect('/profile');
        }
    );
});

// Backend changes for pet registration \\

app.get('/api/registrations', (req, res) => {
    const { month } = req.query;
    const startOfMonth = new Date(month);
    const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);

    console.log('Month query:', month);
    console.log('Start of Month:', startOfMonth);
    console.log('End of Month:', endOfMonth);


    db.query(
        'SELECT * FROM day_registrations WHERE registration_date BETWEEN ? AND ?',
        [startOfMonth, endOfMonth],
        (err, results) => {
            if (err) return res.status(500).send('Error fetching registrations');
            console.log("error fetching registrations")
            res.json(results);
        }
    );
});

app.post('/api/register-pet', (req, res) => {
    if (!req.session.user) {
        console.log('Unauthorized access attempt');
        return res.status(401).send('Unauthorized');
    }

    const { pet_name, registration_date } = req.body;
    const user_id = req.session.user.id;

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
