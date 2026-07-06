require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser');

const siteRoutes = require('./routes/site');
const adminRoutes = require('./routes/admin');
const { getSiteData } = require('./utils/dataStore');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'partials/layout');

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Sessions & flash messages
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 4 } // 4 hours
}));
app.use(flash());

// Make flash + current path available to all views
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.currentPath = req.path;
  next();
});

// Routes
app.use('/admin', adminRoutes);
app.use('/', siteRoutes);

// 404
app.use((req, res) => {
  const data = getSiteData();
  res.status(404).render('404', { title: 'Page Not Found', page: '', data });
});

app.listen(PORT, () => {
  console.log(`Pathway Study Consultants site running at http://localhost:${PORT}`);
});
