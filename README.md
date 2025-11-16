# Kenya Voter Registration System

A full-stack web application for voter registration, QR scanning, and admin management built for Kenya's election process.

## Features

- **Voter Registration**: Self-service registration with photo capture and Kenyan ID validation
- **Admin Dashboard**: Manage voters, users, and view statistics
- **QR Code Generation**: Unique QR codes for each registered voter
- **QR Scanning**: Real-time verification and vote confirmation at polling stations
- **Role-Based Access Control**: Superadmin, Admin, Superuser, and User roles
- **Mobile Responsive**: Optimized for mobile phones and desktop browsers
- **PDF Export**: Generate voter cards as PDF documents
- **Voter Recovery**: Look up and download voter cards by Kenyan ID

## Tech Stack

- **Backend**: Node.js, Express.js, Multer (file uploads), PDFKit (PDF generation)
- **Frontend**: HTML5, CSS3, ES6+ JavaScript (Vanilla, no build tools)
- **Database**: JSON file-based (easily migrated to PostgreSQL, MongoDB, etc.)
- **QR Code**: qrcode npm package (generation), jsQR (scanning via canvas)
- **Deployment**: Docker, Render.com, GitHub

## Project Structure

```
kenya-voter-reg/
├── backend/
│   ├── server.js              # Main Express server
│   ├── package.json           # Node dependencies
│   ├── .env.example           # Environment variables template
│   ├── data/
│   │   ├── db.json            # Main database (users, voters, settings)
│   │   ├── kenya_regions.json # County/region data
│   │   └── users.json         # Additional user reference
│   ├── helpers/
│   │   └── pdfGenerator.js    # Voter card PDF generation
│   ├── scripts/
│   │   └── fetch_regions.js   # Script to populate regions
│   └── uploads/               # Temporary photo storage
├── frontend/
│   ├── index.html             # Voter registration page
│   ├── admin_login.html       # Admin login page
│   ├── admin.html             # Admin dashboard
│   ├── scanner.html           # QR scanner for polling stations
│   ├── recover.html           # Voter card recovery page
│   ├── register.html          # Alternative registration form
│   ├── success.html           # Registration success page
│   ├── css/
│   │   ├── style.css          # Registration page styles
│   │   └── admin.css          # Admin dashboard styles
│   └── js/
│       ├── main.js            # Registration form logic
│       ├── admin.js           # Admin dashboard logic (652 lines)
│       ├── scanner.js         # QR scanning logic
│       ├── recover.js         # Voter recovery logic
│       ├── register.js        # Alternative register form logic
│       ├── success.js         # Success page logic
│       └── theme.js           # Theme switching
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore patterns
└── README.md                  # This file

```

## Prerequisites

