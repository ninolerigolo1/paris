const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simulated in-memory database
const users = [
    { username: 'admin', passwordHash: '$2b$10$w82nKj/T2s/y/s.e.h2yJ.u/f7d.Tf/j/q.E.f/w.A/j', isAdmin: true, balance: 1000, bets: [] }, // 'SuperAdmin2025'
];
const events = [];
let nextEventId = 1;

// Endpoint to get user's bets
app.get('/api/user-bets', (req, res) => {
    const { username } = req.query;
    const user = users.find(u => u.username === username);
    if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }
    res.json({ bets: user.bets });
});

// Endpoint d'inscription
app.post('/api/signup', async (req, res) => {
    const { username, password, adminCode } = req.body;
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ error: 'Ce nom d\'utilisateur existe déjà.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const isAdmin = adminCode === 'SuperAdmin2025';
    const newUser = { username, passwordHash, isAdmin, balance: 1000, bets: [] };
    users.push(newUser);
    res.json({ message: 'Inscription réussie !', user: { username, isAdmin, balance: newUser.balance, bets: newUser.bets } });
});

// Endpoint de connexion
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    if (user && await bcrypt.compare(password, user.passwordHash)) {
        res.json({ message: 'Connexion réussie !', user: { username: user.username, isAdmin: user.isAdmin, balance: user.balance, bets: user.bets } });
    } else {
        res.status(401).json({ error: 'Erreur de connexion ou identifiants incorrects.' });
    }
});

// Endpoint pour changer le mot de passe
app.post('/api/change-password', async (req, res) => {
    const { username, oldPassword, newPassword } = req.body;
    const user = users.find(u => u.username === username);

    if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    if (!await bcrypt.compare(oldPassword, user.passwordHash)) {
        return res.status(401).json({ error: 'L\'ancien mot de passe est incorrect.' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    res.json({ message: 'Votre mot de passe a été mis à jour avec succès.' });
});

// Endpoint pour obtenir les événements
app.get('/api/events', (req, res) => {
    res.json(events);
});

// Endpoint pour parier
app.post('/api/bet', (req, res) => {
    const { username, eventId, optionIndex, betAmount } = req.body;
    const user = users.find(u => u.username === username);
    const event = events.find(e => e.id === eventId);

    if (!user || !event || event.isClosed) {
        return res.status(400).json({ error: 'Impossible de placer le pari.' });
    }

    // Check if the user has already bet on this event
    if (user.bets.some(bet => bet.eventId === eventId)) {
        return res.status(400).json({ error: 'Vous avez déjà placé un pari sur cet événement.' });
    }

    if (user.balance < betAmount) {
        return res.status(400).json({ error: 'Solde insuffisant.' });
    }

    user.balance -= betAmount;
    user.bets.push({ eventId, optionIndex, amount: betAmount }); // Store the bet in the user object
    event.options[optionIndex].bets.push({ username, amount: betAmount }); // Also store it in the event object

    res.json({ message: 'Pari placé avec succès.', balance: user.balance });
});

// Endpoint pour créer un événement (Admin)
app.post('/api/admin/create-event', (req, res) => {
    const { title, options } = req.body;
    const newEvent = {
        id: nextEventId++,
        title,
        isClosed: false,
        options: options.map(opt => ({ label: opt.label, cote: opt.cote, bets: [] })),
        winningOption: null,
    };
    events.push(newEvent);
    res.json({ message: 'Événement créé avec succès.' });
});

// Endpoint pour clôturer un événement (Admin)
app.post('/api/admin/close-event', (req, res) => {
    const { eventId, winningOptionIndex } = req.body;
    const event = events.find(e => e.id === eventId);
    if (!event || event.isClosed) {
        return res.status(400).json({ error: 'Événement non valide ou déjà clos.' });
    }

    event.isClosed = true;
    event.winningOption = winningOptionIndex;

    // Payer les gagnants
    event.options[winningOptionIndex].bets.forEach(bet => {
        const user = users.find(u => u.username === bet.username);
        if (user) {
            user.balance += bet.amount * event.options[winningOptionIndex].cote;
        }
    });

    res.json({ message: 'Événement clos et gagnants payés.' });
});

// Endpoint pour récupérer l'historique de tous les paris
app.get('/api/admin/history', (req, res) => {
    const userHistory = users.map(user => ({
        username: user.username,
        balance: user.balance,
        isAdmin: user.isAdmin
    }));
    res.json(userHistory);
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});