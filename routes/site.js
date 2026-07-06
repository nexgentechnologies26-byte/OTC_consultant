const express = require('express');
const router = express.Router();
const { getSiteData, addMessage } = require('../utils/dataStore');

router.get('/', (req, res) => {
  const data = getSiteData();
  res.render('home', {
    page: 'home',
    title: data.brand.name,
    data
  });
});

router.get('/about', (req, res) => {
  const data = getSiteData();
  res.render('about', {
    page: 'about',
    title: `About Us | ${data.brand.name}`,
    data
  });
});

router.get('/services', (req, res) => {
  const data = getSiteData();
  res.render('services', {
    page: 'services',
    title: `Services | ${data.brand.name}`,
    data
  });
});

router.get('/contact', (req, res) => {
  const data = getSiteData();
  res.render('contact', {
    page: 'contact',
    title: `Contact Us | ${data.brand.name}`,
    data,
    success: req.query.success === '1'
  });
});

router.post('/contact', (req, res) => {
  const { name, email, phone, interest, message } = req.body;

  if (!name || !email || !message) {
    const data = getSiteData();
    return res.status(400).render('contact', {
      page: 'contact',
      title: `Contact Us | ${data.brand.name}`,
      data,
      success: false,
      formError: 'Please fill in your name, email, and message before sending.',
      formValues: req.body
    });
  }

  addMessage({ name, email, phone, interest, message });
  res.redirect('/contact?success=1');
});

module.exports = router;
