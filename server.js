// backend/server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const { nanoid } = require('nanoid');
const { generateVoterPDF } = require('./helpers/pdfGenerator');
const QRCode = require('qrcode');
require('dotenv').config();

const app = express();
// CORS configuration - allow frontend URLs
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
app.use(cors({
  origin: corsOrigins,
  credentials: true
}));
app.use(bodyParser.json({ limit: '8mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, '../frontend')));

const DATA_PATH = path.join(__dirname, 'data', 'db.json');
const REGIONS_PATH = path.join(__dirname, 'data', 'kenya_regions.json');
const UPLOADS = path.join(__dirname, 'uploads');
fs.ensureDirSync(UPLOADS);

// multer for registration image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } }); // 2MB

// Read/write DB helper
async function readDB() {
  await fs.ensureFile(DATA_PATH);
  const exists = await fs.pathExists(DATA_PATH);
  if (!exists) { await fs.writeJson(DATA_PATH, { users: [], voters: [], settings: { registration_open: true } }, { spaces: 2 }); }
  return fs.readJson(DATA_PATH);
}
async function writeDB(db) { return fs.writeJson(DATA_PATH, db, { spaces: 2 }); }

// utility: find user by token
async function userByToken(token) {
  if (!token) return null;
  const db = await readDB();
  return db.users.find(u => u.token === token);
}

// role check middleware - supports both old and new role systems
function requireAuth(roleRequired = null) {
  return async (req, res, next) => {
    try {
      const token = req.headers['x-admin-token'] || req.headers['x-user-token'];
      const user = await userByToken(token);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      // role hierarchy check: superadmin > admin > superuser > user
      if (roleRequired) {
        const roles = ['user', 'superuser', 'admin', 'superadmin'];
        const userRank = roles.indexOf(user.role);
        const requiredRank = roles.indexOf(roleRequired);
        if (userRank < requiredRank) return res.status(403).json({ error: 'Forbidden' });
      }
      req.user = user;
      next();
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
  };
}

// -------------------- AUTH + USERS --------------------
// admin login
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const db = await readDB();
    const user = db.users.find(u => u.username === username && u.password === password);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    // create token
    user.token = nanoid(24);
    await writeDB(db);
    // respond with limited user info
    res.json({ token: user.token, username: user.username, role: user.role, profile_picture: user.profile_picture || '' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// admin logout (invalidate token)
app.post('/admin/logout', requireAuth(), async (req, res) => {
  try {
    const db = await readDB();
    const u = db.users.find(x => x.token === req.user.token);
    if (u) { delete u.token; await writeDB(db); }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// add user (superuser or admin can add; admin cannot add superuser)
app.post('/admin/add-user', requireAuth('admin'), async (req, res) => {
  try {
    const db = await readDB();
    const actor = req.user;
    const { username, password, role, county, profile_picture } = req.body;
    if (!username || !password || !role) return res.status(400).json({ error: 'username,password,role required' });

    // admin cannot create superuser
    if (actor.role === 'admin' && role === 'superuser') return res.status(403).json({ error: 'Forbidden' });

    // unique username
    if (db.users.find(u => u.username === username)) return res.status(409).json({ error: 'Username exists' });

    const newUser = { id: nanoid(8), username, password, role, county: county || '', profile_picture: profile_picture || '' };
    db.users.push(newUser);
    await writeDB(db);
    res.json({ ok: true, user: newUser });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// delete user (superuser can delete anyone; admin can delete clerks)
app.delete('/admin/delete-user/:id', requireAuth('admin'), async (req, res) => {
  try {
    const db = await readDB();
    const actor = req.user;
    const id = req.params.id;
    const idx = db.users.findIndex(u => u.id === id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    const target = db.users[idx];
    if (actor.role === 'admin' && (target.role === 'admin' || target.role === 'superuser')) return res.status(403).json({ error: 'Forbidden' });
    db.users.splice(idx, 1);
    await writeDB(db);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// promote/demote user (superuser only)
app.post('/admin/promote-user/:id', requireAuth('superuser'), async (req, res) => {
  try {
    const db = await readDB();
    const { role } = req.body; // new role
    const id = req.params.id;
    const user = db.users.find(u => u.id === id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.role = role;
    await writeDB(db);
    res.json({ ok: true, user });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// reset subordinate password (admin/superuser can reset users/superusers below them)
app.post('/admin/reset-password/:id', requireAuth('admin'), async (req, res) => {
  try {
    const db = await readDB();
    const actor = req.user;
    const { new_password } = req.body;
    const id = req.params.id;
    
    if (!new_password) return res.status(400).json({ error: 'new_password required' });
    
    const target = db.users.find(u => u.id === id);
    if (!target) return res.status(404).json({ error: 'User not found' });
    
    // Superadmin can reset anyone, Admin can reset users/superusers, Superuser can reset users
    const roles = ['user', 'superuser', 'admin', 'superadmin'];
    const actorRank = roles.indexOf(actor.role);
    const targetRank = roles.indexOf(target.role);
    
    if (actorRank <= targetRank) return res.status(403).json({ error: 'Cannot reset password for users of same or higher rank' });
    
    target.password = new_password;
    if (target.token) delete target.token; // logout the user
    await writeDB(db);
    res.json({ ok: true, message: 'Password reset and user logged out' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// get current user's own profile
app.get('/admin/my-profile', requireAuth(), async (req, res) => {
  try {
    const user = req.user;
    res.json({ 
      id: user.id,
      username: user.username, 
      role: user.role, 
      profile_picture: user.profile_picture || '',
      county: user.county || ''
    });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// update own profile (username,password,profile_picture)
app.post('/admin/update-profile', requireAuth(), async (req, res) => {
  try {
    const db = await readDB();
    const { username, password, profile_picture } = req.body;
    const user = db.users.find(u => u.id === req.user.id || u.token === req.user.token);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (username) user.username = username;
    if (password) user.password = password;
    if (profile_picture) user.profile_picture = profile_picture; // should be dataURL
    await writeDB(db);
    res.json({ ok: true, user: { username: user.username, role: user.role, profile_picture: user.profile_picture } });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// list users (for settings page) - returns users of lower rank
app.get('/admin/list-users', requireAuth('admin'), async (req, res) => {
  try {
    const db = await readDB();
    const actor = req.user;
    const roles = ['user', 'superuser', 'admin', 'superadmin'];
    const actorRank = roles.indexOf(actor.role);
    
    // Filter to show only users of lower rank
    const subordinates = db.users.filter(u => {
      const userRank = roles.indexOf(u.role);
      return userRank < actorRank;
    });
    
    res.json({ users: subordinates });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// -------------------- REGISTRATION & VOTERS --------------------

// Serve regions
app.get('/regions', async (req, res) => {
  try {
    const regions = await fs.readJson(REGIONS_PATH);
    res.json(regions);
  } catch (err) { res.status(500).json({ error: 'Cannot load regions' }); }
});

// registration status
app.get('/registration/status', async (req, res) => {
  const db = await readDB();
  res.json({ open: db.settings.registration_open });
});

// Toggle registration - requires password (confirm actor) and superadmin privilege
app.post('/admin/toggle-registration', requireAuth('superadmin'), async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });
    const db = await readDB();
    const actor = db.users.find(u => u.token === req.headers['x-admin-token'] || u.token === req.headers['x-user-token']);
    if (!actor || actor.password !== password) return res.status(403).json({ error: 'Password incorrect' });
    db.settings.registration_open = !db.settings.registration_open;
    await writeDB(db);
    res.json({ ok: true, open: db.settings.registration_open });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Register voter with image upload (multipart/form-data)
app.post('/register', upload.single('photo'), async (req, res) => {
  try {
    const db = await readDB();
    if (!db.settings.registration_open) return res.status(403).json({ error: 'Registration closed' });

    // fields: first_name,last_name,kenyan_id,phone,email,county,sub_county,ward
    const payload = req.body;
    // Kenyan ID validation: digits only, min 2 max 12 (modern IDs are 9 digits)
    const kenyanId = String(payload.kenyan_id || '').trim();
    if (!/^\d+$/.test(kenyanId) || kenyanId.length < 2 || kenyanId.length > 12) {
      return res.status(400).json({ error: 'Kenyan ID must be numeric and length 2-12 digits' });
    }
    // disallow duplicate id
    // exact kenyan id duplicate
    if (db.voters.find(v => v.kenyan_id === kenyanId)) {
      return res.status(409).json({ error: 'Kenyan ID already registered' });
    }
    // heuristic duplicate detection: same name + phone or same name + email
    const fname = String(payload.first_name || '').trim().toLowerCase();
    const lname = String(payload.last_name || '').trim().toLowerCase();
    const phone = String(payload.phone || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    if (fname || lname) {
      const dup = db.voters.find(v => {
        const vf = String(v.first_name || '').trim().toLowerCase();
        const vl = String(v.last_name || '').trim().toLowerCase();
        const vp = String(v.phone || '').trim();
        const ve = String(v.email || '').trim().toLowerCase();
        if (vf && vl && vf === fname && vl === lname) {
          if (phone && vp && vp === phone) return true;
          if (email && ve && ve === email) return true;
        }
        return false;
      });
      if (dup) return res.status(409).json({ error: 'A person with similar details is already registered' });
    }

    // create voter record
    let voter_reg_no;
    let tries = 0;
    do {
      voter_reg_no = `KEN-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${nanoid(4).toUpperCase()}`;
      tries++;
      if (tries > 10) return res.status(500).json({ error: 'Cannot create unique reg no' });
    } while (db.voters.find(v => v.voter_reg_no === voter_reg_no));

    const photoPath = req.file ? path.join(UPLOADS, req.file.filename) : null;

    const rec = {
      id: nanoid(8),
      first_name: payload.first_name || '',
      last_name: payload.last_name || '',
      kenyan_id: kenyanId,
      phone: payload.phone || '',
      email: payload.email || '',
      county: payload.county || '',
      sub_county: payload.sub_county || '',
      division: payload.division || '',
      ward: payload.ward || '',
      photoPath: photoPath || '',
      voter_reg_no,
      confirmed: false,
      created_at: new Date().toISOString()
    };
    db.voters.unshift(rec);
    await writeDB(db);

    // generate pdf
    const pdfBuffer = await generateVoterPDF(rec);
    // also generate qr data URL for frontend display (same payload as PDF QR)
    try {
      const qrPayload = JSON.stringify({ voter_reg_no: voter_reg_no, kenyan_id: kenyanId });
      const qrDataUrl = await QRCode.toDataURL(qrPayload);
      return res.json({ record: rec, pdf_base64: pdfBuffer.toString('base64'), qr_data_url: qrDataUrl });
    } catch (e) {
      console.error('QR gen failed', e);
      return res.json({ record: rec, pdf_base64: pdfBuffer.toString('base64') });
    }
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// lookup voter
app.get('/lookup/:regno', async (req, res) => {
  try {
    const db = await readDB();
    const rec = db.voters.find(v => v.voter_reg_no === req.params.regno);
    if (!rec) return res.status(404).json({ error: 'Not found' });
    res.json({ record: rec });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// admin list voters (with scope by county for non-superusers)
// allow 'superuser' and above to access the voter list (so superuser/admin/superadmin can view)
app.get('/voter/list', requireAuth('superuser'), async (req, res) => {
  try {
    const db = await readDB();
    const user = req.user;
    let rows = db.voters;
    if (user.role === 'admin' && user.county) rows = rows.filter(r => r.county === user.county);
    if (user.role === 'clerk' && user.county) rows = rows.filter(r => r.county === user.county);
    res.json({ rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// download pdf (protected)
app.get('/pdf/:regno', requireAuth('clerk'), async (req, res) => {
  try {
    const db = await readDB();
    const rec = db.voters.find(v => v.voter_reg_no === req.params.regno);
    if (!rec) return res.status(404).json({ error: 'Not found' });
    const pdfBuffer = await generateVoterPDF(rec);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="voter_${rec.voter_reg_no}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// QR confirmation endpoint: receives regno or scanned payload, marks confirmed if not already
app.post('/voter/confirm', requireAuth('clerk'), async (req, res) => {
  try {
    const { regno } = req.body;
    if (!regno) return res.status(400).json({ error: 'regno required' });
    const db = await readDB();
    const rec = db.voters.find(v => v.voter_reg_no === regno);
    if (!rec) return res.status(404).json({ error: 'Not found' });
    if (rec.confirmed) {
      return res.status(409).json({ error: 'Already confirmed' });
    }
    rec.confirmed = true;
    rec.confirmed_by = req.user.username;
    rec.confirmed_at = new Date().toISOString();
    await writeDB(db);
    res.json({ ok: true, message: 'Confirmed' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// lookup voter by kenyan_id (for recovery)
app.get('/voter/by-id', async (req, res) => {
  try {
    const db = await readDB();
    const kenyanId = req.query.kenyan_id;
    const rec = db.voters.find(v => v.kenyan_id === kenyanId);
    if (!rec) return res.status(404).json({ error: 'Not found' });
    res.json({ record: rec });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// delete voter by regno
app.delete('/voter/:regno', requireAuth('superuser'), async (req, res) => {
  try {
    const db = await readDB();
    const idx = db.voters.findIndex(v => v.voter_reg_no === req.params.regno);
    if (idx === -1) return res.status(404).json({ error: 'Voter not found' });
    db.voters.splice(idx, 1);
    await writeDB(db);
    res.json({ ok: true, message: 'Voter deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Scanner endpoints
app.post('/scanner/lookup', async (req, res) => {
  try {
    const { voter_reg_no } = req.body;
    if (!voter_reg_no) return res.status(400).json({ error: 'voter_reg_no required' });
    const db = await readDB();
    const rec = db.voters.find(v => v.voter_reg_no === voter_reg_no);
    if (!rec) return res.status(404).json({ error: 'Voter not found' });
    if (rec.confirmed) return res.status(409).json({ error: 'Already voted' });
    res.json({ first_name: rec.first_name, last_name: rec.last_name, voter_reg_no: rec.voter_reg_no, kenyan_id: rec.kenyan_id });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Mark voter as voted (QR scanner endpoint)
app.post('/scanner/mark-voted', async (req, res) => {
  try {
    const { voter_reg_no } = req.body;
    if (!voter_reg_no) return res.status(400).json({ error: 'voter_reg_no required' });
    const db = await readDB();
    const rec = db.voters.find(v => v.voter_reg_no === voter_reg_no);
    if (!rec) return res.status(404).json({ error: 'Voter not found' });
    if (rec.confirmed) return res.status(409).json({ error: 'Already voted' });
    rec.confirmed = true;
    rec.confirmed_at = new Date().toISOString();
    await writeDB(db);
    res.json({ ok: true, message: 'Voter marked as voted' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// admin stats
app.get('/admin/stats', requireAuth('admin'), async (req, res) => {
  try {
    const db = await readDB();
    const actor = req.user;
    const roles = ['user', 'superuser', 'admin', 'superadmin'];
    const actorRank = roles.indexOf(actor.role);
    
  // Count voters
  const voters = db.voters.length;
  // Count online users (users with active token)
  const online = db.users.filter(u => u.token).length;
    
    // Count users by rank, filtered to show only subordinates
    const superadmin = db.users.filter(u => u.role === 'superadmin').length;
    const admin = db.users.filter(u => u.role === 'admin').length;
    const superuser = db.users.filter(u => u.role === 'superuser').length;
    const user = db.users.filter(u => u.role === 'user').length;
    
  res.json({ voters, online, superadmin, admin, superuser, user });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Startup message
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server running on port ${PORT} (${NODE_ENV})`);
  if (NODE_ENV === 'development') {
    console.log(`API: http://localhost:${PORT}`);
  }
});
