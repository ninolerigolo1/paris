// Fichier : public/app.js
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const userInfo = document.getElementById('user-info');
const usernameDisplay = document.getElementById('username-display');
const balanceDisplay = document.getElementById('balance-display');
const eventsList = document.getElementById('events-list');
const authForm = document.getElementById('auth-form');
const authMessage = document.getElementById('auth-message');
const logoutBtn = document.getElementById('logout-btn');

// NOUVEAU : Récupération des éléments admin (si on est sur la page admin)
const adminSection = document.getElementById('admin-section');
const adminMessage = document.getElementById('admin-message');
const createEventForm = document.getElementById('create-event-form');
const addOptionBtn = document.getElementById('add-option-btn');
const optionsContainer = document.getElementById('options-container');
const adminEventsList = document.getElementById('admin-events-list');

let token = localStorage.getItem('token');

// Fonctions API
const api = {
    signup: (username, password) => {
        return fetch('/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
    },
    login: (username, password) => {
        return fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }).then(res => res.json());
    },
    getEvents: () => {
        return fetch('/events').then(res => res.json());
    },
    getBalance: () => {
        return fetch('/me/balance', {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json());
    },
    parier: (eventId, optionId, mise) => {
        return fetch('/parier', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ eventId, optionId, mise })
        });
    },
    createEvent: (title, options) => {
        return fetch('/admin/events', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, options })
        });
    },
    getAdminEvents: () => {
        return fetch('/admin/events', {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json());
    },
    closeEvent: (eventId, resultOptionId) => {
        return fetch('/admin/close', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ eventId, resultOptionId })
        });
    }
};

const showAuth = () => {
    if (authSection) authSection.classList.remove('hidden');
    if (appSection) appSection.classList.add('hidden');
    if (userInfo) userInfo.classList.add('hidden');
    // Si on est sur la page admin, on redirige vers l'accueil
    if (window.location.pathname === '/admin.html') {
        window.location.href = '/';
    }
};

const showApp = (isAdmin) => {
    if (authSection) authSection.classList.add('hidden');
    if (appSection) appSection.classList.remove('hidden');
    if (userInfo) userInfo.classList.remove('hidden');

    if (isAdmin) {
        // Redirige vers la page admin si l'utilisateur est admin
        if (window.location.pathname !== '/admin.html') {
            window.location.href = '/admin.html';
        } else {
            if (adminSection) adminSection.classList.remove('hidden');
            fetchAdminEvents();
        }
    } else {
        // Pour les utilisateurs non-admin, on s'assure qu'ils sont sur la page principale
        if (window.location.pathname !== '/') {
            window.location.href = '/';
        }
        fetchEvents();
    }
    fetchBalance();
};

const fetchBalance = async () => {
    if (!token) return;
    const res = await api.getBalance();
    if (res.jetons !== undefined) {
        if (balanceDisplay) balanceDisplay.textContent = res.jetons;
    } else {
        handleLogout();
    }
};

const fetchEvents = async () => {
    const events = await api.getEvents();
    if (eventsList) eventsList.innerHTML = '';
    events.forEach(event => {
        const eventCard = document.createElement('div');
        eventCard.className = 'event-card';
        let optionsHtml = event.options.map(option => `
            <button class="bet-btn" data-event-id="${event.id}" data-option-id="${option.id}">${option.label} (Cote: ${option.cote})</button>
        `).join('');

        eventCard.innerHTML = `
            <h3>${event.title}</h3>
            <div class="options">${optionsHtml}</div>
            <form class="bet-form" data-event-id="${event.id}">
                <input type="number" name="mise" placeholder="Mise en jetons" required min="1">
                <button type="submit">Parier</button>
            </form>
        `;
        if(eventsList) eventsList.appendChild(eventCard);
    });

    if (eventsList) {
        document.querySelectorAll('.bet-form').forEach(form => {
            form.addEventListener('submit', handleBet);
        });
    }
};

