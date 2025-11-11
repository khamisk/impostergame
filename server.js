require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// Configure Socket.io with CORS for Railway
const io = socketIo(server, {
    cors: {
        origin: "*", // Allow all origins (you can restrict this to your Railway domain later)
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'] // Support both for Railway
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Health check endpoint for Railway
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Admin dashboard
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Analytics System (Admin Only)
const ANALYTICS_FILE = path.join(__dirname, 'analytics.json');
const activeSessions = new Map();

function loadAnalytics() {
    try {
        if (fs.existsSync(ANALYTICS_FILE)) {
            return JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf8'));
        }
    } catch (err) {
        console.error('Failed to load analytics:', err);
    }
    return {
        totalVisits: 0,
        totalSessionTimeMs: 0,
        sessions: []
    };
}

function saveAnalytics(data) {
    try {
        fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Failed to save analytics:', err);
    }
}

let analytics = loadAnalytics();

// Admin authentication middleware
function checkAdminToken(req, res, next) {
    const token = req.get('x-admin-token') || req.query.token || '';
    const adminToken = process.env.ADMIN_TOKEN || 'default_admin_token_123';

    console.log('=== Token Validation ===');
    console.log('Received token length:', token.length);
    console.log('Received token starts with:', token.substring(0, 10));
    console.log('Expected token length:', adminToken.length);
    console.log('Expected token starts with:', adminToken.substring(0, 10));
    console.log('Tokens match:', token === adminToken);
    console.log('========================');

    if (token !== adminToken) {
        return res.status(401).json({ error: 'Unauthorized - Invalid admin token' });
    }
    next();
}

// Admin Analytics Endpoints
app.get('/admin/analytics', checkAdminToken, (req, res) => {
    const sessions = analytics.sessions || [];
    const activeSess = Array.from(activeSessions.values()).map(s => ({
        socketId: s.socketId,
        startTime: new Date(s.start).toISOString(),
        duration: Math.round((Date.now() - s.start) / 1000) + 's',
        ip: s.ip,
        userAgent: s.userAgent
    }));

    const totalSessions = sessions.length;
    const avgTimeMs = totalSessions ? Math.round((analytics.totalSessionTimeMs || 0) / totalSessions) : 0;

    // Calculate unique IPs (include both completed and active sessions)
    const allIPs = new Set([
        ...sessions.map(s => s.ip),
        ...Array.from(activeSessions.values()).map(s => s.ip)
    ]);
    const uniqueIPs = allIPs.size;

    // User agent breakdown (include both completed and active sessions)
    const allSessions = [...sessions, ...Array.from(activeSessions.values())];
    const browserCounts = {};
    allSessions.forEach(s => {
        const ua = s.userAgent || 'unknown';
        const browser = ua.includes('Chrome') && !ua.includes('Edge') ? 'Chrome' :
            ua.includes('Firefox') ? 'Firefox' :
                ua.includes('Safari') && !ua.includes('Chrome') ? 'Safari' :
                    ua.includes('Edge') || ua.includes('Edg/') ? 'Edge' : 'Other';
        browserCounts[browser] = (browserCounts[browser] || 0) + 1;
    });

    // Platform breakdown (include both completed and active sessions)
    const platformCounts = {};
    allSessions.forEach(s => {
        const ua = s.userAgent || 'unknown';
        const platform = ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone') ? 'Mobile' :
            ua.includes('Windows') ? 'Windows' :
                ua.includes('Mac') && !ua.includes('iPhone') ? 'Mac' :
                    ua.includes('Linux') && !ua.includes('Android') ? 'Linux' : 'Other';
        platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    });

    res.json({
        totalVisits: analytics.totalVisits || 0,
        totalSessions: totalSessions,
        uniqueVisitors: uniqueIPs,
        avgSessionTimeMs: avgTimeMs,
        avgSessionTimeReadable: `${Math.floor(avgTimeMs / 60000)}m ${Math.floor((avgTimeMs % 60000) / 1000)}s`,
        totalTimeMs: analytics.totalSessionTimeMs || 0,
        browsers: browserCounts,
        platforms: platformCounts,
        activeSessions: activeSess,
        activeCount: activeSess.length
    });
});

app.get('/admin/analytics/sessions', checkAdminToken, (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    const sessions = (analytics.sessions || []).slice(-limit).reverse().map(s => ({
        socketId: s.socketId,
        startTime: new Date(s.start).toISOString(),
        endTime: new Date(s.end).toISOString(),
        durationMs: s.durationMs,
        durationReadable: `${Math.floor(s.durationMs / 60000)}m ${Math.floor((s.durationMs % 60000) / 1000)}s`,
        ip: s.ip,
        userAgent: s.userAgent
    }));

    res.json({ sessions, total: analytics.sessions?.length || 0 });
});

app.get('/admin/analytics/download', checkAdminToken, (req, res) => {
    res.download(ANALYTICS_FILE, 'analytics.json');
});

app.post('/admin/analytics/clear', checkAdminToken, (req, res) => {
    analytics = { totalVisits: 0, totalSessionTimeMs: 0, sessions: [] };
    saveAnalytics(analytics);
    res.json({ success: true, message: 'Analytics cleared' });
});

// Game state
const lobbies = new Map();
const players = new Map(); // socketId -> player info

// Card data - All Clash Royale cards
const CARDS = [
    // Troops
    { name: 'Archers', image: 'archers.png' },
    { name: 'Archer Queen', image: 'archer-queen.png' },
    { name: 'Baby Dragon', image: 'baby-dragon.png' },
    { name: 'Balloon', image: 'balloon.png' },
    { name: 'Bandit', image: 'bandit.png' },
    { name: 'Barbarians', image: 'barbarians.png' },
    { name: 'Bats', image: 'bats.png' },
    { name: 'Battle Healer', image: 'battle-healer.png' },
    { name: 'Battle Ram', image: 'battle-ram.png' },
    { name: 'Berserker', image: 'berserker.png' },
    { name: 'Bomber', image: 'bomber.png' },
    { name: 'Boss Bandit', image: 'boss-bandit.png' },
    { name: 'Bowler', image: 'bowler.png' },
    { name: 'Cannon Cart', image: 'cannon-cart.png' },
    { name: 'Dark Prince', image: 'dark-prince.png' },
    { name: 'Dart Goblin', image: 'dart-goblin.png' },
    { name: 'Electro Dragon', image: 'electro-dragon.png' },
    { name: 'Electro Giant', image: 'electro-giant.png' },
    { name: 'Electro Spirit', image: 'electro-spirit.png' },
    { name: 'Electro Wizard', image: 'electro-wizard.png' },
    { name: 'Elite Barbarians', image: 'elite-barbarians.png' },
    { name: 'Elixir Golem', image: 'elixir-golem.png' },
    { name: 'Executioner', image: 'executioner.png' },
    { name: 'Firecracker', image: 'firecracker.png' },
    { name: 'Fire Spirit', image: 'fire-spirit.png' },
    { name: 'Fisherman', image: 'fisherman.png' },
    { name: 'Flying Machine', image: 'flying-machine.png' },
    { name: 'Furnace', image: 'furnace.png' },
    { name: 'Giant', image: 'giant.png' },
    { name: 'Giant Skeleton', image: 'giant-skeleton.png' },
    { name: 'Goblin Gang', image: 'goblin-gang.png' },
    { name: 'Goblin Demolisher', image: 'goblin-demolisher.png' },
    { name: 'Goblin Giant', image: 'goblin-giant.png' },
    { name: 'Goblin Machine', image: 'goblin-machine.png' },
    { name: 'Goblins', image: 'goblins.png' },
    { name: 'Goblinstein', image: 'goblinstein.png' },
    { name: 'Golden Knight', image: 'golden-knight.png' },
    { name: 'Golem', image: 'golem.png' },
    { name: 'Guards', image: 'guards.png' },
    { name: 'Hog Rider', image: 'hog-rider.png' },
    { name: 'Hunter', image: 'hunter.png' },
    { name: 'Heal Spirit', image: 'heal-spirit.png' },
    { name: 'Ice Golem', image: 'ice-golem.png' },
    { name: 'Ice Spirit', image: 'ice-spirit.png' },
    { name: 'Ice Wizard', image: 'ice-wizard.png' },
    { name: 'Inferno Dragon', image: 'inferno-dragon.png' },
    { name: 'Knight', image: 'knight.png' },
    { name: 'Lava Hound', image: 'lava-hound.png' },
    { name: 'Little Prince', image: 'little-prince.png' },
    { name: 'Lumberjack', image: 'lumberjack.png' },
    { name: 'Magic Archer', image: 'magic-archer.png' },
    { name: 'Mega Knight', image: 'mega-knight.png' },
    { name: 'Mega Minion', image: 'mega-minion.png' },
    { name: 'Mighty Miner', image: 'mighty-miner.png' },
    { name: 'Miner', image: 'miner.png' },
    { name: 'Mini Pekka', image: 'mini-pekka.png' },
    { name: 'Minion Horde', image: 'minion-horde.png' },
    { name: 'Minions', image: 'minions.png' },
    { name: 'Monk', image: 'monk.png' },
    { name: 'Mother Witch', image: 'mother-witch.png' },
    { name: 'Musketeer', image: 'musketeer.png' },
    { name: 'Night Witch', image: 'night-witch.png' },
    { name: 'Pekka', image: 'pekka.png' },
    { name: 'Phoenix', image: 'phoenix.png' },
    { name: 'Prince', image: 'prince.png' },
    { name: 'Princess', image: 'princess.png' },
    { name: 'Ram Rider', image: 'ram-rider.png' },
    { name: 'Rascals', image: 'rascals.png' },
    { name: 'Royal Ghost', image: 'royal-ghost.png' },
    { name: 'Royal Giant', image: 'royal-giant.png' },
    { name: 'Royal Hogs', image: 'royal-hogs.png' },
    { name: 'Royal Recruits', image: 'royal-recruits.png' },
    { name: 'Rune Giant', image: 'rune-giant.png' },
    { name: 'Skeleton Army', image: 'skeleton-army.png' },
    { name: 'Skeleton Barrel', image: 'skeleton-barrel.png' },
    { name: 'Skeleton Dragons', image: 'skeleton-dragons.png' },
    { name: 'Skeleton King', image: 'skeleton-king.png' },
    { name: 'Skeletons', image: 'skeletons.png' },
    { name: 'Sparky', image: 'sparky.png' },
    { name: 'Spear Goblins', image: 'spear-goblins.png' },
    { name: 'Spirit Empress', image: 'spirit-empress.png' },
    { name: 'Suspicious Bush', image: 'suspicious-bush.png' },
    { name: 'Three Musketeers', image: 'three-musketeers.png' },
    { name: 'Valkyrie', image: 'valkyrie.png' },
    { name: 'Wall Breakers', image: 'wall-breakers.png' },
    { name: 'Witch', image: 'witch.png' },
    { name: 'Wizard', image: 'wizard.png' },
    { name: 'Zappies', image: 'zappies.png' },

    // Buildings
    { name: 'Bomb Tower', image: 'bomb-tower.png' },
    { name: 'Cannon', image: 'cannon.png' },
    { name: 'Inferno Tower', image: 'inferno-tower.png' },
    { name: 'Mortar', image: 'mortar.png' },
    { name: 'Tesla', image: 'tesla.png' },
    { name: 'X-Bow', image: 'x-bow.png' },
    { name: 'Barbarian Hut', image: 'barbarian-hut.png' },
    { name: 'Elixir Collector', image: 'elixir-collector.png' },
    { name: 'Goblin Cage', image: 'goblin-cage.png' },
    { name: 'Goblin Drill', image: 'goblin-drill.png' },
    { name: 'Goblin Hut', image: 'goblin-hut.png' },
    { name: 'Tombstone', image: 'tombstone.png' },

    // Spells
    { name: 'Barbarian Barrel', image: 'barbarian-barrel.png' },
    { name: 'Rocket', image: 'rocket.png' },
    { name: 'Royal Delivery', image: 'royal-delivery.png' },
    { name: 'Goblin Barrel', image: 'goblin-barrel.png' },
    { name: 'Graveyard', image: 'graveyard.png' }
];

// Helper functions
function generateLobbyCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getPublicLobbies() {
    const publicLobbies = [];
    lobbies.forEach((lobby, code) => {
        if (!lobby.password && lobby.state === 'waiting') {
            publicLobbies.push({
                code: lobby.code,
                name: lobby.name,
                players: lobby.players.length,
                maxPlayers: lobby.maxPlayers,
                host: lobby.players.find(p => p.isHost)?.username || 'Unknown'
            });
        }
    });
    return publicLobbies;
}

function getRandomCard() {
    return CARDS[Math.floor(Math.random() * CARDS.length)];
}

function selectImposter(lobby) {
    const randomIndex = Math.floor(Math.random() * lobby.players.length);
    lobby.players.forEach((player, index) => {
        player.isImposter = index === randomIndex;
    });
}

function startTurnTimer(lobby, lobbyCode) {
    // Clear any existing timer
    if (lobby.turnTimer) {
        clearTimeout(lobby.turnTimer);
    }

    // Start 10 second timer
    lobby.turnTimer = setTimeout(() => {
        // Time's up - automatically submit empty message or skip turn
        const messagesThisRound = lobby.messages.filter(m => m.round === lobby.round).length;

        // Add timeout message
        const currentPlayer = lobby.players.find(p => p.socketId === lobby.currentTurn);
        if (currentPlayer) {
            lobby.messages.push({
                username: currentPlayer.username,
                message: '(Time out)',
                round: lobby.round
            });
        }

        // Move to next turn
        lobby.currentTurn = getNextTurnPlayer(lobby);

        // Check if round is complete (count only active players)
        const activePlayers = lobby.players.filter(p => !p.hasLeft);
        if (messagesThisRound + 1 === activePlayers.length) {
            if (lobby.round < (lobby.totalRounds || 3)) {
                // Start next round
                lobby.round++;
                // Find first active player for next round
                const firstActivePlayer = lobby.players.find(p => !p.hasLeft);
                lobby.currentTurn = firstActivePlayer ? firstActivePlayer.socketId : lobby.players[0].socketId;

                // Start timer for new round
                startTurnTimer(lobby, lobbyCode);
            } else {
                // All rounds complete, start voting
                lobby.state = 'voting';
                io.to(lobbyCode).emit('votingPhase', {
                    players: lobby.players.map(p => ({
                        username: p.username,
                        socketId: p.socketId
                    }))
                });

                // Start 20 second voting timer
                lobby.votingTimer = setTimeout(() => {
                    concludeVoting(lobby, lobbyCode);
                }, 20000);

                return;
            }
        } else {
            // Start timer for next player's turn
            startTurnTimer(lobby, lobbyCode);
        }

        // Send updated game state
        io.to(lobbyCode).emit('messageReceived', {
            messages: lobby.messages,
            currentTurn: lobby.currentTurn,
            round: lobby.round,
            totalRounds: lobby.totalRounds || 3
        });
    }, 10000);
}

function getNextTurnPlayer(lobby) {
    // Maintain the turn order established in the first round, skip players who left
    const activePlayers = lobby.players.filter(p => !p.hasLeft);
    if (activePlayers.length === 0) return null;

    // Find current player index in active players
    let attempts = 0;
    do {
        lobby.turnOrderIndex = (lobby.turnOrderIndex + 1) % lobby.players.length;
        attempts++;
        // Prevent infinite loop
        if (attempts > lobby.players.length) {
            // Fallback to first active player
            return activePlayers[0].socketId;
        }
    } while (lobby.players[lobby.turnOrderIndex].hasLeft);

    return lobby.players[lobby.turnOrderIndex].socketId;
}

function concludeVoting(lobby, lobbyCode) {
    // Clear timer
    if (lobby.votingTimer) {
        clearTimeout(lobby.votingTimer);
        lobby.votingTimer = null;
    }

    // Count votes
    const voteCounts = new Map();
    lobby.votes.forEach((target) => {
        voteCounts.set(target, (voteCounts.get(target) || 0) + 1);
    });

    // Find player with most votes
    let maxVotes = 0;
    let votedOut = null;
    let tie = false;

    voteCounts.forEach((count, socketId) => {
        if (count > maxVotes) {
            maxVotes = count;
            votedOut = socketId;
            tie = false;
        } else if (count === maxVotes && maxVotes > 0) {
            tie = true;
        }
    });

    // Handle tie - random selection
    if (tie) {
        const tiedPlayers = [];
        voteCounts.forEach((count, socketId) => {
            if (count === maxVotes) {
                tiedPlayers.push(socketId);
            }
        });
        votedOut = tiedPlayers[Math.floor(Math.random() * tiedPlayers.length)];
    }

    // Handle case where no one voted
    if (!votedOut && lobby.players.length > 0) {
        votedOut = lobby.players[Math.floor(Math.random() * lobby.players.length)].socketId;
    }

    const votedOutPlayer = lobby.players.find(p => p.socketId === votedOut);
    const imposter = lobby.players.find(p => p.isImposter);

    let imposterWon = true;
    if (votedOutPlayer && votedOutPlayer.isImposter) {
        // Imposter was caught
        imposterWon = false;
        lobby.players.forEach(p => {
            if (!p.isImposter) {
                p.score += 1;
            }
        });
    } else {
        // Imposter survived
        if (imposter) {
            imposter.score += 3;
        }
    }

    // Send results
    io.to(lobbyCode).emit('gameOver', {
        imposterWon,
        imposterUsername: imposter ? imposter.username : 'Unknown',
        votedOutUsername: votedOutPlayer ? votedOutPlayer.username : 'No one',
        card: lobby.card,
        players: lobby.players.map(p => ({
            username: p.username,
            isHost: p.isHost,
            score: p.score,
            socketId: p.socketId,
            wasImposter: p.isImposter
        }))
    });

    // Reset lobby for next round
    setTimeout(() => {
        lobby.state = 'waiting';
        lobby.card = null;
        lobby.currentTurn = null;
        lobby.round = 0;
        lobby.messages = [];
        lobby.votes = new Map();
        lobby.players.forEach(p => {
            p.isImposter = false;
            p.hasVoted = false;
            p.isSpectator = false; // Spectators become active players for next game
        });

        io.to(lobbyCode).emit('backToLobby', {
            players: lobby.players.map(p => ({
                username: p.username,
                isHost: p.isHost,
                score: p.score,
                socketId: p.socketId,
                isSpectator: p.isSpectator
            }))
        });
    }, 8000);
}

// Socket.io connection
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Analytics: Track new session
    try {
        const headers = socket.handshake.headers || {};
        const ip = headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            socket.handshake.address ||
            socket.conn.remoteAddress ||
            'unknown';
        const userAgent = headers['user-agent'] || 'unknown';

        const session = {
            socketId: socket.id,
            start: Date.now(),
            end: null,
            durationMs: null,
            ip,
            userAgent
        };

        activeSessions.set(socket.id, session);
        analytics.totalVisits = (analytics.totalVisits || 0) + 1;
        saveAnalytics(analytics);

        console.log(`Session started: ${socket.id} from ${ip}`);
    } catch (err) {
        console.error('Analytics tracking error:', err);
    }

    // Send initial lobby list
    socket.emit('lobbyList', getPublicLobbies());

    // Check if lobby exists (for join by code)
    socket.on('checkLobby', ({ code }, callback) => {
        const lobby = lobbies.get(code);

        if (!lobby) {
            callback({ exists: false });
            return;
        }

        callback({
            exists: true,
            requiresPassword: !!lobby.password,
            name: lobby.name
        });
    });

    // Create lobby
    socket.on('createLobby', ({ lobbyName, username, password, maxPlayers }) => {
        const code = generateLobbyCode();

        const lobby = {
            code,
            name: lobbyName,
            password: password || null,
            maxPlayers: parseInt(maxPlayers) || 5,
            players: [],
            state: 'waiting', // waiting, playing
            card: null,
            currentTurn: null,
            round: 0,
            messages: [],
            votes: new Map(),
            allChatMessages: []
        };

        const player = {
            socketId: socket.id,
            username,
            isHost: true,
            isImposter: false,
            score: 0,
            hasVoted: false,
            isSpectator: false
        };

        lobby.players.push(player);
        lobbies.set(code, lobby);
        players.set(socket.id, { lobbyCode: code, username });

        socket.join(code);
        socket.emit('lobbyCreated', { code, lobby: getLobbyData(lobby, socket.id) });
        io.emit('lobbyList', getPublicLobbies());
    });

    // Join lobby
    socket.on('joinLobby', ({ code, username, password }) => {
        const lobby = lobbies.get(code);

        if (!lobby) {
            socket.emit('error', { message: 'Lobby not found' });
            return;
        }

        if (lobby.password && lobby.password !== password) {
            socket.emit('error', { message: 'Incorrect password' });
            return;
        }

        if (lobby.players.length >= lobby.maxPlayers) {
            socket.emit('error', { message: 'Lobby is full' });
            return;
        }

        if (lobby.state !== 'waiting') {
            socket.emit('error', { message: 'Game already in progress' });
            return;
        }

        const player = {
            socketId: socket.id,
            username,
            isHost: false,
            isImposter: false,
            score: 0,
            hasVoted: false,
            isSpectator: lobby.state === 'playing' || lobby.state === 'voting' // Spectator if game in progress
        };

        lobby.players.push(player);
        players.set(socket.id, { lobbyCode: code, username });

        socket.join(code);

        if (player.isSpectator) {
            socket.emit('lobbyJoined', {
                code,
                lobby: getLobbyData(lobby, socket.id),
                spectating: true,
                message: 'You are spectating. You will join the next game.'
            });
        } else {
            socket.emit('lobbyJoined', { code, lobby: getLobbyData(lobby, socket.id) });
        }

        io.to(code).emit('playerJoined', {
            players: lobby.players.map(p => ({
                username: p.username,
                isHost: p.isHost,
                score: p.score,
                socketId: p.socketId,
                isSpectator: p.isSpectator
            }))
        });
        io.emit('lobbyList', getPublicLobbies());
    });

    // Kick player
    socket.on('kickPlayer', ({ targetSocketId }) => {
        const playerInfo = players.get(socket.id);
        if (!playerInfo) return;

        const lobby = lobbies.get(playerInfo.lobbyCode);
        if (!lobby) return;

        const kicker = lobby.players.find(p => p.socketId === socket.id);
        if (!kicker || !kicker.isHost) return;

        const targetIndex = lobby.players.findIndex(p => p.socketId === targetSocketId);
        if (targetIndex === -1) return;

        lobby.players.splice(targetIndex, 1);
        players.delete(targetSocketId);

        io.to(targetSocketId).emit('kicked');
        io.to(targetSocketId).socketsLeave(playerInfo.lobbyCode);

        io.to(playerInfo.lobbyCode).emit('playerLeft', {
            players: lobby.players.map(p => ({
                username: p.username,
                isHost: p.isHost,
                score: p.score,
                socketId: p.socketId
            }))
        });
    });

    // Start game
    socket.on('startGame', () => {
        const playerInfo = players.get(socket.id);
        if (!playerInfo) return;

        const lobby = lobbies.get(playerInfo.lobbyCode);
        if (!lobby) return;

        const host = lobby.players.find(p => p.socketId === socket.id);
        if (!host || !host.isHost) return;

        if (lobby.players.length < 3) {
            socket.emit('error', { message: 'Need at least 3 players to start' });
            return;
        }

        // Determine number of rounds based on player count
        // 3 players = 3 rounds, 4+ players = 2 rounds
        const totalRounds = lobby.players.length === 3 ? 3 : 2;

        // Start the game
        lobby.state = 'playing';
        lobby.card = getRandomCard();
        lobby.round = 1;
        lobby.totalRounds = totalRounds;
        lobby.messages = [];
        lobby.votes = new Map();

        // Random first player and establish turn order
        const randomPlayerIndex = Math.floor(Math.random() * lobby.players.length);
        lobby.currentTurn = lobby.players[randomPlayerIndex].socketId;
        lobby.turnOrderIndex = randomPlayerIndex; // Track the starting position in turn order

        // Reset player states
        lobby.players.forEach(p => {
            p.hasVoted = false;
        });

        // Select imposter
        selectImposter(lobby);

        // Clear any existing voting timer
        if (lobby.votingTimer) {
            clearTimeout(lobby.votingTimer);
            lobby.votingTimer = null;
        }

        // Initialize turn timer
        lobby.turnTimer = null;

        // Send game state to each player
        lobby.players.forEach(player => {
            io.to(player.socketId).emit('gameStarted', {
                isImposter: player.isImposter,
                isSpectator: player.isSpectator,
                card: player.isImposter || player.isSpectator ? null : lobby.card,
                currentTurn: lobby.currentTurn,
                round: lobby.round,
                totalRounds: lobby.totalRounds,
                players: lobby.players.map(p => ({
                    username: p.username,
                    isHost: p.isHost,
                    score: p.score,
                    socketId: p.socketId,
                    isSpectator: p.isSpectator
                }))
            });
        });

        // Start the turn timer for the first turn
        startTurnTimer(lobby, playerInfo.lobbyCode);

        io.emit('lobbyList', getPublicLobbies());
    });

    // Submit message
    socket.on('submitMessage', ({ message }) => {
        const playerInfo = players.get(socket.id);
        if (!playerInfo) return;

        const lobby = lobbies.get(playerInfo.lobbyCode);
        if (!lobby || lobby.state !== 'playing') return;

        if (lobby.currentTurn !== socket.id) return;

        const player = lobby.players.find(p => p.socketId === socket.id);
        if (!player) return;

        // Trim and validate message (max 20 characters)
        const trimmedMessage = message.trim().substring(0, 20);
        if (!trimmedMessage) return;

        // Clear turn timer since player submitted
        if (lobby.turnTimer) {
            clearTimeout(lobby.turnTimer);
            lobby.turnTimer = null;
        }

        lobby.messages.push({
            username: player.username,
            message: trimmedMessage,
            round: lobby.round
        });

        // Move to next turn
        lobby.currentTurn = getNextTurnPlayer(lobby);

        // Check if round is complete (count only active players)
        const messagesThisRound = lobby.messages.filter(m => m.round === lobby.round).length;
        const activePlayers = lobby.players.filter(p => !p.hasLeft);
        if (messagesThisRound === activePlayers.length) {
            if (lobby.round < (lobby.totalRounds || 3)) {
                // Start next round
                lobby.round++;
                // Find first active player for next round
                const firstActivePlayer = lobby.players.find(p => !p.hasLeft);
                lobby.currentTurn = firstActivePlayer ? firstActivePlayer.socketId : lobby.players[0].socketId;

                // Start timer for next round
                startTurnTimer(lobby, playerInfo.lobbyCode);
            } else {
                // All rounds complete, start voting
                lobby.state = 'voting';
                io.to(playerInfo.lobbyCode).emit('votingPhase', {
                    players: lobby.players.map(p => ({
                        username: p.username,
                        socketId: p.socketId
                    }))
                });

                // Start 20 second voting timer
                lobby.votingTimer = setTimeout(() => {
                    concludeVoting(lobby, playerInfo.lobbyCode);
                }, 20000);

                return;
            }
        } else {
            // Start timer for next player's turn
            startTurnTimer(lobby, playerInfo.lobbyCode);
        }

        // Send updated game state
        io.to(playerInfo.lobbyCode).emit('messageReceived', {
            messages: lobby.messages,
            currentTurn: lobby.currentTurn,
            round: lobby.round,
            totalRounds: lobby.totalRounds || 3
        });
    });

    // Submit all-chat message (available anytime)
    socket.on('submitAllChat', ({ message }) => {
        const playerInfo = players.get(socket.id);
        if (!playerInfo) return;

        const lobby = lobbies.get(playerInfo.lobbyCode);
        if (!lobby) return;

        const player = lobby.players.find(p => p.socketId === socket.id);
        if (!player) return;

        // Trim and validate message (max 100 characters for all-chat)
        const trimmedMessage = message.trim().substring(0, 100);
        if (!trimmedMessage) return;

        // Initialize allChatMessages if it doesn't exist
        if (!lobby.allChatMessages) {
            lobby.allChatMessages = [];
        }

        lobby.allChatMessages.push({
            username: player.username,
            message: trimmedMessage,
            timestamp: Date.now()
        });

        // Keep only last 50 messages
        if (lobby.allChatMessages.length > 50) {
            lobby.allChatMessages.shift();
        }

        // Broadcast to all players in lobby
        io.to(playerInfo.lobbyCode).emit('allChatMessage', {
            username: player.username,
            message: trimmedMessage,
            timestamp: Date.now()
        });
    });

    // Submit vote
    socket.on('submitVote', ({ targetSocketId }) => {
        const playerInfo = players.get(socket.id);
        if (!playerInfo) return;

        const lobby = lobbies.get(playerInfo.lobbyCode);
        if (!lobby || lobby.state !== 'voting') return;

        const player = lobby.players.find(p => p.socketId === socket.id);
        if (!player || player.hasVoted) return;

        player.hasVoted = true;
        lobby.votes.set(socket.id, targetSocketId);

        // Send vote update to all players
        const voteCounts = {};
        const playersVoted = [];

        lobby.votes.forEach((target, voter) => {
            voteCounts[target] = (voteCounts[target] || 0) + 1;
            playersVoted.push(voter);
        });

        io.to(playerInfo.lobbyCode).emit('voteUpdate', {
            votes: voteCounts,
            playersVoted: playersVoted
        });

        // Check if all votes are in
        const allVoted = lobby.players.every(p => p.hasVoted);
        if (allVoted) {
            // Cancel timer since everyone voted
            if (lobby.votingTimer) {
                clearTimeout(lobby.votingTimer);
                lobby.votingTimer = null;
            }

            concludeVoting(lobby, playerInfo.lobbyCode);
        } else {
            // Notify that vote was received
            socket.emit('voteReceived');
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        // Analytics: Finalize session
        try {
            const session = activeSessions.get(socket.id);
            if (session) {
                session.end = Date.now();
                session.durationMs = session.end - session.start;

                analytics.totalSessionTimeMs = (analytics.totalSessionTimeMs || 0) + session.durationMs;
                analytics.sessions = analytics.sessions || [];
                analytics.sessions.push(session);

                saveAnalytics(analytics);
                activeSessions.delete(socket.id);

                console.log(`Session ended: ${socket.id} - Duration: ${Math.round(session.durationMs / 1000)}s`);
            }
        } catch (err) {
            console.error('Analytics finalization error:', err);
        }

        const playerInfo = players.get(socket.id);
        if (playerInfo) {
            const lobby = lobbies.get(playerInfo.lobbyCode);
            if (lobby) {
                const playerIndex = lobby.players.findIndex(p => p.socketId === socket.id);
                if (playerIndex !== -1) {
                    const leavingPlayer = lobby.players[playerIndex];
                    const wasHost = leavingPlayer.isHost;
                    const wasImposter = leavingPlayer.isImposter;
                    const isGameActive = lobby.state === 'playing' || lobby.state === 'voting';

                    if (isGameActive) {
                        // Mark player as left instead of removing during game
                        leavingPlayer.hasLeft = true;

                        // If imposter left, end game immediately
                        if (wasImposter) {
                            // Clear any timers
                            if (lobby.turnTimer) {
                                clearTimeout(lobby.turnTimer);
                                lobby.turnTimer = null;
                            }
                            if (lobby.votingTimer) {
                                clearTimeout(lobby.votingTimer);
                                lobby.votingTimer = null;
                            }

                            // Regular players win
                            lobby.players.forEach(p => {
                                if (!p.isImposter && !p.hasLeft) {
                                    p.score += 1;
                                }
                            });

                            // Send game over
                            io.to(playerInfo.lobbyCode).emit('gameOver', {
                                imposterWon: false,
                                imposterLeft: true,
                                imposterUsername: leavingPlayer.username,
                                votedOutUsername: 'Imposter left the game',
                                card: lobby.card,
                                players: lobby.players.filter(p => !p.hasLeft).map(p => ({
                                    username: p.username,
                                    isHost: p.isHost,
                                    score: p.score,
                                    socketId: p.socketId,
                                    wasImposter: p.isImposter
                                }))
                            });

                            // Reset lobby after delay
                            setTimeout(() => {
                                // Remove players who left
                                lobby.players = lobby.players.filter(p => !p.hasLeft);
                                lobby.state = 'waiting';
                                lobby.card = null;
                                lobby.currentTurn = null;
                                lobby.round = 0;
                                lobby.messages = [];
                                lobby.votes = new Map();
                                lobby.players.forEach(p => {
                                    p.isImposter = false;
                                    p.hasVoted = false;
                                    p.isSpectator = false;
                                });

                                // Transfer host if needed
                                if (wasHost && lobby.players.length > 0) {
                                    lobby.players[0].isHost = true;
                                }

                                io.to(playerInfo.lobbyCode).emit('backToLobby', {
                                    players: lobby.players.map(p => ({
                                        username: p.username,
                                        isHost: p.isHost,
                                        score: p.score,
                                        socketId: p.socketId,
                                        isSpectator: p.isSpectator
                                    }))
                                });
                            }, 8000);
                        } else {
                            // Regular player left during game - check if it was their turn
                            if (lobby.currentTurn === socket.id && lobby.state === 'playing') {
                                // Skip to next turn
                                lobby.messages.push({
                                    username: leavingPlayer.username,
                                    message: '(Player left)',
                                    round: lobby.round
                                });

                                lobby.currentTurn = getNextTurnPlayer(lobby);

                                // Check if round is complete
                                const messagesThisRound = lobby.messages.filter(m => m.round === lobby.round).length;
                                const activePlayers = lobby.players.filter(p => !p.hasLeft);

                                if (messagesThisRound === activePlayers.length) {
                                    if (lobby.round < (lobby.totalRounds || 3)) {
                                        lobby.round++;
                                        const firstActivePlayer = lobby.players.find(p => !p.hasLeft);
                                        lobby.currentTurn = firstActivePlayer ? firstActivePlayer.socketId : lobby.players[0].socketId;
                                        startTurnTimer(lobby, playerInfo.lobbyCode);
                                    } else {
                                        // Start voting
                                        lobby.state = 'voting';
                                        io.to(playerInfo.lobbyCode).emit('votingPhase', {
                                            players: lobby.players.filter(p => !p.hasLeft).map(p => ({
                                                username: p.username,
                                                socketId: p.socketId
                                            }))
                                        });

                                        lobby.votingTimer = setTimeout(() => {
                                            concludeVoting(lobby, playerInfo.lobbyCode);
                                        }, 20000);
                                    }
                                } else {
                                    startTurnTimer(lobby, playerInfo.lobbyCode);
                                }

                                io.to(playerInfo.lobbyCode).emit('messageReceived', {
                                    messages: lobby.messages,
                                    currentTurn: lobby.currentTurn,
                                    round: lobby.round
                                });
                            }

                            // Notify all players
                            io.to(playerInfo.lobbyCode).emit('playerLeft', {
                                players: lobby.players.map(p => ({
                                    username: p.username,
                                    isHost: p.isHost,
                                    score: p.score,
                                    socketId: p.socketId,
                                    isSpectator: p.isSpectator,
                                    hasLeft: p.hasLeft
                                })),
                                leftPlayerName: playerInfo.username
                            });
                        }
                    } else {
                        // Game not active - remove player completely
                        lobby.players.splice(playerIndex, 1);

                        if (lobby.players.length === 0) {
                            // Delete empty lobby
                            lobbies.delete(playerInfo.lobbyCode);
                        } else {
                            // Transfer host if needed
                            if (wasHost && lobby.players.length > 0) {
                                lobby.players[0].isHost = true;
                            }

                            io.to(playerInfo.lobbyCode).emit('playerLeft', {
                                players: lobby.players.map(p => ({
                                    username: p.username,
                                    isHost: p.isHost,
                                    score: p.score,
                                    socketId: p.socketId,
                                    isSpectator: p.isSpectator
                                })),
                                leftPlayerName: playerInfo.username
                            });
                        }
                    }

                    io.emit('lobbyList', getPublicLobbies());
                }
            }
            players.delete(socket.id);
        }
    });
});

function getLobbyData(lobby, socketId) {
    return {
        code: lobby.code,
        name: lobby.name,
        maxPlayers: lobby.maxPlayers,
        hasPassword: !!lobby.password,
        players: lobby.players.map(p => ({
            username: p.username,
            isHost: p.isHost,
            score: p.score,
            socketId: p.socketId
        }))
    };
}

// Start server - bind to 0.0.0.0 for Railway
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Admin token configured: ${process.env.ADMIN_TOKEN ? 'Yes' : 'No'}`);
});
