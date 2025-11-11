const socket = io();

// Current state
let currentScreen = 'mainMenu';
let currentLobbyCode = null;
let mySocketId = null;
let isHost = false;
let isVotingPhase = false;
let votingTimer = null;
let votingTimeLeft = 20;
let turnTimer = null;
let turnTimeLeft = 10;

// DOM Elements
const screens = {
    mainMenu: document.getElementById('mainMenu'),
    lobbyScreen: document.getElementById('lobbyScreen'),
    gameScreen: document.getElementById('gameScreen'),
    gameOverScreen: document.getElementById('gameOverScreen')
};

const modals = {
    createLobby: document.getElementById('createLobbyModal'),
    joinLobby: document.getElementById('joinLobbyModal')
};

// Utility Functions
function showScreen(screenName) {
    Object.keys(screens).forEach(key => {
        screens[key].classList.remove('active');
    });
    screens[screenName].classList.add('active');
    currentScreen = screenName;
}

function showModal(modalName) {
    modals[modalName].style.display = 'flex';
}

function hideModal(modalName) {
    modals[modalName].style.display = 'none';
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Analytics tracking
let sessionStartTime = Date.now();
let analyticsData = {
    visits: parseInt(localStorage.getItem('visits') || '0') + 1,
    totalTime: parseInt(localStorage.getItem('totalTime') || '0')
};
localStorage.setItem('visits', analyticsData.visits);

// Track session time on page unload
window.addEventListener('beforeunload', () => {
    const sessionTime = Math.floor((Date.now() - sessionStartTime) / 1000);
    analyticsData.totalTime += sessionTime;
    localStorage.setItem('totalTime', analyticsData.totalTime);
});

// Main Menu
document.getElementById('createLobbyBtn').addEventListener('click', () => {
    showModal('createLobby');
});

document.getElementById('joinByCodeBtn').addEventListener('click', () => {
    const modal = document.getElementById('joinByCodeModal');
    modal.style.display = 'flex';
});

document.getElementById('howToPlayBtn').addEventListener('click', () => {
    const modal = document.getElementById('howToPlayModal');
    modal.style.display = 'flex';
});

document.getElementById('howToPlayLobbyBtn').addEventListener('click', () => {
    const modal = document.getElementById('howToPlayModal');
    modal.style.display = 'flex';
});

document.getElementById('closeHowToPlayBtn').addEventListener('click', () => {
    const modal = document.getElementById('howToPlayModal');
    modal.style.display = 'none';
});

document.getElementById('refreshLobbiesBtn').addEventListener('click', () => {
    // Lobbies are automatically updated via socket
    showToast('Refreshing lobbies...', 'info');
});

document.getElementById('cancelCreateBtn').addEventListener('click', () => {
    hideModal('createLobby');
    document.getElementById('createLobbyForm').reset();
});

document.getElementById('cancelJoinBtn').addEventListener('click', () => {
    hideModal('joinLobby');
    document.getElementById('joinLobbyForm').reset();
});

document.getElementById('cancelCodeJoinBtn').addEventListener('click', () => {
    const modal = document.getElementById('joinByCodeModal');
    modal.style.display = 'none';
    document.getElementById('joinByCodeForm').reset();
});

// Create Lobby Form
document.getElementById('createLobbyForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const lobbyName = document.getElementById('lobbyNameInput').value.trim();
    const username = document.getElementById('usernameCreateInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();
    const maxPlayers = document.getElementById('maxPlayersInput').value;

    if (!lobbyName || !username) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    socket.emit('createLobby', { lobbyName, username, password, maxPlayers });
    hideModal('createLobby');
    document.getElementById('createLobbyForm').reset();
});

// Join Lobby Form
document.getElementById('joinLobbyForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const code = document.getElementById('joinLobbyCode').value;
    const username = document.getElementById('usernameJoinInput').value.trim();
    const password = document.getElementById('joinPasswordInput').value.trim();

    if (!username) {
        showToast('Please enter a username', 'error');
        return;
    }

    socket.emit('joinLobby', { code, username, password });
    hideModal('joinLobby');
    document.getElementById('joinLobbyForm').reset();
});

// Join by Code Form
document.getElementById('joinByCodeForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const code = document.getElementById('lobbyCodeInput').value.trim().toUpperCase();
    const username = document.getElementById('usernameCodeInput').value.trim();
    const password = document.getElementById('codePasswordInput').value.trim();

    if (!code || !username) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    // First check if lobby exists and requires password
    socket.emit('checkLobby', { code }, (response) => {
        if (!response.exists) {
            showToast('Lobby not found', 'error');
            return;
        }

        if (response.requiresPassword) {
            document.getElementById('codePasswordGroup').style.display = 'block';
            if (!password) {
                showToast('This lobby requires a password', 'error');
                return;
            }
        }

        socket.emit('joinLobby', { code, username, password });
        const modal = document.getElementById('joinByCodeModal');
        modal.style.display = 'none';
        document.getElementById('joinByCodeForm').reset();
        document.getElementById('codePasswordGroup').style.display = 'none';
    });
});

