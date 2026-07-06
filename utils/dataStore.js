const fs = require('fs');
const path = require('path');

const SITE_DATA_PATH = path.join(__dirname, '..', 'data', 'site-data.json');
const MESSAGES_PATH = path.join(__dirname, '..', 'data', 'messages.json');

function ensureMessagesFile() {
  if (!fs.existsSync(MESSAGES_PATH)) {
    fs.writeFileSync(MESSAGES_PATH, '[]', 'utf-8');
  }
}

function getSiteData() {
  const raw = fs.readFileSync(SITE_DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function saveSiteData(data) {
  fs.writeFileSync(SITE_DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function getMessages() {
  ensureMessagesFile();
  const raw = fs.readFileSync(MESSAGES_PATH, 'utf-8');
  return JSON.parse(raw);
}

function addMessage(message) {
  ensureMessagesFile();
  const messages = getMessages();
  messages.unshift({
    id: Date.now().toString(),
    read: false,
    createdAt: new Date().toISOString(),
    ...message
  });
  fs.writeFileSync(MESSAGES_PATH, JSON.stringify(messages, null, 2), 'utf-8');
  return messages[0];
}

function markMessageRead(id) {
  const messages = getMessages();
  const updated = messages.map(m => (m.id === id ? { ...m, read: true } : m));
  fs.writeFileSync(MESSAGES_PATH, JSON.stringify(updated, null, 2), 'utf-8');
}

function deleteMessage(id) {
  const messages = getMessages();
  const updated = messages.filter(m => m.id !== id);
  fs.writeFileSync(MESSAGES_PATH, JSON.stringify(updated, null, 2), 'utf-8');
}

module.exports = {
  getSiteData,
  saveSiteData,
  getMessages,
  addMessage,
  markMessageRead,
  deleteMessage
};