const fetchAdminEvents = async () => {
    const events = await api.getAdminEvents();
    if (adminEventsList) adminEventsList.innerHTML = '';
    events.forEach(event => {
        const eventCard = document.createElement('div');
        eventCard.className = 'event-card';

        let optionsHtml = event.options.map(option => `
            <button class="close-option-btn" data-event-id="${event.id}" data-option-id="${option.id}">
                Clôturer avec gain pour : ${option.label}
            </button>
        `).join('');

        eventCard.innerHTML = `
            <h3>[ID: ${event.id}] ${event.title} (${event.status})</h3>
            <div class="options">${optionsHtml}</div>
        `;
        if (adminEventsList) adminEventsList.appendChild(eventCard);
    });

    if (adminEventsList) {
        document.querySelectorAll('.close-option-btn').forEach(btn => {
            btn.addEventListener('click', handleCloseEvent);
        });
    }
};

const handleBet = async (e) => {
    e.preventDefault();
    const form = e.target;
    const eventId = parseInt(form.dataset.eventId);
    const mise = parseInt(form.querySelector('input[name="mise"]').value);
    
    const selectedOptionBtn = form.previousElementSibling.querySelector('.bet-btn');
    if (!selectedOptionBtn) return alert("Veuillez choisir une option de pari.");

    const optionId = parseInt(selectedOptionBtn.dataset.optionId);

    const res = await api.parier(eventId, optionId, mise);
    const message = await res.text();
    document.getElementById('app-message').textContent = message;
    fetchBalance();
    form.reset();
};


const handleLogin = async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    try {
        const res = await api.login(username, password);
        if (res.token) {
            token = res.token;
            localStorage.setItem('token', token);
            const userPayload = JSON.parse(atob(token.split('.')[1]));
            usernameDisplay.textContent = userPayload.username;
            showApp(userPayload.isAdmin);
        } else {
            authMessage.textContent = "Erreur de connexion.";
        }
    } catch (e) {
        authMessage.textContent = "Erreur de connexion ou identifiants incorrects.";
    }
};

const handleSignup = async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    try {
        const res = await api.signup(username, password);
        const message = await res.text();
        authMessage.textContent = message;
        authForm.reset();
    } catch (e) {
        authMessage.textContent = "Erreur lors de l'inscription.";
    }
};

const handleLogout = () => {
    token = null;
    localStorage.removeItem('token');
    showAuth();
};

const handleCreateEvent = async (e) => {
    e.preventDefault();
    const title = document.getElementById('event-title').value;
    const optionGroups = document.querySelectorAll('#options-container .option-group');
    const options = Array.from(optionGroups).map(group => {
        return {
            label: group.querySelector('.option-label').value,
            cote: parseFloat(group.querySelector('.option-cote').value)
        };
    });

    const res = await api.createEvent(title, options);
    if (res.status === 201) {
        adminMessage.textContent = "Événement créé avec succès !";
        createEventForm.reset();
        fetchEvents();
        fetchAdminEvents();
    } else {
        const message = await res.text();
        adminMessage.textContent = "Erreur : " + message;
    }
};

const handleCloseEvent = async (e) => {
    const eventId = parseInt(e.target.dataset.eventId);
    const resultOptionId = parseInt(e.target.dataset.optionId);
    
    const res = await api.closeEvent(eventId, resultOptionId);
    if (res.status === 200) {
        adminMessage.textContent = "Événement clôturé et gains distribués !";
        fetchEvents();
        fetchAdminEvents();
    } else {
        const message = await res.text();
        adminMessage.textContent = "Erreur : " + message;
    }
};

// Écouteurs d'événements
if (document.getElementById('login-btn')) document.getElementById('login-btn').addEventListener('click', handleLogin);
if (document.getElementById('signup-btn')) document.getElementById('signup-btn').addEventListener('click', handleSignup);
if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
if (createEventForm) createEventForm.addEventListener('submit', handleCreateEvent);
if (addOptionBtn) addOptionBtn.addEventListener('click', () => {
    const newOptionGroup = document.createElement('div');
    newOptionGroup.className = 'option-group';
    newOptionGroup.innerHTML = `
        <input type="text" class="option-label" placeholder="Libellé option" required>
        <input type="number" class="option-cote" placeholder="Cote" step="0.01" required>
    `;
    optionsContainer.appendChild(newOptionGroup);
});

// Initialisation
if (token) {
    const userPayload = JSON.parse(atob(token.split('.')[1]));
    showApp(userPayload.isAdmin);
} else {
    showAuth();
}