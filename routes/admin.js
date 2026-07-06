const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { verifyPassword } = require('../utils/auth');
const { requireAdmin } = require('../middleware/auth');
const {
  getSiteData,
  saveSiteData,
  getMessages,
  markMessageRead,
  deleteMessage
} = require('../utils/dataStore');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

// ---------- Logo upload setup ----------
const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `logo-${Date.now()}${ext}`);
  }
});

const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_LOGO_TYPES.includes(file.mimetype)) {
      return cb(new Error('Only PNG, JPG, SVG, or WEBP images are allowed.'));
    }
    cb(null, true);
  }
});

function deleteLogoFileIfLocal(logoUrl) {
  if (logoUrl && logoUrl.startsWith('/uploads/')) {
    const filePath = path.join(UPLOADS_DIR, path.basename(logoUrl));
    fs.unlink(filePath, () => {}); // best-effort cleanup, ignore errors
  }
}

// ---------- Auth ----------
router.get('/login', (req, res) => {
  if (req.session && req.session.isAdmin) return res.redirect('/admin');
  res.render('admin/login', { title: 'Admin Login', layout: false });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const validUser = username === ADMIN_USERNAME;
  const validPass = ADMIN_PASSWORD_HASH && verifyPassword(password || '', ADMIN_PASSWORD_HASH);

  if (validUser && validPass) {
    req.session.isAdmin = true;
    req.session.adminUsername = username;
    req.flash('success', 'Welcome back!');
    return res.redirect('/admin');
  }
  req.flash('error', 'Invalid username or password.');
  res.redirect('/admin/login');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// ---------- Dashboard ----------
router.get('/', requireAdmin, (req, res) => {
  const data = getSiteData();
  const messages = getMessages();
  res.render('admin/dashboard', {
    title: 'Admin Dashboard',
    layout: false,
    data,
    messages,
    unreadCount: messages.filter(m => !m.read).length,
    tab: req.query.tab || 'contact'
  });
});

// ---------- Update: Contact info ----------
router.post('/update/contact', requireAdmin, (req, res) => {
  const data = getSiteData();
  data.contact = { ...data.contact, ...req.body };
  saveSiteData(data);
  req.flash('success', 'Contact details updated.');
  res.redirect('/admin?tab=contact');
});

// ---------- Update: Brand ----------
router.post('/update/brand', requireAdmin, (req, res) => {
  const data = getSiteData();
  data.brand = { ...data.brand, ...req.body };
  saveSiteData(data);
  req.flash('success', 'Brand details updated.');
  res.redirect('/admin?tab=brand');
});

// ---------- Upload: Logo ----------
router.post('/update/logo', requireAdmin, (req, res) => {
  logoUpload.single('logo')(req, res, (err) => {
    if (err) {
      req.flash('error', err.message || 'Could not upload logo.');
      return res.redirect('/admin?tab=brand');
    }
    if (!req.file) {
      req.flash('error', 'Please choose an image file to upload.');
      return res.redirect('/admin?tab=brand');
    }
    const data = getSiteData();
    deleteLogoFileIfLocal(data.brand.logoUrl);
    data.brand.logoUrl = `/uploads/${req.file.filename}`;
    saveSiteData(data);
    req.flash('success', 'Logo updated.');
    res.redirect('/admin?tab=brand');
  });
});

// ---------- Remove: Logo ----------
router.post('/remove/logo', requireAdmin, (req, res) => {
  const data = getSiteData();
  deleteLogoFileIfLocal(data.brand.logoUrl);
  data.brand.logoUrl = '';
  saveSiteData(data);
  req.flash('success', 'Logo removed. Showing initials instead.');
  res.redirect('/admin?tab=brand');
});

// ---------- Update: About ----------
router.post('/update/about', requireAdmin, (req, res) => {
  const data = getSiteData();
  const { heading, story, mission, yearFounded, studentsPlaced, partnerUniversities, countriesCovered, visaSuccessRate } = req.body;
  data.about = {
    ...data.about,
    heading, story, mission,
    yearFounded: Number(yearFounded),
    studentsPlaced: Number(studentsPlaced),
    partnerUniversities: Number(partnerUniversities),
    countriesCovered: Number(countriesCovered),
    visaSuccessRate: Number(visaSuccessRate)
  };
  saveSiteData(data);
  req.flash('success', 'About page updated.');
  res.redirect('/admin?tab=about');
});

// ---------- Update: Team member ----------
router.post('/update/team/:index', requireAdmin, (req, res) => {
  const data = getSiteData();
  const idx = parseInt(req.params.index, 10);
  if (data.about.team[idx]) {
    data.about.team[idx] = { ...data.about.team[idx], ...req.body };
    saveSiteData(data);
    req.flash('success', 'Team member updated.');
  }
  res.redirect('/admin?tab=team');
});

router.post('/team/add', requireAdmin, (req, res) => {
  const data = getSiteData();
  data.about.team.push({ name: 'New Team Member', role: 'Role', bio: 'Short bio goes here.' });
  saveSiteData(data);
  req.flash('success', 'Team member added. Edit their details below.');
  res.redirect('/admin?tab=team');
});

router.post('/team/delete/:index', requireAdmin, (req, res) => {
  const data = getSiteData();
  const idx = parseInt(req.params.index, 10);
  if (data.about.team[idx]) {
    data.about.team.splice(idx, 1);
    saveSiteData(data);
    req.flash('success', 'Team member removed.');
  }
  res.redirect('/admin?tab=team');
});

// ---------- Update: Service ----------
router.post('/update/service/:index', requireAdmin, (req, res) => {
  const data = getSiteData();
  const idx = parseInt(req.params.index, 10);
  if (data.services[idx]) {
    data.services[idx] = { ...data.services[idx], ...req.body };
    saveSiteData(data);
    req.flash('success', 'Service updated.');
  }
  res.redirect('/admin?tab=services');
});

router.post('/service/add', requireAdmin, (req, res) => {
  const data = getSiteData();
  data.services.push({ title: 'New Service', description: 'Describe this service.', icon: 'compass' });
  saveSiteData(data);
  req.flash('success', 'Service added. Edit its details below.');
  res.redirect('/admin?tab=services');
});

router.post('/service/delete/:index', requireAdmin, (req, res) => {
  const data = getSiteData();
  const idx = parseInt(req.params.index, 10);
  if (data.services[idx]) {
    data.services.splice(idx, 1);
    saveSiteData(data);
    req.flash('success', 'Service removed.');
  }
  res.redirect('/admin?tab=services');
});

// ---------- Update: Process step ----------
router.post('/update/process/:index', requireAdmin, (req, res) => {
  const data = getSiteData();
  const idx = parseInt(req.params.index, 10);
  if (data.process[idx]) {
    data.process[idx] = { ...data.process[idx], ...req.body };
    saveSiteData(data);
    req.flash('success', 'Process step updated.');
  }
  res.redirect('/admin?tab=process');
});

// ---------- Update: Testimonial ----------
router.post('/update/testimonial/:index', requireAdmin, (req, res) => {
  const data = getSiteData();
  const idx = parseInt(req.params.index, 10);
  if (data.testimonials[idx]) {
    data.testimonials[idx] = { ...data.testimonials[idx], ...req.body };
    saveSiteData(data);
    req.flash('success', 'Testimonial updated.');
  }
  res.redirect('/admin?tab=testimonials');
});

router.post('/testimonial/add', requireAdmin, (req, res) => {
  const data = getSiteData();
  data.testimonials.push({ name: 'Student Name', detail: 'Program, University', quote: 'Add their story here.' });
  saveSiteData(data);
  req.flash('success', 'Testimonial added.');
  res.redirect('/admin?tab=testimonials');
});

router.post('/testimonial/delete/:index', requireAdmin, (req, res) => {
  const data = getSiteData();
  const idx = parseInt(req.params.index, 10);
  if (data.testimonials[idx]) {
    data.testimonials.splice(idx, 1);
    saveSiteData(data);
    req.flash('success', 'Testimonial removed.');
  }
  res.redirect('/admin?tab=testimonials');
});

// ---------- Messages ----------
router.post('/messages/:id/read', requireAdmin, (req, res) => {
  markMessageRead(req.params.id);
  res.redirect('/admin?tab=messages');
});

router.post('/messages/:id/delete', requireAdmin, (req, res) => {
  deleteMessage(req.params.id);
  req.flash('success', 'Message deleted.');
  res.redirect('/admin?tab=messages');
});

// ---------- Change password ----------
router.post('/change-password', requireAdmin, (req, res) => {
  // In this simple file-based demo, password is stored via env var.
  // We surface a clear message rather than silently no-op, since .env isn't writable at runtime safely.
  req.flash('error', 'To change the password, update ADMIN_PASSWORD_HASH in the .env file (see README) and restart the server.');
  res.redirect('/admin?tab=settings');
});

module.exports = router;