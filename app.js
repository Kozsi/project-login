// Import necessary modules
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const app = express();
const port = 3000;

// Middleware
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

// Route for profile page
app.get('/profile', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login'); // Redirect if not logged in
    }

    const currentUser = req.session.user;
    res.render('profile', { user: currentUser });
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

    // Log the details for debugging
    console.log(`Incoming month query parameter: ${monthQuery}`);
    console.log(`Parsed incoming month: ${monthDate.toISOString()}`); // Log as ISO for clarity
    console.log(`Previous Month: ${previousMonth.toISOString()}`);
    console.log(`Next Month: ${nextMonth.toISOString()}`);

    // Render the calendar page with required data
    res.render('calendar', {
        currentUser, 
        monthDate, // Send the correct monthDate to EJS
        previousMonth,
        nextMonth
    });
});


// Proile stuff

app.get('/profile/setup', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login'); // Redirect if not logged in
    }

    res.render('profile-setup'); // Render the profile setup page
});

app.post('/profile/setup', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login'); // Redirect if not logged in
    }

    const { first_name, last_name, pet_name, birth_date, phone_number } = req.body;
    const username = req.session.user.username; // Get the logged-in user's username

    // Insert or update the user's profile information in the database
    db.query('INSERT INTO user_profiles (username, first_name, last_name, pet_name, birth_date, phone_number) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE first_name = ?, last_name = ?, pet_name = ?, birth_date = ?, phone_number = ?',
    [username, first_name, last_name, pet_name, birth_date, phone_number, first_name, last_name, pet_name, birth_date, phone_number],
    (err, result) => {
        if (err) {
            console.error('Error saving profile information:', err);
            return res.redirect('/profile/setup');
        }

        // Redirect to profile page after successful setup
        res.redirect('/profile');
    });
});

// Profile route to fetch user profile data from the database
app.get('/profile', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login'); // Redirect if not logged in
    }

    const currentUser = req.session.user;

    // Query to get the user's profile based on the username
    db.query('SELECT * FROM user_profiles WHERE username = ?', [currentUser.username], (err, results) => {
        if (err) {
            console.error("Error fetching profile data: ", err);
            return res.render('profile', {
                user: currentUser,
                profile: null, // Send null profile if there's an error
            });
        }

        const profile = results.length > 0 ? results[0] : null;

        // Render the profile page and pass user and profile data
        res.render('profile', {
            user: currentUser,
            profile: profile // Pass profile data or null if not found
        });
    });
});


// Route to save the edited profile data
app.post('/edit-profile', (req, res) => {
    const { first_name, last_name, pet_name, birthdate, phone_number } = req.body;
    const currentUser = req.session.user;

    // Update the user's profile in the database
    db.query('INSERT INTO user_profiles (username, first_name, last_name, pet_name, birthdate, phone_number) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE first_name = ?, last_name = ?, pet_name = ?, birthdate = ?, phone_number = ?',
        [currentUser.username, first_name, last_name, pet_name, birthdate, phone_number, first_name, last_name, pet_name, birthdate, phone_number],
        (err, results) => {
            if (err) throw err;
            res.redirect('/profile'); // After saving, redirect back to the profile page
        });
});



// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