- **Node.js** v14+ ([Download](https://nodejs.org/))
- **npm** v6+ (comes with Node.js)
- **Git** (for version control)
- **Render.com** account (for deployment)
- **GitHub** account (for repository hosting)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/kenya-voter-reg.git
cd kenya-voter-reg
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Setup Environment Variables

Copy the template and configure:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# CORS Configuration (comma-separated for multiple origins)
CORS_ORIGIN=http://localhost:3000,http://localhost:4000

# Frontend Configuration (used in frontend detection)
# Frontend auto-detects via window.location, but you can override
API_BASE_URL=http://localhost:4000

# Upload Configuration
MAX_PHOTO_SIZE=2097152
```

### 4. Create Data Directory (if needed)

```bash
mkdir -p backend/data backend/uploads
```

### 5. Start the Server

**Development Mode:**
```bash
cd backend
npm run dev
```

**Production Mode:**
```bash
cd backend
npm start
```

The server will start on `http://localhost:4000`

### 6. Access the Application

- **Voter Registration**: http://localhost:4000/
- **Admin Login**: http://localhost:4000/admin_login.html
- **Scanner**: http://localhost:4000/scanner.html
- **Voter Recovery**: http://localhost:4000/recover.html

## Default Admin Credentials

The system comes with two pre-configured superadmin accounts. Check `backend/data/db.json`:

```json
{
  "username": "wiston",
  "password": "password",
  "role": "superadmin"
}
```

⚠️ **Important**: Change these credentials before production deployment!

## API Endpoints

### Authentication
- `POST /admin/login` - Admin login
- `POST /admin/logout` - Admin logout

### Voter Management
- `POST /register` - Register new voter (with photo)
- `GET /voter/by-id?kenyan_id={id}` - Lookup voter by ID
- `GET /voter/list` - Get all voters (admin only)
- `DELETE /voter/{registration_no}` - Delete voter (superuser+)
- `GET /pdf/{registration_no}` - Download voter card PDF

### Admin Management
- `GET /admin/stats` - Get statistics (voters, admins, etc.)
- `POST /admin/add-user` - Add new admin user
- `GET /admin/users` - List admin users
- `POST /admin/promote-user` - Promote user to admin
- `POST /admin/toggle-registration` - Open/close registration
- `POST /admin/reset-password` - Reset user password

### Scanner
- `POST /scanner/lookup` - Verify voter by registration number
- `POST /scanner/mark-voted` - Mark voter as voted

### Data
- `GET /regions` - Get list of Kenyan counties/regions

## Mobile Compatibility

The application is fully responsive and optimized for:
- **Mobile**: 320px - 767px (iPhone SE to large phones)
- **Tablet**: 768px - 1024px
- **Desktop**: 1025px+

Features:
- Touch-friendly buttons (44px minimum touch target)
- Responsive forms and inputs
- Mobile-optimized navigation
- Camera access for photo capture and QR scanning on mobile devices

## Deployment on Render

### Step 1: Create GitHub Repository

```bash
cd kenya-voter-reg
git init
git add .
git commit -m "Initial commit: Full-stack voter registration system"
git branch -M main
git remote add origin https://github.com/your-username/kenya-voter-reg.git
git push -u origin main
```

### Step 2: Create Render Web Service

1. Go to [Render.com](https://render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:

**Settings:**
- **Name**: `kenya-voter-reg` (or your preference)
- **Root Directory**: `backend` (since server.js is there)
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: Choose based on your needs (Free tier available)

**Environment Variables** (Click "Advanced" → "Add Environment Variable"):

| Key | Value |
|-----|-------|
| `PORT` | `4000` |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `https://your-render-domain.com` |

### Step 3: Deploy

1. Click "Create Web Service"
2. Render will automatically deploy from your GitHub repo
3. Your app will be live at `https://your-app-name.onrender.com`

### Step 4: Enable Auto-Deploy

In Render dashboard:
1. Go to your service settings
2. Enable "Auto-deploy on push" to automatically redeploy when you push to main branch

## Important Notes for Render Deployment

### Data Persistence

⚠️ **WARNING**: The current JSON file-based database is **ephemeral on Render**. Files created during runtime are lost when the service restarts.

**Solution for Production**:
1. Migrate to PostgreSQL (Render offers free PostgreSQL databases)
2. Or implement daily backups to a cloud storage service (AWS S3, etc.)

For now, the system works fine for development/testing.

### Environment Variables

Ensure these are set in Render:
- `PORT` - Must match Render's expected port (usually 4000)
- `NODE_ENV` - Set to `production`
- `CORS_ORIGIN` - Your Render domain and any custom domains

### Logs

View logs in Render dashboard:
1. Go to your service
2. Click "Logs" tab
3. Real-time logs will appear there

Locally, logs are in `backend/server.log` (created by nohup)

## Development Workflow

### Local Testing

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend (optional, for live reload)
# If you have a simple HTTP server
python -m http.server 3000 -d frontend
```

### Code Changes

1. Make changes to files
2. Backend: Restart with `npm run dev` (nodemon recommended for auto-restart)
3. Frontend: Refresh browser (no build step needed)
4. Test thoroughly on both mobile and desktop

### Before Pushing to GitHub

```bash
# Verify .env is NOT in git
git status | grep .env  # Should be empty

# Check .gitignore includes sensitive files
cat .gitignore

# Run final tests
npm test  # (if tests are configured)

# Commit and push
git add .
git commit -m "Your meaningful message"
git push origin main
```

## Troubleshooting

### Backend won't start

```bash
# Check if port is in use
lsof -i :4000

# Kill the process if needed
kill -9 <PID>

# Check Node version
node --version  # Should be v14+

# Check dependencies
npm install
```

### Frontend can't reach backend

1. Check CORS_ORIGIN in .env
2. Verify backend is running (check server logs)
3. Check API_BASE in JavaScript files (should be dynamic now)
4. Open browser DevTools → Network tab → Check API calls

### Photos not uploading

1. Check `backend/uploads/` directory exists
2. Check MAX_PHOTO_SIZE in .env (default 2MB)
3. Check file permissions: `chmod 755 backend/uploads`

### QR scanning not working on mobile

1. Ensure HTTPS on production (Render provides free SSL)
2. Check camera permissions in browser
3. Test in Chrome/Firefox (best support for getUserMedia)
4. Avoid Safari on iOS (requires HTTPS + specific permissions)

## Security Checklist

- [ ] Change default admin passwords in `backend/data/db.json`
- [ ] Set NODE_ENV=production on Render
- [ ] Use environment variables for sensitive data (no hardcoded secrets)
- [ ] Enable HTTPS (Render provides free SSL)
- [ ] Restrict CORS_ORIGIN to your domain only
- [ ] Regularly backup database files
- [ ] Consider rate limiting for API endpoints
- [ ] Validate and sanitize all user input on backend
- [ ] Keep dependencies updated: `npm audit`, `npm update`

## Future Enhancements

- [ ] Migrate to PostgreSQL for production data persistence
- [ ] Add rate limiting and DDoS protection
- [ ] Implement JWT token refresh mechanism
- [ ] Add email notifications for admin actions
- [ ] Create admin audit logs
- [ ] Implement data export (CSV, Excel)
- [ ] Add multi-language support (Swahili, English)
- [ ] Create mobile app version (React Native)
- [ ] Add real-time WebSocket notifications
- [ ] Implement backup/restore functionality

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -am 'Add feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a pull request

## License

MIT License - feel free to use this project for your purposes.

## Support

For issues, questions, or suggestions:
1. Check existing GitHub issues
2. Create a new issue with details and steps to reproduce
3. Include error messages and logs

## Contact

- **Email**: your-email@example.com
- **GitHub**: [@your-username](https://github.com/your-username)

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Status**: Production Ready (with data persistence recommendations)
