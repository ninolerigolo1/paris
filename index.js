// Fichier : index.js
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'ton-secret-jwt-super-secret';
const ADMIN_CODE = 'SuperAdmin2025'; // NOUVEAU : Le code secret pour devenir admin

const USERS_FILE = 'users.json';
const EVENTS_FILE = 'events.json';
const PARIS_FILE = 'paris.json';

const loadData = (file, defaultValue) => {
    try {
        const data = fs.readFileSync(file, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return defaultValue;
    }
};

const saveData = (file, data) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
};

let users = loadData(USERS_FILE, []);
let events = loadData(EVENTS_FILE, [
    {
        id: 1,
        title: "Match de Football : Équipe A vs Équipe B",
        status: "open",
        options: [
            { id: 1, label: "Équipe A gagne", cote: 2.1 },
            { id: 2, label: "Match Nul", cote: 3.0 },
            { id: 3, label: "Équipe B gagne", cote: 2.5 }
        ],
        resultOptionId: null
    }
]);
let paris = loadData(PARIS_FILE, []);

const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

const authenticateAdminJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err || !user.isAdmin) {
                return res.sendStatus(403);
            }
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

app.use(bodyParser.json());
app.use(express.static('public'));

// --- Routes publiques ---
// Inscription
app.post('/signup', async (req, res) => {
    const { username, password, adminCode } = req.body; // NOUVEAU : Récupère le code admin
    if (!username || !password) {
        return res.status(400).send("Nom d'utilisateur et mot de passe requis.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const isAdmin = (adminCode === ADMIN_CODE); // NOUVEAU : Vérifie le code admin
    const newUser = { id: users.length + 1, username, password: hashedPassword, jetons: 1000, isAdmin };
    users.push(newUser);
    saveData(USERS_FILE, users);
    res.status(201).send(`Compte créé ! ${isAdmin ? 'Vous êtes l\'administrateur.' : ''}`);
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } else {
        res.status(401).send("Identifiants incorrects.");
    }
});

app.get('/events', (req, res) => {
    res.json(events.filter(e => e.status === 'open'));
});

app.get('/me/balance', authenticateJWT, (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    if (user) {
        res.json({ jetons: user.jetons });
    } else {
        res.status(404).send("Utilisateur non trouvé.");
    }
});

app.post('/parier', authenticateJWT, (req, res) => {
    const { eventId, optionId, mise } = req.body;
    const user = users.find(u => u.id === req.user.id);
    const event = events.find(e => e.id === eventId);
    if (!user || !event) return res.status(404).send("Utilisateur ou événement non trouvé.");
    if (event.status !== 'open') return res.status(400).send("Les paris pour cet événement sont fermés.");
    if (user.jetons < mise) return res.status(400).send("Solde de jetons insuffisant.");
    if (mise <= 0) return res.status(400).send("La mise doit être positive.");
    user.jetons -= mise;
    paris.push({ userId: user.id, eventId, optionId, mise });
    saveData(USERS_FILE, users);
    saveData(PARIS_FILE, paris);
    res.send("Pari enregistré ! Votre nouveau solde est de " + user.jetons + " jetons.");
});

// --- Routes d'administration (protégées) ---
// NOUVEAU : Route pour obtenir tous les utilisateurs et leurs paris
app.get('/admin/users-with-history', authenticateAdminJWT, (req, res) => {
    const usersWithHistory = users.map(user => {
        const userParis = paris
            .filter(pari => pari.userId === user.id)
            .map(pari => {
                const event = events.find(e => e.id === pari.eventId);
                const option = event ? event.options.find(o => o.id === pari.optionId) : null;
                return {
                    eventId: pari.eventId,
                    eventName: event ? event.title : 'Événement inconnu',
                    pari: option ? option.label : 'Option inconnue',
                    mise: pari.mise
                };
            });
        return {
            id: user.id,
            username: user.username,
            jetons: user.jetons,
            isAdmin: user.isAdmin,
            paris: userParis
        };
    });
    res.json(usersWithHistory);
});

app.post('/admin/events', authenticateAdminJWT, (req, res) => {
    const { title, options } = req.body;
    if (!title || !options || !Array.isArray(options) || options.length < 2) {
        return res.status(400).send("Titre et au moins deux options sont requis.");
    }
    const newEvent = {
        id: events.length + 1,
        title,
        status: 'open',
        options: options.map((opt, index) => ({ id: index + 1, label: opt.label, cote: opt.cote })),
        resultOptionId: null
    };
    events.push(newEvent);
    saveData(EVENTS_FILE, events);
    res.status(201).json(newEvent);
});

app.get('/admin/events', authenticateAdminJWT, (req, res) => {
    res.json(events);
});

app.post('/admin/close', authenticateAdminJWT, (req, res) => {
    const { eventId, resultOptionId } = req.body;
    const event = events.find(e => e.id === eventId);
    if (!event) return res.status(404).send("Événement non trouvé.");
    event.status = 'finished';
    event.resultOptionId = resultOptionId;
    const winningParis = paris.filter(p => p.eventId === eventId && p.optionId === resultOptionId);
    winningParis.forEach(pari => {
        const winner = users.find(u => u.id === pari.userId);
        const option = event.options.find(o => o.id === pari.optionId);
        if (winner && option) {
            winner.jetons += (pari.mise * option.cote);
        }
    });
    saveData(EVENTS_FILE, events);
    saveData(USERS_FILE, users);
    res.send("Événement clôturé et gains distribués.");
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
    console.log('Interface web disponible sur http://localhost:3000');
});