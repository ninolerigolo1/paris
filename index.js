const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// Utilisation de bodyParser pour analyser les corps de requête JSON
app.use(bodyParser.json());

// Servir les fichiers statiques du dossier 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Base de données simulée en mémoire
const users = [
    { username: 'admin', passwordHash: '$2b$10$w82nKj/T2s/y/s.e.h2yJ.u/f7d.Tf/j/q.E.f/w.A/j', isAdmin: true, balance: 1000 }, // 'SuperAdmin2025'
];
const events = [];
let nextEventId = 1;

// Endpoint d'inscription
app.post('/api/signup', async (req, res) => {
    const { username, password, adminCode } = req.body;
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ error: 'Ce nom d\'utilisateur existe déjà.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const isAdmin = adminCode === 'SuperAdmin2025';
    const newUser = { username, passwordHash, isAdmin, balance: 1000 };
    users.push(newUser);
    res.json({ message: 'Inscription réussie !', user: { username, isAdmin, balance: newUser.balance } });
});

// Endpoint de connexion
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    if (user && await bcrypt.compare(password, user.passwordHash)) {
        res.json({ message: 'Connexion réussie !', user: { username: user.username, isAdmin: user.isAdmin, balance: user.balance } });
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

    if (user.balance < betAmount) {
        return res.status(400).json({ error: 'Solde insuffisant.' });
    }

    user.balance -= betAmount;
    event.options[optionIndex].bets.push({ username, amount: betAmount });

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