// Lobby Actions
document.getElementById('leaveLobbyBtn').addEventListener('click', () => {
    if (currentLobbyCode) {
        socket.disconnect();
        socket.connect();
        currentLobbyCode = null;
        isHost = false;
        showScreen('mainMenu');
        showToast('Left lobby', 'info');
    }
});

document.getElementById('startGameBtn').addEventListener('click', () => {
    socket.emit('startGame');
});

// Game Actions
document.getElementById('sendMessageBtn').addEventListener('click', () => {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();

    if (!message) {
        showToast('Please enter a message', 'error');
        return;
    }

    socket.emit('submitMessage', { message });
    messageInput.value = '';
});

document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('sendMessageBtn').click();
    }
});

// Socket Event Handlers
socket.on('connect', () => {
    mySocketId = socket.id;
});

socket.on('lobbyList', (lobbies) => {
    const lobbiesList = document.getElementById('lobbiesList');

    if (lobbies.length === 0) {
        lobbiesList.innerHTML = '<p class="no-lobbies">No public lobbies available. Create one!</p>';
        return;
    }

    lobbiesList.innerHTML = lobbies.map(lobby => `
        <div class="lobby-item">
            <div class="lobby-info">
                <h3>${escapeHtml(lobby.name)}</h3>
                <p>Host: ${escapeHtml(lobby.host)}</p>
                <p>Players: ${lobby.players}/${lobby.maxPlayers}</p>
                <p>Code: ${lobby.code}</p>
            </div>
            <button class="btn btn-primary join-lobby-btn" data-code="${lobby.code}" data-name="${escapeHtml(lobby.name)}">Join</button>
        </div>
    `).join('');

    // Add event listeners to join buttons
    document.querySelectorAll('.join-lobby-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const code = btn.dataset.code;
            const name = btn.dataset.name;
            document.getElementById('joinLobbyCode').value = code;
            document.getElementById('joinLobbyName').textContent = name;
            showModal('joinLobby');
        });
    });
});

socket.on('lobbyCreated', ({ code, lobby }) => {
    currentLobbyCode = code;
    isHost = true;
    updateLobbyScreen(lobby);
    showScreen('lobbyScreen');
    showToast('Lobby created!', 'success');
});

socket.on('lobbyJoined', ({ code, lobby }) => {
    currentLobbyCode = code;
    updateLobbyScreen(lobby);
    showScreen('lobbyScreen');
    showToast('Joined lobby!', 'success');
});

socket.on('playerJoined', ({ players }) => {
    updatePlayersList(players);
    showToast('A player joined', 'info');
});

socket.on('playerLeft', ({ players }) => {
    updatePlayersList(players);
    showToast('A player left', 'info');
});

socket.on('kicked', () => {
    currentLobbyCode = null;
    isHost = false;
    showScreen('mainMenu');
    showToast('You were kicked from the lobby', 'error');
});

socket.on('gameStarted', ({ isImposter, card, currentTurn, round, players }) => {
    showScreen('gameScreen');
    document.getElementById('currentRound').textContent = round;

    // Show card or imposter message
    if (isImposter) {
        document.getElementById('cardDisplay').style.display = 'none';
        document.getElementById('imposterDisplay').style.display = 'block';
    } else {
        document.getElementById('cardDisplay').style.display = 'flex';
        document.getElementById('imposterDisplay').style.display = 'none';
        document.getElementById('cardImage').src = `/cards/${card.image}`;
        document.getElementById('cardName').textContent = card.name;
    }

    // Update players list
    const gamePlayersList = document.getElementById('gamePlayersList');
    gamePlayersList.innerHTML = players.map(p => `
        <div class="game-player-item">
            <span>${p.isHost ? '👑 ' : ''}${escapeHtml(p.username)}</span>
            <span class="player-score">${p.score} pts</span>
        </div>
    `).join('');

    // Clear messages
    document.getElementById('messagesList').innerHTML = '';

    // Update turn
    updateTurnDisplay(currentTurn, players);
    showToast('Game started!', 'success');
});

socket.on('messageReceived', ({ messages, currentTurn, round }) => {
    document.getElementById('currentRound').textContent = round;

    // Update messages list
    const messagesList = document.getElementById('messagesList');
    messagesList.innerHTML = messages.map(m => `
        <div class="message-item">
            <strong>${escapeHtml(m.username)}:</strong> ${escapeHtml(m.message)}
            <span class="round-badge">R${m.round}</span>
        </div>
    `).join('');

    // Scroll to bottom
    messagesList.scrollTop = messagesList.scrollHeight;

    // Update turn
    const players = Array.from(document.querySelectorAll('.game-player-item')).map(el => ({
        username: el.querySelector('span').textContent.replace('👑 ', '')
    }));
    updateTurnDisplay(currentTurn, players);
});

