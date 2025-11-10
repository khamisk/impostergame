const socket = io();

// Current state
let currentScreen = 'mainMenu';
let currentLobbyCode = null;
let mySocketId = null;
let isHost = false;

// DOM Elements
const screens = {
    mainMenu: document.getElementById('mainMenu'),
    lobbyScreen: document.getElementById('lobbyScreen'),
    gameScreen: document.getElementById('gameScreen'),
    votingScreen: document.getElementById('votingScreen'),
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

// Main Menu
document.getElementById('createLobbyBtn').addEventListener('click', () => {
    showModal('createLobby');
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
    showScreen('votingScreen');

    const votingPlayersList = document.getElementById('votingPlayersList');
    votingPlayersList.innerHTML = players.map(p => `
        <button class="vote-btn" data-socket-id="${p.socketId}">
            ${escapeHtml(p.username)}
        </button>
    `).join('');

    // Add vote button listeners
    document.querySelectorAll('.vote-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetSocketId = btn.dataset.socketId;

            // Show confirmation
            const confirmVote = confirm(`Vote for ${btn.textContent.trim()}?`);
            if (confirmVote) {
                socket.emit('submitVote', { targetSocketId });
                btn.classList.add('voted');
                btn.disabled = true;
                document.querySelectorAll('.vote-btn').forEach(b => b.disabled = true);
                showToast('Vote submitted!', 'success');
            }
        });
    });

    showToast('Time to vote!', 'info');
});

socket.on('voteReceived', () => {
    showToast('Vote recorded', 'success');
});

socket.on('gameOver', ({ imposterWon, imposterUsername, votedOutUsername, card, players }) => {
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

function updateTurnDisplay(currentTurn, players) {
    const isMyTurn = currentTurn === mySocketId;
    const currentPlayer = players ? players.find(p => p.socketId === currentTurn) : null;

    const turnInfo = document.getElementById('turnInfo');
    const messageInputSection = document.getElementById('messageInputSection');
    const turnText = document.getElementById('turnText');

    if (isMyTurn) {
        turnText.textContent = 'Your turn! Type your message:';
        turnInfo.classList.add('my-turn');
        messageInputSection.style.display = 'flex';
    } else {
        const playerName = currentPlayer ? currentPlayer.username : 'Unknown';
        turnText.textContent = `Waiting for ${playerName}'s message...`;
        turnInfo.classList.remove('my-turn');
        messageInputSection.style.display = 'none';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
