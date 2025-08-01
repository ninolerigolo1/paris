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
    const leaderboardList = document.getElementById('leaderboard-list');
    const blockedOverlay = document.getElementById('blocked-overlay');

    // Boutons de navigation
    const loginBtn = document.getElementById('login-btn');
    const showSignupBtn = document.getElementById('show-signup-btn');
    const showLoginBtn = document.getElementById('show-login-btn');
    const logoutBtnInAccount = document.getElementById('logout-btn-in-account');
    const homeBtn = document.getElementById('home-btn');
    const accountBtn = document.getElementById('account-btn');
    const adminBtn = document.getElementById('admin-btn');
    
    // Autres éléments
    const signupForm = document.getElementById('signup-form');
    const eventsList = document.getElementById('events-list');
    const betsList = document.getElementById('bets-list');
    const promoteAdminForm = document.getElementById('promote-admin-form');
    const promoteMessage = document.getElementById('promote-message');
    const promoteAdminContainer = document.getElementById('promote-admin-container');
    const adminEventsList = document.getElementById('admin-events-list');
    const userListAdmin = document.getElementById('user-list-admin');
    const adminHistorySection = document.getElementById('admin-history-section');
    const toggleHistoryBtn = document.getElementById('toggle-history-btn');
    const adminEventsHistoryList = document.getElementById('admin-events-history-list');

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
        document.querySelectorAll('section').forEach(section => section.classList.add('hidden'));
        if (userInfo) userInfo.classList.add('hidden');
        if (promoteAdminContainer) promoteAdminContainer.classList.add('hidden');
        if (leaderboardList) leaderboardList.innerHTML = '';
        if (adminHistorySection) adminHistorySection.classList.add('hidden');
        
        // Cacher tous les boutons de nav au départ
        if (adminBtn) adminBtn.classList.add('hidden');
        if (accountBtn) accountBtn.classList.add('hidden');

        if (user) {
            // Afficher les infos utilisateur et les boutons de navigation pour les utilisateurs connectés
            userInfo.classList.remove('hidden');
            if (accountBtn) accountBtn.classList.remove('hidden');
            document.getElementById('username-display').textContent = user.username;
            document.getElementById('balance-display').textContent = `${user.balance} Yoyo`;
            console.log(`Mise à jour du solde affiché : ${user.balance} Yoyo`);

            if (user.isAdmin) {
                if (adminBtn) adminBtn.classList.remove('hidden');
            }

            // Gérer les différentes pages
            if (path.includes('/admin.html')) {
                if (user.isAdmin) {
                    if (adminSection) adminSection.classList.remove('hidden');
                    fetchAdminData();
                } else {
                    window.location.href = '/';
                }
            } else if (hash === '#account') {
                if (accountSection) accountSection.classList.remove('hidden');
                document.getElementById('account-username').textContent = user.username;
                document.getElementById('account-balance').textContent = user.balance;
                if (!user.isAdmin) {
                    if (promoteAdminContainer) promoteAdminContainer.classList.remove('hidden');
                }
            } else {
                if (appSection) appSection.classList.remove('hidden');
                if (myBetsSection) myBetsSection.classList.remove('hidden');
                fetchEvents();
                fetchLeaderboard();
            }
        } else {
            // Afficher les sections d'authentification pour les utilisateurs non connectés
            if (path.includes('/admin.html')) {
                window.location.href = '/';
            }
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
                    body: JSON.stringify({ username, password }),
                });
                const result = await response.json();
                if (response.ok) {
                    showMessage(signupMessage, result.message + " Vous pouvez maintenant vous connecter.", 'success');
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

    const logout = () => {
        user = null;
        localStorage.removeItem('user');
        if (window.location.pathname !== '/') {
            window.location.href = '/';
        } else {
            updateUI();
        }
    };

    if (logoutBtnInAccount) {
        logoutBtnInAccount.addEventListener('click', logout);
    }
    
    if (homeBtn) {
        homeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.location.pathname === '/') {
                window.location.hash = '';
                updateUI();
            } else {
                window.location.href = '/';
            }
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

    if (promoteAdminForm) {
        promoteAdminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = document.getElementById('admin-code-input').value;
            
            try {
                const response = await fetch('/api/promote-to-admin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: user.username, code }),
                });
                const result = await response.json();
                if (response.ok) {
                    user = result.user;
                    localStorage.setItem('user', JSON.stringify(user));
                    showMessage(promoteMessage, result.message, 'success');
                    promoteAdminForm.reset();
                    updateUI();
                } else {
                    showMessage(promoteMessage, result.error, 'error');
                }
            } catch (error) {
                showMessage(promoteMessage, 'Erreur de connexion au serveur.', 'error');
            }
        });
    }

    const fetchLeaderboard = async () => {
        if (!leaderboardList) return;
        try {
            const response = await fetch('/api/leaderboard');
            const leaderboard = await response.json();
            leaderboardList.innerHTML = '';
            if (leaderboard.length === 0) {
                leaderboardList.innerHTML = '<li>Pas de joueurs enregistrés.</li>';
                return;
            }
            leaderboard.forEach((player, index) => {
                const rank = index + 1;
                const li = document.createElement('li');
                li.innerHTML = `<span>${rank}. ${player.username}</span><span>${player.balance} Yoyo</span>`;
                leaderboardList.appendChild(li);
            });
        } catch (error) {
            console.error('Erreur lors de la récupération du classement:', error);
            leaderboardList.innerHTML = '<li>Erreur de chargement du classement.</li>';
        }
    };

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
        
        // Show/hide blocked overlay
        if (user && user.isBlocked) {
            eventsList.classList.add('hidden');
            if (blockedOverlay) blockedOverlay.classList.remove('hidden');
        } else {
            eventsList.classList.remove('hidden');
            if (blockedOverlay) blockedOverlay.classList.add('hidden');
        }

        eventsList.innerHTML = '';
        betsList.innerHTML = '';
        const userBets = user.bets || [];
        const activeEvents = events.filter(event => !event.isClosed && !userBets.some(bet => bet.eventId === event.id));
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
                <p>Montant : <strong>${userBet.amount}</strong> Yoyo</p>
            `;
            betsList.appendChild(betCard);
        });
    };

    if (eventsList) {
        eventsList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('bet-btn')) {
                const betForm = e.target.closest('.bet-form');
                const betAmount = parseInt(betForm.querySelector('.bet-amount').value);
                if (!betAmount || betAmount <= 0) {
                    return showMessage(appMessage, 'Veuillez entrer un montant valide.', 'error');
                }
                const eventId = parseInt(e.target.dataset.eventId);
                const optionIndex = parseInt(e.target.dataset.optionIndex);
                
                try {
                    const response = await fetch('/api/bet', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: user.username, eventId, optionIndex, betAmount })
                    });
                    const result = await response.json();
                    if (response.ok) {
                        // Mettre à jour l'utilisateur avec les données du serveur
                        user = result.user;
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
        if (!user || !user.isAdmin) {
            window.location.href = '/';
            return;
        }

        try {
            const responseEvents = await fetch('/api/events');
            const events = await responseEvents.json();
            displayAdminEvents(events.filter(event => !event.isClosed));

            const responseUsers = await fetch('/api/admin/user-list');
            const users = await responseUsers.json();
            displayUserListAdmin(users);
        } catch (error) {
            console.error('Erreur lors du chargement des données admin:', error);
            showMessage(document.getElementById('admin-message'), 'Erreur de chargement des données admin.', 'error');
        }
    };
    
    const fetchAdminHistory = async () => {
        if (!user || !user.isAdmin) return;
        try {
            const response = await fetch('/api/admin/events-history');
            const history = await response.json();
            displayEventsHistory(history);
        } catch (error) {
            console.error('Erreur lors du chargement de l\'historique des paris:', error);
            showMessage(document.getElementById('admin-message'), 'Erreur de chargement de l\'historique.', 'error');
        }
    };

    const displayAdminEvents = (events) => {
        if (!adminEventsList) return;

        adminEventsList.innerHTML = '';
        if (events.length === 0) {
            adminEventsList.innerHTML = '<p>Aucun événement ouvert à clôturer.</p>';
            return;
        }

        events.forEach(event => {
            const eventCard = document.createElement('div');
            eventCard.className = 'event-card';
            eventCard.innerHTML = `
                <h3>${event.title}</h3>
                <div class="options">
                    ${event.options.map((option, index) => `
                        <button class="action-btn close-option-btn" data-event-id="${event.id}" data-option-index="${index}">Clôturer sur "${option.label}" (Cote: ${option.cote ? option.cote.toFixed(2) : '??'})</button>
                    `).join('')}
                </div>
            `;
            adminEventsList.appendChild(eventCard);
        });
    };

    const displayUserListAdmin = (users) => {
        if (!userListAdmin) return;
        
        userListAdmin.innerHTML = '';
        users.forEach(u => {
            const userCard = document.createElement('div');
            userCard.className = 'user-card';
            userCard.innerHTML = `
                <div class="user-info-admin">
                    <h4>${u.username} <span class="admin-badge">${u.isAdmin ? 'Admin' : 'Utilisateur'}</span></h4>
                    <p>Solde actuel : ${u.balance} Yoyo</p>
                </div>
                ${u.isAdmin ? '' : `<button class="block-btn ${u.isBlocked ? 'blocked' : ''}" data-username="${u.username}">
                    ${u.isBlocked ? 'Débloquer' : 'Bloquer'}
                </button>`}
            `;
            userListAdmin.appendChild(userCard);
        });
    };
    
    const displayEventsHistory = (history) => {
        if (!adminEventsHistoryList) return;

        adminEventsHistoryList.innerHTML = '';
        if (history.length === 0) {
            adminEventsHistoryList.innerHTML = '<p>Aucun pari n\'a encore été clôturé.</p>';
            return;
        }

        history.forEach(event => {
            const eventCard = document.createElement('div');
            eventCard.className = 'event-card';
            eventCard.innerHTML = `
                <h3>${event.title}</h3>
                <p>Option gagnante : <strong>${event.options[event.winningOptionIndex].label}</strong> (Cote: ${event.options[event.winningOptionIndex].cote.toFixed(2)})</p>
                <h4>Participants :</h4>
                <ul class="bet-history-list">
                    ${event.options.map(option =>
                        option.bets.map(bet => `
                            <li class="${bet.isWinner ? 'winner' : 'loser'}">
                                <span>${bet.username}</span> a parié <strong>${bet.betAmount} Yoyo</strong> sur "${bet.betOption}" (Cote: ${bet.betCote.toFixed(2)})
                                <span class="result">${bet.isWinner ? `Gains: +${bet.winnings}` : `Perte: ${bet.winnings}`}</span>
                            </li>
                        `).join('')
                    ).join('')}
                </ul>
            `;
            adminEventsHistoryList.appendChild(eventCard);
        });
    };

    const createEventForm = document.getElementById('create-event-form');
    if (createEventForm) {
        createEventForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('event-title').value;
            const options = Array.from(document.querySelectorAll('.option-group')).map(group => {
                return {
                    label: group.querySelector('.option-label').value
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
            const newOptionGroup = document.createElement('div');
            newOptionGroup.className = 'option-group';
            newOptionGroup.innerHTML = `
                <input type="text" class="option-label" placeholder="Libellé option" required>
            `;
            optionsContainer.appendChild(newOptionGroup);
        });
    }
    
    if (adminEventsList) {
        adminEventsList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('close-option-btn')) {
                const eventId = parseInt(e.target.dataset.eventId);
                const winningOptionIndex = parseInt(e.target.dataset.option-index);
                
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
    
    if (userListAdmin) {
        userListAdmin.addEventListener('click', async (e) => {
            if (e.target.classList.contains('block-btn')) {
                const username = e.target.dataset.username;
                try {
                    const response = await fetch('/api/admin/block-user', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username })
                    });
                    const result = await response.json();
                    showMessage(document.getElementById('admin-message'), result.message, 'success');
                    fetchAdminData(); // Refresh the list
                } catch (error) {
                    showMessage(document.getElementById('admin-message'), 'Er