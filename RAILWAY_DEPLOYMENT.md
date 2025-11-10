# 🚀 Quick Railway Deployment Guide

## Method 1: Deploy from GitHub (Recommended)

1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Deploy on Railway:**
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Authorize Railway to access your GitHub
   - Select your repository
   - Click "Deploy Now"

3. **Add a Domain:**
   - Click on your deployed project
   - Go to "Settings" tab
   - Click "Generate Domain"
   - Copy the URL and share with friends!

## Method 2: Deploy with Railway CLI

1. **Install Railway CLI:**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login:**
   ```bash
   railway login
   ```

3. **Initialize and Deploy:**
   ```bash
   railway init
   railway up
   ```

4. **Add Domain:**
   ```bash
   railway domain
   ```

## 🎮 After Deployment

1. Your game will be live at: `https://YOUR-APP.up.railway.app`
2. Share this URL with friends
3. No need to worry about port forwarding or local IP addresses!

## 📝 Important Notes

- Railway automatically detects Node.js projects
- The `npm start` command is used automatically
- Railway sets the `PORT` environment variable automatically
- Free tier includes 500 hours/month (enough for testing)
- Your app will sleep after inactivity but wake up when visited

## 🔄 Updating Your Deployment

When you make changes:

**With GitHub:**
```bash
git add .
git commit -m "Your changes"
git push
```
Railway will automatically redeploy!

**With CLI:**
```bash
railway up
```

## 🌐 Custom Domain (Optional)

1. Go to your project settings on Railway
2. Click "Custom Domain"
3. Add your domain and follow DNS instructions

## 💰 Pricing

- **Free Tier**: $5 credit/month (~500 hours)
- **Pro Plan**: $5/month + usage
- Perfect for playing with friends!

---

**Need help?** Check [Railway Docs](https://docs.railway.app/)
