# 🔒 Security & Private Files

This document explains how sensitive information is kept private.

## Private Files (NOT in Git)

The following files contain your actual admin token and are excluded from version control:

### Local Machine Only
- **`.env`** - Contains your ADMIN_TOKEN
- **`analytics.json`** - Session data collected
- **`ADMIN_QUICK_START.md`** - Quick reference with your token
- **`ADMIN_SETUP.md`** - Setup guide with your token
- **`start.ps1`** - Startup script that displays your token
- **`start.sh`** - Bash startup script

### Protected by .gitignore
All the above files are listed in `.gitignore` so they will never be committed to git.

## Public Files (Safe to Commit)

These files are templates and contain NO sensitive information:

- **`ADMIN_QUICK_START.template.md`** - Template quick start guide
- **`ADMIN_SETUP.template.md`** - Template setup guide
- **`start.ps1.template`** - Template startup script
- **`SECURITY.md`** - This file
- **`server.js`** - Server code (reads from env vars)
- **`public/admin.html`** - Dashboard UI (no secrets)

## Your Admin Token Location

Your actual admin token is ONLY stored in:
1. **`.env`** file on your local machine (not in git)
2. **Railway environment variables** (when you deploy)

### To View Your Token Locally

PowerShell:
```powershell
Get-Content .env | Select-String "ADMIN_TOKEN"
```

Bash:
```bash
cat .env | grep ADMIN_TOKEN
```

## What's Been Cleaned Up

✅ Removed hardcoded tokens from git history
✅ Added private files to `.gitignore`
✅ Created template versions without tokens
✅ Token now only in `.env` (local) and Railway (production)

## Security Checklist

- [x] Token in `.env` file locally
- [x] `.env` excluded from git
- [x] Template files created without tokens
- [x] Private docs excluded from git
- [x] Analytics data excluded from git
- [ ] Token added to Railway (you need to do this)
- [ ] Token saved in password manager (recommended)
- [ ] 2FA enabled on Railway account (recommended)

## If Token Was Exposed

If you accidentally committed your token:

1. **Generate a new token:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Update `.env`:**
   ```
   ADMIN_TOKEN=new_token_here
   ```

3. **Update Railway:**
   - Go to Railway → Settings → Variables
   - Update ADMIN_TOKEN with new value

4. **Restart both servers**

## .gitignore Contents

Your `.gitignore` includes:
```
node_modules/
.env
*.log
.DS_Store
analytics.json

# Private admin documentation with tokens
ADMIN_QUICK_START.md
ADMIN_SETUP.md
start.ps1
start.sh
```

## Railway Environment Variables

On Railway, set these environment variables:
- `ADMIN_TOKEN` - Your admin token (same as in `.env`)
- `NODE_ENV` - production (optional)

Never commit these to git!

## Best Practices

✅ **DO:**
- Keep `.env` file local only
- Save token in password manager
- Use HTTPS in production (Railway does this)
- Rotate token every 30-90 days
- Enable 2FA on Railway

❌ **DON'T:**
- Commit `.env` to git
- Share token publicly
- Include token in URLs on public sites
- Store token in client-side code
- Email or message token unencrypted

## Verifying Security

Check what's tracked by git:
```powershell
git ls-files | Select-String "ADMIN|\.env|analytics"
```

Should only show:
- `ADMIN_QUICK_START.template.md`
- `ADMIN_SETUP.template.md`
- `ANALYTICS_README.md`
- `SECURITY.md`

Should NOT show:
- `.env`
- `ADMIN_QUICK_START.md` (your version with token)
- `ADMIN_SETUP.md` (your version with token)
- `analytics.json`
- `start.ps1` (your version)

## Questions?

- Token not working? Check `.env` file exists and server restarted
- Lost token? Check `.env` or generate new one
- Need to rotate? Generate new, update `.env` and Railway

---

**Your admin token is secure!** 🔒

It's only on your local machine and Railway environment variables (when you set it).
