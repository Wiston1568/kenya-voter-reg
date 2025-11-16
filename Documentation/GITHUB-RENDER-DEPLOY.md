# Deployment Guide: GitHub → Render

Step-by-step guide to upload the Kenya Voter Registration System to GitHub and deploy it live on Render.

## Part 1: GitHub Setup

### Prerequisites
- Git installed: https://git-scm.com/download
- GitHub account: https://github.com/signup
- Code editor with terminal access

### Step 1: Initialize Git Repository

```bash
# Navigate to project root
cd kenya-voter-reg

# Initialize git
git init

# Add all files to staging
git add .

# Commit initial code
git commit -m "Initial commit: Kenya voter registration system with admin dashboard, QR scanning, and voter management"

# Set default branch to main (newer GitHub standard)
git branch -M main
```

### Step 2: Create GitHub Repository

1. Go to [GitHub.com](https://github.com)
2. Click "+" in top right → "New repository"
3. Fill in details:
   - **Repository name:** `kenya-voter-reg`
   - **Description:** "Full-stack voter registration system for Kenya elections"
   - **Visibility:** Public (or Private if preferred)
   - **Initialize repository:** Leave unchecked (we already have files)
   - Click "Create repository"

### Step 3: Connect Local Repository to GitHub

GitHub will show instructions. Follow these:

```bash
# Add remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/kenya-voter-reg.git

# Push to GitHub
git push -u origin main
```

**Verify:** Visit `https://github.com/YOUR_USERNAME/kenya-voter-reg` - your code should be there!

### Step 4: Configure Repository Settings

1. Go to your GitHub repository
2. Click "Settings" tab
3. Under "General":
   - [ ] Enable "Discussions" if you want community input
   - [ ] Enable "Projects" for task tracking
4. Under "Security & Analysis":
   - [ ] Enable "Dependabot alerts" to track vulnerable dependencies
5. Under "Branches":
   - Set default branch to "main"
   - Add branch protection rule if collaborating:
     - Require pull request reviews before merging
     - Dismiss stale PR approvals when new commits are pushed

## Part 2: Prepare for Render Deployment

### Step 1: Verify Production Files

Ensure `.env.example` exists with all required variables:

```bash
cat backend/.env.example
```

Should include:
- PORT
- NODE_ENV
- CORS_ORIGIN
- (Optional: DATABASE_URL for future migrations)

### Step 2: Create `.env` File Locally (for testing)

```bash
cd backend
cp .env.example .env

# Edit with your local settings
nano .env  # or use your editor
```

### Step 3: Test Locally with Production Settings

```bash
# Set production environment
export NODE_ENV=production
export PORT=4000

# Start server
npm start

# In another terminal, test API
curl http://localhost:4000/admin/stats
```

### Step 4: Verify All Hardcoded URLs Are Fixed

```bash
# This should return NO results (0 matches)
grep -r "localhost:4000" frontend/ --include="*.js" --include="*.html" | grep -v "window.location"
```

If you see matches without the ternary operator, fix them before deploying.

## Part 3: Render Deployment

### Step 1: Create Render Account

1. Go to [Render.com](https://render.com)
2. Click "Sign Up"
3. Choose "Sign up with GitHub" for easier authentication
4. Authorize Render to access your GitHub account

### Step 2: Create Web Service

1. Dashboard → Click "New +" → "Web Service"
2. Select your GitHub repository (`kenya-voter-reg`)
3. Render will ask for authorization - click "Connect"

### Step 3: Configure Web Service

Fill in the configuration form:

| Field | Value |
|-------|-------|
| **Name** | `kenya-voter-reg` |
| **Environment** | `Node` |
| **Region** | Choose closest to your users (e.g., `Ohio` for US, `Frankfurt` for EU, `Singapore` for Africa) |
| **Branch** | `main` |
| **Build Command** | `cd backend && npm install` |
| **Start Command** | `cd backend && npm start` |
| **Plan** | Free (or Starter $7/month for better uptime) |

### Step 4: Configure Environment Variables

In the same form, scroll to "Environment" section:

Click "Add Environment Variable" for each:

| Key | Value |
|-----|-------|
| `PORT` | `4000` |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `https://kenya-voter-reg.onrender.com` |

**Note:** Replace `kenya-voter-reg` with your actual Render service name if different.

### Step 5: Create Web Service

Click "Create Web Service" button.

Render will:
1. Clone your repository
2. Install dependencies
3. Start the server
4. Deploy your application

**This takes 2-5 minutes** - you'll see real-time logs in the dashboard.

### Step 6: Get Your Live URL

Once deployed successfully, Render shows your URL at the top:
- Example: `https://kenya-voter-reg.onrender.com`

**Test it:**
```bash
# Check API is working
curl https://kenya-voter-reg.onrender.com/admin/stats

# Visit frontend
open https://kenya-voter-reg.onrender.com
```

### Step 7: Update CORS_ORIGIN (if URL is different)

If your Render URL is different from expected:

1. Go to your Render service dashboard
2. Click "Environment" tab
3. Click "Edit" next to `CORS_ORIGIN`
4. Update to your actual URL: `https://your-service-name.onrender.com`
5. Service will auto-redeploy

## Part 4: Post-Deployment Verification

### Check All Pages Load

Test in browser:
- [ ] `https://your-url.onrender.com` - Registration page
- [ ] `https://your-url.onrender.com/admin_login.html` - Admin login
- [ ] `https://your-url.onrender.com/scanner.html` - QR scanner
- [ ] `https://your-url.onrender.com/recover.html` - Voter recovery

### Test Key Functionality

**Registration Flow:**
1. Visit homepage
2. Fill out voter registration form
3. Upload photo
4. Submit
5. Verify success page appears

**Admin Flow:**
1. Visit `/admin_login.html`
2. Login with superadmin credentials (from `db.json`)
3. View stats
4. Try to delete a voter
5. Verify it works

**API Endpoints:**
```bash
# Test endpoints
curl https://your-url.onrender.com/admin/stats
curl https://your-url.onrender.com/regions
```

### Check Browser Console

Open DevTools on production site:
1. Press F12
2. Go to "Console" tab
3. Should see NO errors (only maybe info logs)
4. Check "Network" tab - all API calls should be to your production domain (no localhost)

## Part 5: Continuous Deployment Setup

### Enable Auto-Deploy

In Render dashboard:
1. Go to your service settings
2. Scroll to "Auto-Deploy"
3. Set to "Yes"
4. Choose branch: `main`

**Now, every time you push to main branch, Render automatically redeploys!**

### Update Code & Deploy

```bash
# Make changes to your code
nano frontend/index.html

# Commit changes
git add .
git commit -m "Fix typo in registration form"

# Push to GitHub
git push origin main
```

Render will automatically:
1. See the push
2. Pull new code
3. Install dependencies (if package.json changed)
4. Restart server
5. Deploy within 2-5 minutes

Check Render dashboard logs to see deployment progress.

## Part 6: Troubleshooting

### Service won't start
**Check logs:**
1. Render dashboard → Your service → "Logs" tab
2. Look for error messages
3. Common issues:
   - Missing environment variable
   - Node version mismatch
   - Port not 4000 (Render requires specific port)

**Solution:**
```
Error: Cannot find module 'express'
→ Fix: Check "Build Command" runs npm install in correct directory
```

### Can't reach frontend
**Check:**
1. Verify `app.use(express.static(...))` in `backend/server.js`
2. Check static files path is correct
3. Verify CORS_ORIGIN is set correctly

### API calls fail
**Check:**
1. Open browser DevTools → Network tab
2. See what URL is being called
3. Should be `https://your-url.onrender.com/api/endpoint`
4. NOT `http://localhost:4000/api/endpoint`
5. Verify all files have dynamic URL detection: `window.location.hostname === 'localhost'`

### Database files disappear
**This is expected!** Render uses ephemeral storage. Every time service restarts:
1. New uploads in `/uploads` are deleted
2. Changes to `db.json` are lost

**Solution for production:**
- Migrate to PostgreSQL (Render offers free databases)
- Implement data backup/restoration
- Use cloud storage for uploaded photos (AWS S3, etc.)

For now, this works fine for development/testing.

### Want your own domain?
1. Buy domain from Namecheap, GoDaddy, etc.
2. In Render dashboard: Service → "Custom Domains"
3. Add your domain: `voter-reg.yourcompany.com`
4. Update DNS records (Render provides instructions)
5. Update CORS_ORIGIN to your custom domain

## Part 7: Ongoing Maintenance

### Weekly
- [ ] Check service health in Render dashboard
- [ ] Monitor logs for errors
- [ ] Test registration flow works

### Monthly
- [ ] Update dependencies: `npm outdated` and `npm update`
- [ ] Check for security vulnerabilities: `npm audit`
- [ ] Review and backup voter data (manual download from admin)
- [ ] Update default admin passwords if not already done

### When Deploying Updates

```bash
# Make sure everything works locally first
npm run dev

# Test thoroughly in browser
# Check console for errors
# Test on mobile device

# Then push to GitHub
git add .
git commit -m "Descriptive message of changes"
git push origin main

# Monitor Render dashboard during deployment
# Once deployed, test live version
```

## Quick Reference

### Useful Render Commands

**View logs:**
```bash
# In Render dashboard, click "Logs" tab
# Or in terminal (if using Render CLI):
# render logs --service-id <YOUR_SERVICE_ID>
```

**Redeploy manually:**
1. Render dashboard → Your service → "Manual Deploy"
2. Choose branch: `main`
3. Click "Deploy"

**Clear all data and restart:**
1. Render dashboard → Your service → "Settings"
2. Click "Restart" to restart service
3. This won't delete data files

### GitHub Commands Reference

```bash
# View changes before committing
git status

# See what you changed
git diff

# Commit with message
git commit -m "Your message"

# Push to GitHub
git push origin main

# Pull latest from GitHub
git pull origin main

# View commit history
git log --oneline

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Create a new branch for features
git checkout -b feature/new-feature
git push origin feature/new-feature
# Then create Pull Request on GitHub
```

## Security Checklist Before Going Live

- [ ] Change default admin passwords in `backend/data/db.json`
- [ ] Set `NODE_ENV=production` in Render
- [ ] Verify CORS_ORIGIN only allows your domain
- [ ] Enable HTTPS (Render provides free SSL automatically)
- [ ] Remove any debug console.log statements
- [ ] Review all API endpoints have proper authentication
- [ ] Enable GitHub's "Dependabot alerts" for security updates
- [ ] Consider implementing rate limiting (future enhancement)
- [ ] Backup initial data before opening to public registration

## Support & Resources

- **Render Documentation:** https://render.com/docs
- **GitHub Documentation:** https://docs.github.com
- **Node.js Best Practices:** https://nodejs.org/en/docs/guides/nodejs-performance/
- **Express.js Guide:** https://expressjs.com/
- **Project README:** See `README.md` in this repository

## Deployment Complete! 🎉

Your Kenya Voter Registration System is now:
- ✅ Version controlled on GitHub
- ✅ Running live on Render
- ✅ Automatically deploying on every push
- ✅ Accessible to voters and admins worldwide
- ✅ Mobile-optimized and production-ready

### Next Steps

1. **Invite users:** Share your Render URL with stakeholders
2. **Train admins:** Walk them through admin dashboard features
3. **Monitor performance:** Check Render logs regularly
4. **Plan improvements:** Track feature requests in GitHub Issues
5. **Scale up:** Migrate to PostgreSQL when needed

---

**Last Updated:** January 2025
**Version:** 1.0
**Questions?** Check the README.md or create a GitHub Issue
