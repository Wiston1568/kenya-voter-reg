its live atleast will get to fixing the bugs when im free hopefully bfr the years end God this thing took to much time check it out if u think it worth looking at and if u have free time u can work on it https://kenya-voter-reg.onrender.com
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
git clone https://github.com/wiston1568/kenya-voter-reg.git
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


### Frontend can't reach backend sometimes..... ok like 60-70ish % of the time
this happens like alot sooo il fix it when i get to it
1. Check CORS_ORIGIN in .env
2. Verify backend is running (check server logs)
3. Check API_BASE in JavaScript files (should be dynamic now)
4. Open browser DevTools → Network tab → Check API calls

### Photos not uploading
sometimes just take the photo a couple oftimes 
1. Check `backend/uploads/` directory exists
2. Check MAX_PHOTO_SIZE in .env (default 2MB)
3. Check file permissions: `chmod 755 backend/uploads`

### QR scanning not working on mobile
probably going to fix it if not :
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


**Last Updated**: January 2025
**Version**: 1.0.0
**Status**: Production Ready "ish"
