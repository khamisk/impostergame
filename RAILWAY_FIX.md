# 🚂 Railway Deployment Troubleshooting

## ✅ What I Just Fixed

### Problem: 500 Internal Server Error
Railway was reaching your app but getting crashes due to WebSocket/CORS issues.

### Solution Applied:
1. ✅ Added CORS configuration to Socket.io
2. ✅ Added health check endpoint at `/health`
3. ✅ Configured server to bind to `0.0.0.0` (Railway requirement)
4. ✅ Enabled both WebSocket and polling transports

---

## 🔍 How to Check Railway Logs

1. Go to your Railway project dashboard
2. Click on your deployment
3. Click **"View Logs"** or **"Deployments"** tab
4. Look for:
   - ✅ `Server running on port XXXX` ← Good!
   - ❌ `Error: Cannot find module` ← Missing dependency
   - ❌ `EADDRINUSE` ← Port conflict (shouldn't happen on Railway)
   - ❌ `npm ERR!` ← Build failed

---

## 📊 What Railway Should Show Now

### Build Phase:
```
Installing dependencies...
✓ express@4.18.2
✓ socket.io@4.6.1
Running npm start...
```

### Deploy Phase:
```
Server running on port 3000
Environment: production
```

### After Deploy:
- Your URL: `https://YOUR-APP.up.railway.app`
- Health check: `https://YOUR-APP.up.railway.app/health`
- Main game: `https://YOUR-APP.up.railway.app/`

---

## 🧪 Test Your Deployment

Once Railway redeploys (should be automatic), test:

### 1. Health Check
Visit: `https://YOUR-APP.up.railway.app/health`

Should show:
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

### 2. Main Page
Visit: `https://YOUR-APP.up.railway.app/`

Should show the game main menu!

### 3. WebSocket Test
- Open the game
- Create a lobby
- If you see the lobby screen → ✅ Socket.io works!
- If you get connection errors → Check logs

---

## 🔧 If It Still Shows 500 Error

### Step 1: Force Redeploy
In Railway dashboard:
- Click "Deployments" tab
- Click the three dots `⋯` on latest deployment
- Click "Redeploy"

### Step 2: Check Build Logs
Look for the **exact error message** after:
```
docker run ...
```

Common errors:

**Error: Cannot find module 'express'**
```
Solution: Railway didn't install dependencies
Fix: Check that package.json is in root directory
```

**Port XXXX is already in use**
```
Solution: Railway is trying to use wrong port
Fix: Already handled - we use process.env.PORT
```

**WebSocket connection failed**
```
Solution: CORS issue
Fix: Already handled - we added CORS config
```

### Step 3: Verify Environment
In Railway settings, check:
- ✅ `PORT` variable should be set automatically
- ✅ No custom `NODE_ENV` needed
- ✅ Start command: `npm start`

---

## 🎯 Quick Checklist

Before contacting support, verify:

- [ ] GitHub repo is public (or Railway has access)
- [ ] `package.json` exists in root
- [ ] `server.js` exists in root
- [ ] `public/` folder exists with HTML files
- [ ] Latest commit is pushed to GitHub
- [ ] Railway is deploying from correct branch (`main`)
- [ ] Build logs show `npm install` succeeded
- [ ] Deploy logs show "Server running on port"

---

## 📱 Test Locally First

Always test locally before deploying:

```powershell
# Stop current server (Ctrl+C)
npm start

# Should show:
# Server running on port 3000
# Environment: development

# Open browser to: http://localhost:3000
# Create lobby → If this works, Railway will work too
```

---

## 🚀 Expected Deployment Timeline

- **Push to GitHub:** Instant
- **Railway detects changes:** 10-30 seconds
- **Build phase:** 1-2 minutes
- **Deploy phase:** 30 seconds
- **Total:** ~3-4 minutes from push to live

---

## 🔗 Useful Railway URLs

- **Dashboard:** https://railway.app/dashboard
- **Docs:** https://docs.railway.app/
- **Status:** https://status.railway.app/
- **Discord:** https://discord.gg/railway (for help)

---

## 💡 Pro Tips

1. **Watch Deploy Logs Live:**
   - Open Railway dashboard
   - Click your service
   - Logs will stream in real-time

2. **Enable Auto-Deploy:**
   - Settings → GitHub
   - ✅ Enable "Automatic Deployments"
   - Every git push = auto redeploy

3. **Custom Domain (Later):**
   - Settings → Networking
   - Add Custom Domain
   - Point your domain to Railway

4. **Environment Variables (If Needed Later):**
   - Settings → Variables
   - Add any secrets here
   - They're encrypted and safe

---

## ✅ What Should Work Now

After Railway redeploys with the fixes:

- ✅ Server starts without crashing
- ✅ Health check returns 200 OK
- ✅ Main page loads
- ✅ Socket.io connects properly
- ✅ Lobbies can be created
- ✅ Players can join
- ✅ Game plays smoothly

---

## 📞 If You Need More Help

**Copy this info:**
1. Your Railway URL
2. The exact error from Deploy Logs
3. Screenshot of the error page (if visible)

Then either:
- Comment here with the error
- Check Railway Discord
- Check Railway status page

---

## 🎉 Success Indicators

You'll know it's working when:

1. Railway shows: **"Deployed"** in green
2. URL opens the game (no 500 error)
3. You can create a lobby
4. Friends can join via the URL
5. Game plays from start to finish

---

**The fixes are committed and ready to deploy!** 🚀

Railway should auto-redeploy in the next few minutes. Check your dashboard!
