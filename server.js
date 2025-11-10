const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static('public'));

// Game state
const lobbies = new Map();
const players = new Map(); // socketId -> player info

// Card data - you'll replace this with your actual cards
const CARDS = [
    { name: 'Knight', image: 'knight.png' },
    { name: 'Archer', image: 'archer.png' },
    { name: 'Giant', image: 'giant.png' },
    { name: 'Goblin', image: 'goblin.png' },
    { name: 'P.E.K.K.A', image: 'pekka.png' },
    { name: 'Wizard', image: 'wizard.png' },
    { name: 'Baby Dragon', image: 'baby-dragon.png' },
    { name: 'Fireball', image: 'fireball.png' },
    { name: 'Prince', image: 'prince.png' },
    { name: 'Hog Rider', image: 'hog-rider.png' },
    { name: 'Skeleton Army', image: 'skeleton-army.png' },
    { name: 'Barbarians', image: 'barbarians.png' },
    { name: 'Minions', image: 'minions.png' },
    { name: 'Balloon', image: 'balloon.png' },
    { name: 'Witch', image: 'witch.png' },
    { name: 'Golem', image: 'golem.png' },
    { name: 'Lightning', image: 'lightning.png' },
    { name: 'Ice Spirit', image: 'ice-spirit.png' },
    { name: 'Miner', image: 'miner.png' },
    { name: 'Mega Knight', image: 'mega-knight.png' }
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

function getNextTurnPlayer(lobby) {
    const currentTurnIndex = lobby.players.findIndex(p => p.socketId === lobby.currentTurn);
    const nextIndex = (currentTurnIndex + 1) % lobby.players.length;
    return lobby.players[nextIndex].socketId;
}

// Socket.io connection
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Send initial lobby list
    socket.emit('lobbyList', getPublicLobbies());

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
            votes: new Map()
        };

        const player = {
            socketId: socket.id,
            username,
            isHost: true,
            isImposter: false,
            score: 0,
            hasVoted: false
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
            hasVoted: false
        };

        lobby.players.push(player);
        players.set(socket.id, { lobbyCode: code, username });

        socket.join(code);
        socket.emit('lobbyJoined', { code, lobby: getLobbyData(lobby, socket.id) });
        io.to(code).emit('playerJoined', {
            players: lobby.players.map(p => ({
                username: p.username,
                isHost: p.isHost,
                score: p.score,
                socketId: p.socketId
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

        // Start the game
        lobby.state = 'playing';
        lobby.card = getRandomCard();
        lobby.round = 1;
        lobby.messages = [];
        lobby.votes = new Map();
        lobby.currentTurn = lobby.players[0].socketId;

        // Reset player states
        lobby.players.forEach(p => {
            p.hasVoted = false;
        });

        // Select imposter
        selectImposter(lobby);

        // Send game state to each player
        lobby.players.forEach(player => {
            io.to(player.socketId).emit('gameStarted', {
                isImposter: player.isImposter,
                card: player.isImposter ? null : lobby.card,
                currentTurn: lobby.currentTurn,
                round: lobby.round,
                players: lobby.players.map(p => ({
                    username: p.username,
                    isHost: p.isHost,
                    score: p.score,
                    socketId: p.socketId
                }))
            });
        });

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

        lobby.messages.push({
            username: player.username,
            message: trimmedMessage,
            round: lobby.round
        });

        // Move to next turn
        lobby.currentTurn = getNextTurnPlayer(lobby);

        // Check if round is complete
        const messagesThisRound = lobby.messages.filter(m => m.round === lobby.round).length;
        if (messagesThisRound === lobby.players.length) {
            if (lobby.round < 3) {
                // Start next round
                lobby.round++;
                lobby.currentTurn = lobby.players[0].socketId;
            } else {
                // All rounds complete, start voting
                lobby.state = 'voting';
                io.to(playerInfo.lobbyCode).emit('votingPhase', {
                    players: lobby.players.map(p => ({
                        username: p.username,
                        socketId: p.socketId
                    }))
                });
                return;
            }
        }

        // Send updated game state
        io.to(playerInfo.lobbyCode).emit('messageReceived', {
            messages: lobby.messages,
            currentTurn: lobby.currentTurn,
            round: lobby.round
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

        // Check if all votes are in
        const allVoted = lobby.players.every(p => p.hasVoted);
        if (allVoted) {
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
                } else if (count === maxVotes) {
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
                imposter.score += 3;
            }

            // Send results
            io.to(playerInfo.lobbyCode).emit('gameOver', {
                imposterWon,
                imposterUsername: imposter.username,
                votedOutUsername: votedOutPlayer?.username,
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
                });

                io.to(playerInfo.lobbyCode).emit('backToLobby', {
                    players: lobby.players.map(p => ({
                        username: p.username,
                        isHost: p.isHost,
                        score: p.score,
                        socketId: p.socketId
                    }))
                });
            }, 8000);
        } else {
            // Notify that vote was received
            socket.emit('voteReceived');
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        const playerInfo = players.get(socket.id);
        if (playerInfo) {
            const lobby = lobbies.get(playerInfo.lobbyCode);
            if (lobby) {
                const playerIndex = lobby.players.findIndex(p => p.socketId === socket.id);
                if (playerIndex !== -1) {
                    const wasHost = lobby.players[playerIndex].isHost;
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
                                socketId: p.socketId
                            }))
                        });
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

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
