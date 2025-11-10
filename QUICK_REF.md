# ⚡ QUICK REFERENCE

## 🎮 Current Status
- ✅ Server running on `http://localhost:3000`
- ✅ Game fully functional
- ✅ 10 placeholder cards included
- ✅ Ready to play locally or deploy

---

## 🚀 Three Ways to Play

### 1️⃣ Solo Test (Right Now)
```
Open 3 browser tabs → http://localhost:3000
Create lobby → Join with other tabs → Play!
```

### 2️⃣ Local Network (Same WiFi)
```powershell
ipconfig  # Get your IP
Share: http://YOUR-IP:3000 with friends
```

### 3️⃣ Online (Railway - FREE)
```powershell
# Push to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_REPO
git push -u origin main

# Deploy
1. Go to railway.app
2. New Project → Deploy from GitHub
3. Select repo → Deploy
4. Generate Domain → Share URL!
```

---

## 🎯 Quick Commands

```powershell
# Start server
npm start

# Stop server
Ctrl + C

# Reinstall dependencies
npm install

# Check what's running on port 3000
Get-NetTCPConnection -LocalPort 3000
```

---

## 📝 Game Rules (Quick)

1. **3-5 players** join lobby
2. **Host starts** game
3. **1 imposter** (doesn't see card)
4. **3 rounds** of messages (1-2 words each)
5. **Vote** who's the imposter
6. **Score:** Imposter caught = 1pt each, Imposter wins = 3pts

---

## 🃏 Add Real Cards (Optional)

1. Get PNG images (200-400px)
2. Name them: `knight.png`, `archer.png`, etc.
3. Put in: `public/cards/`
4. Restart server

Or edit `server.js` line 13 to add your own!

---

## 📱 Important URLs

- **Local:** http://localhost:3000
- **Network:** http://YOUR-IP:3000
- **Railway:** (deploy to get URL)

---

## 🎨 Key Files

- `server.js` - Game logic, cards list
- `public/index.html` - UI structure
- `public/client.js` - Frontend game logic
- `public/style.css` - Styling
- `public/cards/` - Card images

---

## 🐛 Common Fixes

**Server won't start?**
→ `npm install` then `npm start`

**Cards not showing?**
→ Check `public/cards/` folder exists

**Friends can't join?**
→ Deploy to Railway for online play

---

## 📚 Full Documentation

- `START_HERE.md` - Quick start
- `COMPLETE_GUIDE.md` - Everything explained
- `CARDS_SETUP.md` - How to add card images
- `RAILWAY_DEPLOYMENT.md` - Deploy step-by-step
- `README.md` - Overview

---

## ✨ That's It!

**The game is ready!** 
Test it → Add cards (optional) → Deploy → Play! 🎉
