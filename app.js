const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',  // replace with your MySQL password
    database: 'userdb'
});

db.connect(err => {
    if (err) throw err;
    console.log('Connected to MySQL');
});

// Express session setup
app.use(session({
    secret: 'secret', // Replace with a strong secret in production
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Routes

// Registration Page
app.get('/register', (req, res) => {
    res.render('register', { message: null });
});

// Handle registration
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.render('register', { message: 'Please provide all details' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 8);
        db.query('INSERT INTO users SET ?', { username: username, password: hashedPassword }, (error, results) => {
            if (error) {
                console.error(error);
                return res.render('register', { message: 'Error registering user. Please try again.' });
            }
            res.render('register', { message: 'User registered successfully' });
        });
    } catch (err) {
        console.error(err);
        res.render('register', { message: 'Server error. Please try again later.' });
    }
});

// Login Page
app.get('/login', (req, res) => {
    res.render('login', { message: null });
});

// Handle login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.render('login', { message: 'Please provide both username and password' });
    }

    db.query('SELECT * FROM users WHERE username = ?', [username], async (error, results) => {
        if (error) throw error;

        if (results.length === 0 || !(await bcrypt.compare(password, results[0].password))) {
            return res.render('login', { message: 'Username or Password is incorrect' });
        }

        req.session.user = results[0].username;
        res.send('Login successful! Welcome ' + req.session.user);
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
