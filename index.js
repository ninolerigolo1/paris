// Fichier : index.js
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs'); // Module pour la gestion des fichiers

const app = express();
const PORT = 3000;
const JWT_SECRET = 'ton-secret-jwt-super-secret';

// NOUVEAU : Fichiers pour la persistance des données
const USERS_FILE = 'users.json';
const EVENTS_FILE = 'events.json';
const PARIS_FILE = 'paris.json';

// NOUVEAU : Fonctions de lecture et d'écriture de fichiers
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

// Charge les données au démarrage
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

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Middleware pour vérifier le Token JWT
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

// Middleware pour vérifier le Token JWT ET le rôle admin
const authenticateAdminJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err || !user.isAdmin) {
                return res.sendStatus(403); // Non-admin ou token invalide
            }
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

// --- Routes publiques ---
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send("Nom d'utilisateur et mot de passe requis.");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const isAdmin = users.length === 0;
    const newUser = { id: users.length + 1, username, password: hashedPassword, jetons: 1000, isAdmin };
    users.push(newUser);
    saveData(USERS_FILE, users); // Enregistre le nouveau compte
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
    saveData(EVENTS_FILE, events); // Enregistre le nouvel événement
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
        if (winner) {
            winner.jetons += (pari.mise * option.cote) - pari.mise; // Le gain est la mise multipliée par la cote moins la mise
        }
    });

    saveData(EVENTS_FILE, events);
    saveData(USERS_FILE, users);
    
    res.send("Événement clôturé et gains distribués.");
});

// Lancement du serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
    console.log('Interface web disponible sur http://localhost:3000');
});