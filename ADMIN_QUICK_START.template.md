# 🎮 Admin Analytics Dashboard - Quick Start

## Your Secure Token

**IMPORTANT:** Your actual admin token is stored in the `.env` file on your local machine.

To view your token:
```bash
cat .env
```

Or in PowerShell:
```powershell
Get-Content .env
```

⚠️ **Never commit tokens to git!** This file is excluded via `.gitignore`.

---

## Access Dashboard

### Local (Localhost)
```
http://localhost:3000/admin?token=YOUR_TOKEN_HERE
```

Or visit `http://localhost:3000/admin` and paste your token when prompted.

### Production (Railway)
```
https://YOUR-APP.up.railway.app/admin?token=YOUR_TOKEN_HERE
```

---

## Setup on Railway (3 Steps)

### Step 1: Add Environment Variable
Go to https://railway.app → Your Project → Settings → Variables

**Add:**
- Key: `ADMIN_TOKEN`
- Value: `[Your token from .env file]`

Save → Railway auto-redeploys

### Step 2: Wait for Deployment
Watch the deployment log complete (usually 1-2 minutes)

### Step 3: Visit Dashboard
Open the URL above with your token

---

## Dashboard Features

📊 **Real-time Stats:**
- Total visits (all-time)
- Active sessions right now
- Unique visitors (by IP)
- Average session duration

📈 **Visual Charts:**
- Browser breakdown (Chrome, Firefox, Safari, Edge)
- Platform breakdown (Mobile, Windows, Mac, Linux)

📋 **Session Details:**
- 20 most recent sessions
- Start time, duration, IP, user agent

🎛️ **Controls:**
- Refresh button to reload data
- Clear button to reset analytics
- Logout to exit dashboard

---

## Local Setup (Dev)

### Environment Variable is Already Set!

Your `.env` file contains:
```
ADMIN_TOKEN=your_secure_token_here
```

Just run:
```powershell
node server.js
```

Or use the startup script:
```powershell
.\start.ps1
```

Then visit: http://localhost:3000/admin

---

## API Usage (Curl Examples)

Replace `YOUR_TOKEN_HERE` with your actual token from `.env` file.

### Get Summary Stats
```bash
curl -H "x-admin-token: YOUR_TOKEN_HERE" \
  http://localhost:3000/admin/analytics
```

### Get Last 50 Sessions
```bash
curl -H "x-admin-token: YOUR_TOKEN_HERE" \
  "http://localhost:3000/admin/analytics/sessions?limit=50"
```

### Download Raw JSON
```bash
curl -H "x-admin-token: YOUR_TOKEN_HERE" \
  -O http://localhost:3000/admin/analytics/download
```

### Clear All Data
```bash
curl -X POST -H "x-admin-token: YOUR_TOKEN_HERE" \
  http://localhost:3000/admin/analytics/clear
```

---

## Security Notes

✅ Token is in `.env` (excluded from git)
✅ 64 characters (256-bit secure random)
✅ Protected endpoint checks token on every request
✅ HTTPS only on production (Railway)

⚠️ **Security Checklist:**
- [x] Token in `.env` locally
- [x] `.env` in `.gitignore`
- [ ] Token added to Railway environment variables
- [ ] Railway 2FA enabled (recommended)
- [ ] Rotate token every 30-90 days

---

## Files Structure

**Private (local only, in .gitignore):**
- `.env` - Contains your actual ADMIN_TOKEN
- `ADMIN_QUICK_START.md` - This file (with token info)
- `ADMIN_SETUP.md` - Detailed setup (with token)
- `start.ps1` - Startup script (displays token)
- `analytics.json` - Session data

**Public (in git):**
- `public/admin.html` - Dashboard UI (no secrets)
- `server.js` - Server code (reads from env)
- `ANALYTICS_README.md` - API documentation
- `.gitignore` - Excludes sensitive files

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Unauthorized" error | Check `.env` file exists and has ADMIN_TOKEN |
| Token not working | Restart server after editing `.env` |
| Dashboard blank | Click "Refresh Data" or check console |
| Lost token | Check `.env` file or generate new one |

---

## Generate New Token (if needed)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then update `.env` and Railway environment variables.

---

**Ready to use!** 🚀

Your token is safely stored in `.env` on your local machine only.
