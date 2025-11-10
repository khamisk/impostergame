# Clash Royale Imposter Game 🎮

A real-time multiplayer social deduction game inspired by TikTok trends, where players try to identify the imposter who doesn't know the secret Clash Royale card!

## 🎯 How to Play

1. **Create or Join a Lobby**: Host creates a lobby with 3-5 players
2. **Game Start**: All players except one (the imposter) see a Clash Royale card
3. **Discussion Phase**: Players take turns typing 1-2 words about the card (3 rounds)
4. **Voting**: Everyone votes who they think is the imposter
5. **Scoring**:
   - If imposter is caught: Everyone else gets 1 point
   - If imposter survives: Imposter gets 3 points

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. **IMPORTANT: Add Your Card Images**
   - Place your Clash Royale card PNG images in the `public/cards/` folder
   - Name them exactly as shown in `server.js` (e.g., `knight.png`, `archer.png`, etc.)
   - Or update the `CARDS` array in `server.js` to match your image filenames

3. Start the server:
```bash
npm start
```

4. Open your browser to `http://localhost:3000`

## 📝 Adding/Customizing Cards

Edit the `CARDS` array in `server.js`:

```javascript
const CARDS = [
  { name: 'Knight', image: 'knight.png' },
  { name: 'Your Card', image: 'your-card.png' },
  // Add more cards here
];
```

Then add the corresponding PNG images to `public/cards/` folder.

## 🌐 Deploying to Railway

### Option 1: Using Railway CLI

1. Install Railway CLI:
```bash
npm i -g @railway/cli
```

2. Login to Railway:
```bash
railway login
```

3. Initialize and deploy:
```bash
railway init
railway up
```

4. Add a domain:
```bash
railway domain
```

### Option 2: Using Railway Dashboard

1. Go to [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your GitHub account and select this repository
4. Railway will automatically detect the Node.js project
5. Click "Deploy" - Railway will use the `npm start` command
6. Once deployed, click "Generate Domain" to get a public URL

### Environment Variables (if needed)
- No special environment variables required
- Railway automatically sets `PORT` - the app uses `process.env.PORT || 3000`

## 🎮 Game Features

✅ Real-time multiplayer using Socket.io
✅ Public and private lobbies (password protected)
✅ Host controls (kick players, start game)
✅ 3-5 player support
✅ Score tracking across rounds
✅ Beautiful responsive UI
✅ Mobile-friendly

## 📁 Project Structure

```
impostergame/
├── server.js           # Express + Socket.io server
├── package.json        # Dependencies
├── public/
│   ├── index.html     # Main HTML file
│   ├── client.js      # Client-side JavaScript
│   ├── style.css      # Styling
│   └── cards/         # Card images folder (ADD YOUR IMAGES HERE!)
│       ├── knight.png
│       ├── archer.png
│       └── ... (add more cards)
└── README.md
```

## 🔧 Configuration

### Changing Max Players
Edit the max players dropdown in `public/index.html` or modify the default in `server.js`.

### Changing Character Limits
- Message limit: Edit `maxlength` in HTML and validation in `server.js`
- Username limit: Edit `maxlength="20"` in the username inputs

### Changing Number of Rounds
Edit the round check in `server.js`:
```javascript
if (lobby.round < 3) { // Change 3 to your desired number
```

## 🐛 Troubleshooting

**Cards not showing?**
- Make sure image files are in `public/cards/` folder
- Check that filenames in `CARDS` array match your actual file names
- Images should be PNG format

**Can't connect to game?**
- Check that server is running (`npm start`)
- Make sure port 3000 is not in use
- Check browser console for errors

**Players not seeing each other?**
- Socket.io requires WebSocket support
- Check firewall settings
- On Railway, make sure the deployment finished successfully

## 📱 Mobile Support

The game is fully responsive and works great on mobile devices!

## 🤝 Playing with Friends

### Local Network
1. Find your local IP address (Windows: `ipconfig`, Mac/Linux: `ifconfig`)
2. Share your IP with friends: `http://YOUR_IP:3000`
3. Make sure you're on the same network

### Online (Railway)
1. Deploy to Railway (see instructions above)
2. Share the Railway-generated URL with friends
3. Play from anywhere!

## 📄 License

MIT License - Feel free to modify and use for your own projects!

---

**Have fun catching imposters! 🎭**
