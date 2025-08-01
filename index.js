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
        try {
            const data = fs.readFileSync(DB_FILE);
            console.log('Données chargées depuis db.json');
            return JSON.parse(data);
        } catch (error) {
            console.error('Erreur lors de la lecture de db.json:', error);
            return { users: [], events: [], nextEventId: 1 };
        }
    }
    console.log('Création d\'un nouveau fichier db.json');
    return { users: [], events: [], nextEventId: 1 };
};

// Save data to db.json
const saveData = (data) => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        console.log('Données sauvegardées dans db.json');
    } catch (error) {
        console.error('Erreur lors de l\'écriture dans db.json:', error);
    }
};

let db = loadData();

// Helper to find a user
const findUser = (username) => db.users.find(u => u.username === username);

// Function to calculate odds based on total bets
const calculateOdds = (event) => {
    const totalAmount = event.options.reduce((sum, option) => sum + (option.totalBets || 0), 0);
    event.options.forEach(option => {
        if (totalAmount > 0) {
            const probability = (option.totalBets || 0) / totalAmount;
            // Add a small margin to make it more realistic
            option.cote = (1 / probability) * 0.95; 
        } else {
            option.cote = 1.05; // Default odds if no bets
        }
    });
};

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
        isBlocked: false, // New property
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
    if (!user) {
        return res.status(401).json({ error: 'Nom d\'utilisateur ou mot de passe incorrect.' });
    }
    if (user.isBlocked) {
        return res.status(403).json({ error: 'Votre compte a été bloqué par un administrateur.' });
    }
    if (user.password === password) {
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
    // For open events, recalculate and send odds
    const openEvents = db.events.filter(e => !e.isClosed);
    openEvents.forEach(calculateOdds);
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

    // Update total bets for dynamic odds calculation
    event.options[optionIndex].totalBets = (event.options[optionIndex].totalBets || 0) + betAmount;
    
    saveData(db);
    res.json({ message: 'Pari enregistré.', balance: user.balance });
});

// Get leaderboard
app.get('/api/leaderboard', (req, res) => {
    const leaderboard = db.users
        .filter(user => !user.isAdmin) // Admins not in leaderboard
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 3) // Get top 3
        .map(user => ({ username: user.username, balance: user.balance }));
    res.json(leaderboard);
});

// ADMIN ROUTES

// Create a new event
app.post('/api/admin/create-event', (req, res) => {
    const { title, options } = req.body; // Options now only contain labels
    const newEvent = {
        id: db.nextEventId++,
        title,
        options: options.map(opt => ({
            label: opt.label,
            cote: 1.05, // Default cote
            totalBets: 0
        })),
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
    });

    // Remove bets for the closed event
    db.users.forEach(user => {
        user.bets = user.bets.filter(bet => bet.eventId !== eventId);
    });

    saveData(db);
    res.json({ message: 'Événement clos et gains distribués.' });
});

// Block a user
app.post('/api/admin/block-user', (req, res) => {
    const { username } = req.body;
    const user = findUser(username);
    if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }
    if (user.isAdmin) {
        return res.status(403).json({ error: 'Impossible de bloquer un autre administrateur.' });
    }
    user.isBlocked = true;
    saveData(db);
    res.json({ message: `Le compte de ${username} a été bloqué.` });
});

// Get user history for admin
app.get('/api/admin/history', (req, res) => {
    const userHistory = db.users.map(u => ({
        username: u.username,
        balance: u.balance,
        isAdmin: u.isAdmin,
        isBlocked: u.isBlocked // New property
    }));
    res.json(userHistory);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});