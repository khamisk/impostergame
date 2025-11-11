# Admin Dashboard Setup Guide

## Getting Your Admin Token

Your admin token is stored in your local `.env` file.

**To view your token:**

PowerShell:
```powershell
Get-Content .env | Select-String "ADMIN_TOKEN"
```

Bash:
```bash
grep ADMIN_TOKEN .env
```

⚠️ **Keep this token secret! Do not share it publicly or commit to git.**

---

## Local Setup

### Your Environment is Already Configured!

The `.env` file in your project root contains:
```
ADMIN_TOKEN=your_actual_token_here
NODE_ENV=development
```

**To start the server:**

```powershell
node server.js
```

Or use the convenient startup script:
```powershell
.\start.ps1
```

### Access the Dashboard Locally

Open in your browser:
```
http://localhost:3000/admin
```

Enter your token from the `.env` file when prompted.

---

## Railway Setup

### 1. Get Your Token

```powershell
# PowerShell
(Get-Content .env | Select-String "ADMIN_TOKEN").ToString().Split('=')[1]
```

Copy the token value.

### 2. Add to Railway Dashboard

1. Go to https://railway.app → Your Project
2. Click **Settings** → **Variables**
3. Add a new variable:
   - **Key:** `ADMIN_TOKEN`
   - **Value:** [Paste your token from step 1]
4. Save (Railway will automatically redeploy)

### 3. Access on Railway

Once deployed, visit:
```
https://YOUR-APP.up.railway.app/admin
```

Login with the same token.

---

## Dashboard Features

**Stats Displayed:**
- Total Visits (all-time)
- Active Sessions (right now)
- Unique Visitors (by IP)
- Average Session Time

**Charts:**
- Browser breakdown (Chrome, Firefox, Safari, Edge, Other)
- Platform breakdown (Mobile, Windows, Mac, Linux, Other)

**Session Details:**
- Start time
- Duration
- IP address
- User agent (browser info)

**Actions:**
- 🔄 **Refresh** - Reload latest data
- 🗑️ **Clear** - Reset all analytics (use with caution)
- **Logout** - Exit dashboard

---

## API Endpoints (for programmatic access)

All endpoints require the admin token as header `x-admin-token` or query param `?token=`

**Get token from .env first:**
```powershell
$token = (Get-Content .env | Select-String "ADMIN_TOKEN").ToString().Split('=')[1]
```

### Get Analytics Summary
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/admin/analytics" -Headers @{"x-admin-token"=$token}
```

### Get Recent Sessions (limit=100)
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/admin/analytics/sessions?limit=50" -Headers @{"x-admin-token"=$token}
```

### Download Raw Data
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/admin/analytics/download" -Headers @{"x-admin-token"=$token} -OutFile "analytics.json"
```

### Clear Analytics
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/admin/analytics/clear" -Method Post -Headers @{"x-admin-token"=$token}
```

---

## Data Collected

For each session, the following data is tracked:
- **Socket ID**: Unique identifier for the connection
- **Start Time**: When the user connected
- **End Time**: When the user disconnected
- **Duration**: How long the session lasted
- **IP Address**: User's IP (handles proxies via x-forwarded-for)
- **User Agent**: Browser and platform information

---

## Privacy Notes

- Data is stored locally in `analytics.json` file
- IP addresses are collected for unique visitor counting
- No personal information beyond IP and user agent is stored
- The analytics file is excluded from git via `.gitignore`
- Consider implementing data retention policies for GDPR compliance

---

## Security Best Practices

✅ **Currently Implemented:**
- Token stored in `.env` file (not in git)
- `.env` excluded via `.gitignore`
- Token is 64 characters (256-bit secure)
- Protected endpoints verify token on every request
- HTTPS enforced on Railway

⚠️ **Recommended Actions:**
- [ ] Save token in password manager
- [ ] Enable 2FA on Railway account
- [ ] Rotate token every 30-90 days
- [ ] Monitor `analytics.json` file size
- [ ] Set up automated backups of analytics data

---

## Generating a New Token

If you need to generate a new token:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then:
1. Update `.env` file with new token
2. Update Railway environment variable
3. Restart server locally
4. Railway will auto-deploy with new token

---

## Troubleshooting

**"Unauthorized" error:**
- Verify `.env` file exists in project root
- Check token matches exactly (no extra spaces)
- Restart server after changing `.env`
- On Railway, verify environment variable is set

**No data showing:**
- Wait for users to visit the site
- Click "Refresh Data" button
- Check server console for errors
- Verify `analytics.json` file exists

**Dashboard not loading:**
- Confirm you're accessing `/admin` endpoint
- Check that `admin.html` exists in `public/` folder
- Verify server is running on port 3000
- Check browser console for JavaScript errors

---

## File Structure

**Private Files (excluded from git):**
```
.env                      # Your ADMIN_TOKEN
analytics.json            # Session data
ADMIN_QUICK_START.md     # Quick reference with token
ADMIN_SETUP.md           # This file
start.ps1                # Startup script
```

**Public Files (in repository):**
```
server.js                         # Server (reads from .env)
public/admin.html                 # Dashboard UI
ANALYTICS_README.md              # API documentation
ADMIN_QUICK_START.template.md   # Template without token
ADMIN_SETUP.template.md          # This template
.gitignore                        # Excludes sensitive files
```

---

## Example Response Format

```json
{
  "totalVisits": 145,
  "totalSessions": 145,
  "uniqueVisitors": 87,
  "avgSessionTimeMs": 245000,
  "avgSessionTimeReadable": "4m 5s",
  "totalTimeMs": 35525000,
  "browsers": {
    "Chrome": 98,
    "Firefox": 24,
    "Safari": 18,
    "Edge": 5
  },
  "platforms": {
    "Mobile": 67,
    "Windows": 45,
    "Mac": 28,
    "Linux": 5
  },
  "activeSessions": [
    {
      "socketId": "abc123",
      "startTime": "2025-11-10T12:34:56.789Z",
      "duration": "45s",
      "ip": "192.168.1.1",
      "userAgent": "Mozilla/5.0..."
    }
  ],
  "activeCount": 1
}
```

---

Need more help? Check `ANALYTICS_README.md` for detailed API documentation.
