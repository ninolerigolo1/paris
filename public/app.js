document.addEventListener('DOMContentLoaded', () => {
    const authSection = document.getElementById('auth-section');
    const appSection = document.getElementById('app-section');
    const accountSection = document.getElementById('account-section');
    const adminSection = document.getElementById('admin-section');
    const userInfo = document.getElementById('user-info');
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const accountBtn = document.getElementById('account-btn');
    const adminBtn = document.getElementById('admin-btn');
    const authMessage = document.getElementById('auth-message');
    const appMessage = document.getElementById('app-message');
    const eventsList = document.getElementById('events-list');

    let user = null;

    const showMessage = (element, message, type) => {
        element.textContent = message;
        element.className = `message ${type}`;
        setTimeout(() => element.textContent = '', 5000);
    };

    const updateUI = () => {
        if (user) {
            authSection.classList.add('hidden');
            userInfo.classList.remove('hidden');
            document.getElementById('username-display').textContent = user.username;
            document.getElementById('balance-display').textContent = `${user.balance} Jetons`;

            // Afficher le bouton admin si l'utilisateur est admin
            if (user.isAdmin) {
                adminBtn.classList.remove('hidden');
            } else {
                adminBtn.classList.add('hidden');
            }
            
            // Si on est sur la page d'accueil, on affiche l'interface classique
            if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
                appSection.classList.remove('hidden');
                accountSection.classList.add('hidden'); // Masquer par défaut la section du compte
            } else if (window.location.pathname === '/admin.html') {
                adminSection.classList.remove('hidden');
            }
            
            fetchEvents();

        } else {
            authSection.classList.remove('hidden');
            appSection.classList.add('hidden');
            accountSection.classList.add('hidden');
            userInfo.classList.add('hidden');
            if (adminSection) {
                adminSection.classList.add('hidden');
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
                updateUI();
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
            login('/api/login', { username, password });
        });
    }

    if (signupBtn) {
        signupBtn.addEventListener('click', () => {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const adminCode = document.getElementById('admin-code').value;
            login('/api/signup', { username, password, adminCode });
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            user = null;
            localStorage.removeItem('user');
            // Redirection vers la page d'accueil
            if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
                window.location.href = '/';
            }
            updateUI();
        });
    }

    // Gestion du bouton "Mon Compte"
    if (accountBtn) {
        accountBtn.addEventListener('click', () => {
            appSection.classList.add('hidden');
            accountSection.classList.remove('hidden');
            // Afficher les infos du compte
            document.getElementById('account-username').textContent = user.username;
            document.getElementById('account-balance').textContent = user.balance;
        });
    }

    // Gestion du bouton "Admin"
    if (adminBtn) {
        adminBtn.addEventListener('click', () => {
            window.location.href = '/admin.html';
        });
    }

    // Logique de changement de mot de passe
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
            const events = await response.json();
            displayEvents(events);
        } catch (error) {
            console.error('Erreur lors de la récupération des événements:', error);
            showMessage(appMessage, 'Impossible de charger les événements.', 'error');
        }
    };

    const displayEvents = (events) => {
        if (eventsList) {
            eventsList.innerHTML = '';
            events.forEach(event => {
                const eventCard = document.createElement('div');
                eventCard.className = 'event-card';
                eventCard.innerHTML = `
                    <h3>${event.title}</h3>
                    <div class="options">
                        ${event.options.map((option, index) => `
                            <div class="option">
                                <span class="option-label">${option.label}</span>
                                <span class="option-cote">Cote: ${option.cote.toFixed(2)}</span>
                                <div class="bet-form hidden">
                                    <input type="number" class="bet-amount" placeholder="Montant du pari" min="1" required>
                                    <button class="bet-btn" data-event-id="${event.id}" data-option-index="${index}">Parier</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                eventsList.appendChild(eventCard);
            });
        }
    };

    // Charger l'utilisateur depuis le stockage local
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        user = JSON.parse(storedUser);
    }
    updateUI();

    // Logique spécifique à la page Admin
    if (window.location.pathname === '/admin.html') {
        const createEventForm = document.getElementById('create-event-form');
        const adminEventsList = document.getElementById('admin-events-list');
        const addOptionBtn = document.getElementById('add-option-btn');
        const optionsContainer = document.getElementById('options-container');
        const userHistoryList = document.getElementById('user-history-list');

        const fetchAdminData = async () => {
            if (!user || !user.isAdmin) return;
            // Récupérer la liste des événements pour l'admin
            const responseEvents = await fetch('/api/events');
            const events = await responseEvents.json();
            displayAdminEvents(events);

            // Récupérer l'historique des utilisateurs
            const responseHistory = await fetch('/api/admin/history');
            const history = await responseHistory.json();
            displayUserHistory(history);
        };

        const displayAdminEvents = (events) => {
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

        if (addOptionBtn) {
            addOptionBtn.addEventListener('click', () => {
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

        fetchAdminData();
    }
});