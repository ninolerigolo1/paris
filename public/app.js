document.addEventListener('DOMContentLoaded', () => {
    // Éléments principaux de l'interface
    const authSection = document.getElementById('auth-section');
    const signupSection = document.getElementById('create-account-section');
    const appSection = document.getElementById('app-section');
    const myBetsSection = document.getElementById('my-bets-section');
    const accountSection = document.getElementById('account-section');
    const adminSection = document.getElementById('admin-section');
    const userInfo = document.getElementById('user-info');
    const authMessage = document.getElementById('auth-message');
    const signupMessage = document.getElementById('signup-message');
    const appMessage = document.getElementById('app-message');

    // Boutons de navigation
    const loginBtn = document.getElementById('login-btn');
    const showSignupBtn = document.getElementById('show-signup-btn');
    const showLoginBtn = document.getElementById('show-login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const homeBtn = document.getElementById('home-btn');
    const accountBtn = document.getElementById('account-btn');
    const adminBtn = document.getElementById('admin-btn');
    
    // Autres éléments
    const signupForm = document.getElementById('signup-form');
    const eventsList = document.getElementById('events-list');
    const betsList = document.getElementById('bets-list');

    let user = null;
    let allEvents = [];

    const showMessage = (element, message, type) => {
        element.textContent = message;
        element.className = `message ${type}`;
        setTimeout(() => element.textContent = '', 5000);
    };

    const updateUI = () => {
        const path = window.location.pathname;
        const hash = window.location.hash;

        // Reset display
        if (authSection) authSection.classList.add('hidden');
        if (signupSection) signupSection.classList.add('hidden');
        if (appSection) appSection.classList.add('hidden');
        if (myBetsSection) myBetsSection.classList.add('hidden');
        if (accountSection) accountSection.classList.add('hidden');
        if (adminSection) adminSection.classList.add('hidden');
        if (userInfo) userInfo.classList.add('hidden');

        if (user) {
            userInfo.classList.remove('hidden');
            document.getElementById('username-display').textContent = user.username;
            document.getElementById('balance-display').textContent = `${user.balance} Jetons`;

            if (user.isAdmin) {
                adminBtn.classList.remove('hidden');
            } else {
                adminBtn.classList.add('hidden');
            }

            if (path.includes('/admin.html')) {
                if (user.isAdmin) {
                    adminSection.classList.remove('hidden');
                    fetchAdminData();
                } else {
                    window.location.href = '/';
                }
            } else if (hash === '#account') {
                accountSection.classList.remove('hidden');
                document.getElementById('account-username').textContent = user.username;
                document.getElementById('account-balance').textContent = user.balance;
            } else {
                appSection.classList.remove('hidden');
                myBetsSection.classList.remove('hidden');
                fetchEvents();
            }
        } else {
            if (hash === '#signup') {
                if (signupSection) signupSection.classList.remove('hidden');
            } else {
                if (authSection) authSection.classList.remove('hidden');
            }
        }
    };

    const login = async (url, data) => {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (response.ok) {
                user = result.user;
                localStorage.setItem('user', JSON.stringify(user));
                showMessage(authMessage, result.message, 'success');
                window.location.href = '/';
            } else {
                showMessage(authMessage, result.error, 'error');
            }
        } catch (error) {
            console.error('Erreur:', error);
            showMessage(authMessage, 'Erreur de connexion au serveur.', 'error');
        }
    };
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            if (!username || !password) {
                showMessage(authMessage, "Veuillez remplir tous les champs.", "error");
                return;
            }
            login('/api/login', { username, password });
        });
    }

    if (showSignupBtn) {
        showSignupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = '#signup';
            updateUI();
        });
    }

    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = '';
            updateUI();
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('signup-username').value;
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-password-confirm').value;
            const adminCode = document.getElementById('admin-code').value;

            if (password !== confirmPassword) {
                showMessage(signupMessage, "Les mots de passe ne correspondent pas.", "error");
                return;
            }
            if (!username || !password) {
                showMessage(signupMessage, "Veuillez remplir tous les champs.", "error");
                return;
            }

            try {
                const response = await fetch('/api/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, adminCode }),
                });
                const result = await response.json();
                if (response.ok) {
                    showMessage(signupMessage, result.message + " Vous pouvez maintenant vous connecter.", 'success');
                    // Redirection vers la page de connexion après une inscription réussie
                    window.location.hash = '';
                    updateUI();
                } else {
                    showMessage(signupMessage, result.error, 'error');
                }
            } catch (error) {
                console.error('Erreur:', error);
                showMessage(signupMessage, 'Erreur de connexion au serveur.', 'error');
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            user = null;
            localStorage.removeItem('user');
            if (window.location.pathname !== '/') {
                window.location.href = '/';
            } else {
                updateUI();
            }
        });
    }

    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            window.location.href = '/';
        });
    }

    if (accountBtn) {
        accountBtn.addEventListener('click', () => {
            window.location.hash = '#account';
            updateUI();
        });
    }

    if (adminBtn) {
        adminBtn.addEventListener('click', () => {
            window.location.href = '/admin.html';
        });
    }

    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const oldPassword = document.getElementById('old-password').value;
            const newPassword = document.getElementById('new-password').value;
            const passwordMessage = document.getElementById('password-message');
            
            try {
                const response = await fetch('/api/change-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: user.username, oldPassword, newPassword }),
                });
                const result = await response.json();
                if (response.ok) {
                    showMessage(passwordMessage, result.message, 'success');
                    changePasswordForm.reset();
                } else {
                    showMessage(passwordMessage, result.error, 'error');
                }
            } catch (error) {
                showMessage(passwordMessage, 'Erreur de connexion au serveur.', 'error');
            }
        });
    }

    const fetchEvents = async () => {
        try {
            const response = await fetch('/api/events');
            allEvents = await response.json();
            displayEvents(allEvents);
        } catch (error) {
            console.error('Erreur lors de la récupération des événements:', error);
            showMessage(appMessage, 'Impossible de charger les événements.', 'error');
        }
    };

    const displayEvents = (events) => {
        if (!eventsList || !betsList) return;
        eventsList.innerHTML = '';
        betsList.innerHTML = '';
        const userBets = user.bets || [];
        const activeEvents = events.filter(event => !userBets.some(bet => bet.eventId === event.id));
        const userBetEvents = events.filter(event => userBets.some(bet => bet.eventId === event.id));
        
        activeEvents.forEach(event => {
            const eventCard = document.createElement('div');
            eventCard.className = 'event-card';
            eventCard.innerHTML = `
                <h3>${event.title}</h3>
                <div class="options-container">
                    ${event.options.map((option, index) => `
                        <div class="option">
                            <span class="option-label">${option.label}</span>
                            <span class="option-cote">Cote: ${option.cote.toFixed(2)}</span>
                            <div class="bet-form">
                                <input type="number" class="bet-amount" placeholder="Montant du pari" min="1" required>
                                <button class="bet-btn" data-event-id="${event.id}" data-option-index="${index}">Parier</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            eventsList.appendChild(eventCard);
        });

        userBetEvents.forEach(event => {
            const userBet = userBets.find(bet => bet.eventId === event.id);
            const betOption = event.options[userBet.optionIndex];
            const betCard = document.createElement('div');
            betCard.className = 'event-card my-bet';
            betCard.innerHTML = `
                <h3>${event.title}</h3>
                <p>Votre pari : <strong class="user-bet-label">${betOption.label}</strong></p>
                <p>Montant : <strong>${userBet.amount}</strong> Jetons</p>
            `;
            betsList.appendChild(betCard);
        });
    };

    if (eventsList) {
        eventsList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('bet-btn')) {
                const betForm = e.target.closest('.bet-form');
                const betAmount = betForm.querySelector('.bet-amount').value;
                if (!betAmount || betAmount <= 0) {
                    return showMessage(appMessage, 'Veuillez entrer un montant valide.', 'error');
                }
                const eventId = parseInt(e.target.dataset.eventId);
                const optionIndex = parseInt(e.target.dataset.optionIndex);
                
                try {
                    const response = await fetch('/api/bet', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: user.username, eventId, optionIndex, betAmount: parseFloat(betAmount) })
                    });
                    const result = await response.json();
                    if (response.ok) {
                        user.balance = result.balance;
                        if (!user.bets) user.bets = [];
                        user.bets.push({ eventId, optionIndex, amount: parseFloat(betAmount) });
                        localStorage.setItem('user', JSON.stringify(user));
                        showMessage(appMessage, result.message, 'success');
                        updateUI();
                    } else {
                        showMessage(appMessage, result.error, 'error');
                    }
                } catch (error) {
                    showMessage(appMessage, 'Erreur lors du pari.', 'error');
                }
            }
        });
    }

    const fetchAdminData = async () => {
        const adminEventsList = document.getElementById('admin-events-list');
        const userHistoryList = document.getElementById('user-history-list');

        if (!user || !user.isAdmin) {
            window.location.href = '/';
            return;
        }

        try {
            const responseEvents = await fetch('/api/events');
            const events = await responseEvents.json();
            displayAdminEvents(events);

            const responseHistory = await fetch('/api/admin/history');
            const history = await responseHistory.json();
            displayUserHistory(history);
        } catch (error) {
            console.error('Erreur lors du chargement des données admin:', error);
            showMessage(document.getElementById('admin-message'), 'Erreur de chargement des données admin.', 'error');
        }
    };

    const displayAdminEvents = (events) => {
        const adminEventsList = document.getElementById('admin-events-list');
        if (!adminEventsList) return;

        adminEventsList.innerHTML = '';
        events.forEach(event => {
            const eventCard = document.createElement('div');
            eventCard.className = 'event-card';
            eventCard.innerHTML = `
                <h3>${event.title}</h3>
                <div class="options">
                    ${event.options.map((option, index) => `
                        <button class="close-option-btn" data-event-id="${event.id}" data-option-index="${index}">Clôturer sur "${option.label}" (Cote: ${option.cote})</button>
                    `).join('')}
                </div>
            `;
            adminEventsList.appendChild(eventCard);
        });
    };

    const displayUserHistory = (history) => {
        const userHistoryList = document.getElementById('user-history-list');
        if (!userHistoryList) return;
        
        userHistoryList.innerHTML = '';
        history.forEach(u => {
            const userCard = document.createElement('div');
            userCard.className = 'user-card';
            userCard.innerHTML = `
                <h4>${u.username} <span class="admin-badge">${u.isAdmin ? 'Admin' : 'Utilisateur'}</span></h4>
                <p>Solde actuel : ${u.balance.toFixed(2)} Jetons</p>
            `;
            userHistoryList.appendChild(userCard);
        });
    };

    const createEventForm = document.getElementById('create-event-form');
    if (createEventForm) {
        createEventForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('event-title').value;
            const options = Array.from(document.querySelectorAll('.option-group')).map(group => {
                return {
                    label: group.querySelector('.option-label').value,
                    cote: parseFloat(group.querySelector('.option-cote').value)
                };
            });
            
            try {
                const response = await fetch('/api/admin/create-event', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, options })
                });
                const result = await response.json();
                showMessage(document.getElementById('admin-message'), result.message, 'success');
                createEventForm.reset();
                fetchAdminData();
            } catch (error) {
                showMessage(document.getElementById('admin-message'), 'Erreur lors de la création de l\'événement.', 'error');
            }
        });
    }

    const addOptionBtn = document.getElementById('add-option-btn');
    if (addOptionBtn) {
        addOptionBtn.addEventListener('click', () => {
            const optionsContainer = document.getElementById('options-container');
            const optionIndex = optionsContainer.children.length + 1;
            const newOptionGroup = document.createElement('div');
            newOptionGroup.className = 'option-group';
            newOptionGroup.innerHTML = `
                <input type="text" class="option-label" placeholder="Libellé option ${optionIndex}" required>
                <input type="number" class="option-cote" placeholder="Cote ${optionIndex}" step="0.01" required>
            `;
            optionsContainer.appendChild(newOptionGroup);
        });
    }
    
    if (adminEventsList) {
        adminEventsList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('close-option-btn')) {
                const eventId = parseInt(e.target.dataset.eventId);
                const winningOptionIndex = parseInt(e.target.dataset.optionIndex);
                
                try {
                    const response = await fetch('/api/admin/close-event', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ eventId, winningOptionIndex })
                    });
                    const result = await response.json();
                    showMessage(document.getElementById('admin-message'), result.message, 'success');
                    fetchAdminData();
                } catch (error) {
                    showMessage(document.getElementById('admin-message'), 'Erreur lors de la clôture de l\'événement.', 'error');
                }
            }
        });
    }

    // Charger l'utilisateur depuis le stockage local
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        user = JSON.parse(storedUser);
    }
    window.addEventListener('hashchange', updateUI);
    updateUI();
});