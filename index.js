const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Admin secret code
const ADMIN_CODE = 'admin123';

// Load data from db.json
const loadData = () => {
    if (fs.existsSync(DB_FILE)) {
        const data = fs.readFileSync(DB_FILE);
        return JSON.parse(data);
    }
    return { users: [], events: [], nextEventId: 1 };
};

// Save data to db.json
const saveData = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

let db = loadData();

// Helper to find a user
const findUser = (username) => db.users.find(u => u.username === username);

// API Endpoints

// Signup
app.post('/api/signup', (req, res) => {
    const { username, password } = req.body;
    if (findUser(username)) {
        return res.status(409).json({ error: 'Ce nom d\'utilisateur existe déjà.' });
    }
    const newUser = {
        id: db.users.length + 1,
        username,
        password, // In a real app, hash this password!
        balance: 1000,
        isAdmin: false,
        bets: []
    };
    db.users.push(newUser);
    saveData(db);
    res.json({ message: 'Compte créé avec succès.' });
});

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = findUser(username);
    if (user && user.password === password) {
        // Return a simplified user object for the client
        const userForClient = {
            username: user.username,
            balance: user.balance,
            isAdmin: user.isAdmin,
            bets: user.bets,
        };
        return res.json({ message: 'Connexion réussie !', user: userForClient });
    }
    res.status(401).json({ error: 'Nom d\'utilisateur ou mot de passe incorrect.' });
});

// Promote to Admin
app.post('/api/promote-to-admin', (req, res) => {
    const { username, code } = req.body;
    if (code !== ADMIN_CODE) {
        return res.status(403).json({ error: 'Code administrateur incorrect.' });
    }
    const user = findUser(username);
    if (user) {
        user.isAdmin = true;
        saveData(db);
        const userForClient = {
            username: user.username,
            balance: user.balance,
            isAdmin: user.isAdmin,
            bets: user.bets,
        };
        return res.json({ message: 'Promotion réussie ! Vous êtes maintenant administrateur.', user: userForClient });
    }
    res.status(404).json({ error: 'Utilisateur non trouvé.' });
});

// Change Password
app.post('/api/change-password', (req, res) => {
    const { username, oldPassword, newPassword } = req.body;
    const user = findUser(username);
    if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }
    if (user.password !== oldPassword) {
        return res.status(401).json({ error: 'Ancien mot de passe incorrect.' });
    }
    user.password = newPassword;
    saveData(db);
    res.json({ message: 'Mot de passe mis à jour avec succès.' });
});

// Get all events
app.get('/api/events', (req, res) => {
    res.json(db.events);
});

// Place a bet
app.post('/api/bet', (req, res) => {
    const { username, eventId, optionIndex, betAmount } = req.body;
    const user = findUser(username);
    const event = db.events.find(e => e.id === eventId);
    
    if (!user || !event) {
        return res.status(404).json({ error: 'Utilisateur ou événement non trouvé.' });
    }
    if (user.balance < betAmount) {
        return res.status(400).json({ error: 'Solde insuffisant.' });
    }
    if (user.bets.some(bet => bet.eventId === eventId)) {
        return res.status(400).json({ error: 'Vous avez déjà parié sur cet événement.' });
    }
    
    user.balance -= betAmount;
    user.bets.push({ eventId, optionIndex, amount: betAmount });
    saveData(db);
    res.json({ message: 'Pari enregistré.', balance: user.balance });
});

// ADMIN ROUTES

// Create a new event
app.post('/api/admin/create-event', (req, res) => {
    const { title, options } = req.body;
    const newEvent = {
        id: db.nextEventId++,
        title,
        options,
        isClosed: false
    };
    db.events.push(newEvent);
    saveData(db);
    res.json({ message: 'Événement créé avec succès.', event: newEvent });
});

// Close an event and distribute winnings
app.post('/api/admin/close-event', (req, res) => {
    const { eventId, winningOptionIndex } = req.body;
    const event = db.events.find(e => e.id === eventId);
    if (!event || event.isClosed) {
        return res.status(400).json({ error: 'Événement non valide ou déjà clos.' });
    }

    event.isClosed = true;
    const winningCote = event.options[winningOptionIndex].cote;

    db.users.forEach(user => {
        user.bets.forEach(bet => {
            if (bet.eventId === eventId && bet.optionIndex === winningOptionIndex) {
                const winnings = bet.amount * winningCote;
                user.balance += winnings;
            }
        });
        // Remove closed event bets from user's active bets
        user.bets = user.bets.filter(bet => bet.eventId !== eventId);
    });

    saveData(db);
    res.json({ message: 'Événement clos et gains distribués.' });
});

// Get user history for admin
app.get('/api/admin/history', (req, res) => {
    // We don't need all user data on the front-end, just a summary
    const userHistory = db.users.map(u => ({
        username: u.username,
        balance: u.balance,
        isAdmin: u.isAdmin,
    }));
    res.json(userHistory);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});