socket.on('votingPhase', ({ players }) => {
    isVotingPhase = true;
    votingTimeLeft = 20;

    // Hide message input
    document.getElementById('messageInputSection').style.display = 'none';

    // Update turn info
    document.getElementById('turnText').textContent = '🗳️ Vote for the imposter!';
    document.getElementById('turnInfo').classList.remove('my-turn');

    // Show voting timer
    const votingTimer = document.getElementById('votingTimer');
    votingTimer.style.display = 'block';

    // Start countdown
    startVotingTimer();

    // Update player list to enable voting
    updatePlayersListForVoting(players);

    showToast('Time to vote! Click a player name.', 'info');
});

socket.on('voteUpdate', ({ votes, playersVoted }) => {
    updateVoteCounts(votes, playersVoted);
});

socket.on('voteReceived', () => {
    showToast('Vote recorded', 'success');
});

socket.on('gameOver', ({ imposterWon, imposterUsername, votedOutUsername, card, players }) => {
    // Clean up voting state
    isVotingPhase = false;
    if (votingTimer) {
        clearInterval(votingTimer);
        votingTimer = null;
    }
    document.getElementById('votingTimer').style.display = 'none';

    showScreen('gameOverScreen');

    const gameOverContent = document.getElementById('gameOverContent');

    if (imposterWon) {
        gameOverContent.innerHTML = `
            <h2 class="imposter-won">🎭 IMPOSTER WINS!</h2>
            <p class="result-text">${escapeHtml(imposterUsername)} was the imposter and survived!</p>
            <p class="result-text">${escapeHtml(votedOutUsername)} was voted out.</p>
        `;
    } else {
        gameOverContent.innerHTML = `
            <h2 class="imposter-caught">✅ IMPOSTER CAUGHT!</h2>
            <p class="result-text">${escapeHtml(imposterUsername)} was the imposter and got caught!</p>
        `;
    }

    // Show the card
    document.getElementById('revealCardImage').src = `/cards/${card.image}`;
    document.getElementById('revealCardName').textContent = card.name;

    // Show scores
    const finalScoresList = document.getElementById('finalScoresList');
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    finalScoresList.innerHTML = sortedPlayers.map(p => `
        <div class="score-item ${p.wasImposter ? 'was-imposter' : ''}">
            <span>${p.isHost ? '👑 ' : ''}${escapeHtml(p.username)} ${p.wasImposter ? '🎭' : ''}</span>
            <span class="score-value">${p.score} pts</span>
        </div>
    `).join('');
});

socket.on('backToLobby', ({ players }) => {
    // Reset voting state
    isVotingPhase = false;
    votingTimeLeft = 20;

    showScreen('lobbyScreen');
    updatePlayersList(players);
    showToast('Ready for next round!', 'info');
});

socket.on('error', ({ message }) => {
    showToast(message, 'error');
});

// Helper Functions
function updateLobbyScreen(lobby) {
    document.getElementById('lobbyTitle').textContent = lobby.name;
    document.getElementById('lobbyCode').textContent = `Code: ${lobby.code}`;
    document.getElementById('maxPlayerCount').textContent = lobby.maxPlayers;
    updatePlayersList(lobby.players);
}

function updatePlayersList(players) {
    const playersList = document.getElementById('playersList');
    const playerCount = document.getElementById('playerCount');

    playerCount.textContent = players.length;

    const myPlayer = players.find(p => p.socketId === mySocketId);
    isHost = myPlayer ? myPlayer.isHost : false;

    playersList.innerHTML = players.map(p => {
        const isMe = p.socketId === mySocketId;
        const showKickBtn = isHost && !isMe;

        return `
            <div class="player-item">
                <span class="player-name">
                    ${p.isHost ? '👑 ' : ''}${escapeHtml(p.username)}${isMe ? ' (You)' : ''}
                </span>
                <span class="player-score">${p.score} pts</span>
                ${showKickBtn ? `<button class="kick-btn" data-socket-id="${p.socketId}">✕</button>` : ''}
            </div>
        `;
    }).join('');

    // Show start button only for host
    const startGameBtn = document.getElementById('startGameBtn');
    if (isHost) {
        startGameBtn.style.display = 'block';
    } else {
        startGameBtn.style.display = 'none';
    }

    // Add kick button listeners
    if (isHost) {
        document.querySelectorAll('.kick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetSocketId = btn.dataset.socketId;
                socket.emit('kickPlayer', { targetSocketId });
            });
        });
    }
}

