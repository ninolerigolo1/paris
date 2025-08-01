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
            console.log('Données chargées depuis db.json.');
            return JSON.parse(data);
        } catch (error) {
            console.error('Erreur lors de la lecture de db.json:', error);
            return { users: [], events: [], nextEventId: 1 };
        }
    }
    console.log('Fichier db.json non trouvé, création d\'un nouveau fichier.');
    return { users: [], events: [], nextEventId: 1 };
};

// Save data to db.json
const saveData = (data) => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        console.log('Données sauvegardées dans db.json.');
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
        if (totalAmount > 0 && (option.totalBets || 0) > 0) {
            const probability = (option.totalBets || 0) / totalAmount;
            // Ensure cote is never below 1.05
            option.cote = Math.max(1.05, Math.floor((1 / probability) * 0.95 * 100) / 100);
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
        isBlocked: false,
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
    if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Nom d\'utilisateur ou mot de passe incorrect.' });
    }
    // Return a simplified user object for the client, including the blocked status
    const userForClient = {
        username: user.username,
        balance: user.balance,
        isAdmin: user.isAdmin,
        isBlocked: user.isBlocked,
        bets: user.bets,
    };
    return res.json({ message: 'Connexion réussie !', user: userForClient });
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
            isBlocked: user.isBlocked,
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
    const eventsWithCotes = db.events.map(event => {
        if (!event.isClosed) {
            calculateOdds(event);
        }
        return event;
    });
    res.json(eventsWithCotes);
});

// Place a bet
app.post('/api/bet', (req, res) => {
    const { username, eventId, optionIndex, betAmount } = req.body;
    const user = findUser(username);
    const event = db.events.find(e => e.id === eventId);
    
    if (!user || !event) {
        return res.status(404).json({ error: 'Utilisateur ou événement non trouvé.' });
    }
    if (user.isBlocked) {
         return res.status(403).json({ error: 'Votre compte est bloqué, vous ne pouvez pas parier.' });
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
    const userForClient = {
        username: user.username,
        balance: user.balance,
        isAdmin: user.isAdmin,
        isBlocked: user.isBlocked,
        bets: user.bets,
    };
    res.json({ message: 'Pari enregistré.', user: userForClient });
});

// Get leaderboard
app.get('/api/leaderboard', (req, res) => {
    const leaderboard = db.users
        .filter(user => !user.isAdmin)
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 3)
        .map(user => ({ username: user.username, balance: user.balance }));
    res.json(leaderboard);
});

// ADMIN ROUTES

// Create a new event
app.post('/api/admin/create-event', (req, res) => {
    const { title, options } = req.body;
    const newEvent = {
        id: db.nextEventId++,
        title,
        options: options.map(opt => ({
            label: opt.label,
            cote: 1.05,
            totalBets: 0,
            bets: [] // Store individual bets for history
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
    event.winningOptionIndex = winningOptionIndex;
    const winningOption = event.options[winningOptionIndex];
    const winningCote = winningOption.cote;

    db.users.forEach(user => {
        const userBet = user.bets.find(bet => bet.eventId === eventId);
        if (userBet) {
            const betResult = {
                username: user.username,
                betAmount: userBet.amount,
                betOption: event.options[userBet.optionIndex].label,
                isWinner: userBet.optionIndex === winningOptionIndex,
                winnings: 0
            };
            if (betResult.isWinner) {
                const winnings = Math.round(userBet.amount * winningCote);
                user.balance += winnings;
                betResult.winnings = winnings;
            } else {
                betResult.winnings = -userBet.amount;
            }
            // Add bet result to event history
            event.options[userBet.optionIndex].bets.push(betResult);
        }
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
    user.isBlocked = !user.isBlocked; // Toggle block status
    saveData(db);
    res.json({ message: `Le compte de ${username} a été ${user.isBlocked ? 'bloqué' : 'débloqué'}.` });
});

// Get user list for admin
app.get('/api/admin/user-list', (req, res) => {
    const userList = db.users.map(u => ({
        username: u.username,
        balance: u.balance,
        isAdmin: u.isAdmin,
        isBlocked: u.isBlocked
    }));
    res.json(userList);
});

// Get detailed event history for admin
app.get('/api/admin/events-history', (req, res) => {
    const closedEvents = db.events.filter(e => e.isClosed);
    res.json(closedEvents);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});