function startTurnTimer() {
    // Clear any existing timer
    if (turnTimer) clearInterval(turnTimer);

    turnTimeLeft = 10;

    turnTimer = setInterval(() => {
        turnTimeLeft--;

        const turnText = document.getElementById('turnText');
        const currentText = turnText.textContent.split('(')[0].trim();
        turnText.textContent = `${currentText} (${turnTimeLeft}s)`;

        if (turnTimeLeft <= 0) {
            clearInterval(turnTimer);
        }
    }, 1000);
}

function updateTurnDisplay(currentTurn, players) {
    const isMyTurn = currentTurn === mySocketId;
    const currentPlayer = players ? players.find(p => p.socketId === currentTurn) : null;

    const turnInfo = document.getElementById('turnInfo');
    const messageInputSection = document.getElementById('messageInputSection');
    const turnText = document.getElementById('turnText');

    // Start turn timer
    startTurnTimer();

    if (isMyTurn) {
        turnText.textContent = 'Your turn! Type your message: (10s)';
        turnInfo.classList.add('my-turn');
        messageInputSection.style.display = 'flex';
    } else {
        const playerName = currentPlayer ? currentPlayer.username : 'Unknown';
        turnText.textContent = `Waiting for ${playerName}'s message... (10s)`;
        turnInfo.classList.remove('my-turn');
        messageInputSection.style.display = 'none';
    }
}

function startVotingTimer() {
    const timerElement = document.getElementById('timerSeconds');

    if (votingTimer) clearInterval(votingTimer);

    votingTimer = setInterval(() => {
        votingTimeLeft--;
        timerElement.textContent = votingTimeLeft;

        if (votingTimeLeft <= 0) {
            clearInterval(votingTimer);
            // Time's up - server will handle this
        }
    }, 1000);
}

let selectedVoteTarget = null;

function updatePlayersListForVoting(players) {
    const gamePlayersList = document.getElementById('gamePlayersList');

    gamePlayersList.innerHTML = players.map(p => {
        const isMe = p.socketId === mySocketId;
        return `
            <div class="game-player-item voting-mode" data-socket-id="${p.socketId}">
                <div class="player-info">
                    <span>${escapeHtml(p.username)}${isMe ? ' (You)' : ''}</span>
                </div>
                <div class="player-status">
                    <span class="vote-count" style="display: none;">0</span>
                    <button class="confirm-vote-btn" style="display: none;">✓</button>
                </div>
            </div>
        `;
    }).join('');

    // Add click listeners for selecting a player
    document.querySelectorAll('.game-player-item').forEach(item => {
        const playerInfo = item.querySelector('.player-info');
        const confirmBtn = item.querySelector('.confirm-vote-btn');

        playerInfo.addEventListener('click', () => {
            const targetSocketId = item.dataset.socketId;

            // Remove selection from all players
            document.querySelectorAll('.game-player-item').forEach(i => {
                i.classList.remove('vote-selected');
                i.querySelector('.confirm-vote-btn').style.display = 'none';
            });

            // Select this player
            item.classList.add('vote-selected');
            confirmBtn.style.display = 'inline-block';
            selectedVoteTarget = targetSocketId;
        });

        // Confirm vote button
        confirmBtn.addEventListener('click', (e) => {
            e.stopPropagation();

            if (!selectedVoteTarget) return;

            const username = item.querySelector('.player-info span').textContent;

            // Submit vote
            socket.emit('submitVote', { targetSocketId: selectedVoteTarget });

            // Add visual confirmation
            item.classList.remove('vote-selected');
            item.classList.add('my-vote');

            // Disable further voting
            document.querySelectorAll('.game-player-item').forEach(i => {
                i.style.pointerEvents = 'none';
            });

            showToast(`Voted for ${username}`, 'success');
        });
    });
}

function updateVoteCounts(votes, playersVoted) {
    // Update vote counts
    document.querySelectorAll('.game-player-item').forEach(item => {
        const socketId = item.dataset.socketId;
        const voteCount = votes[socketId] || 0;
        const voteCountElement = item.querySelector('.vote-count');

        if (voteCount > 0) {
            voteCountElement.textContent = voteCount;
            voteCountElement.style.display = 'inline-block';
        } else {
            voteCountElement.style.display = 'none';
        }
    });

    // Update who has voted (checkmarks)
    playersVoted.forEach(socketId => {
        const playerItem = document.querySelector(`.game-player-item[data-socket-id="${socketId}"]`);
        if (playerItem) {
            const playerStatus = playerItem.querySelector('.player-status');
            if (!playerStatus.querySelector('.has-voted-badge')) {
                const badge = document.createElement('span');
                badge.className = 'has-voted-badge';
                badge.textContent = '✓';
                playerStatus.insertBefore(badge, playerStatus.firstChild);
            }
        }
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
