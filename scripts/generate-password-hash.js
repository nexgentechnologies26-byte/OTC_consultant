const { hashPassword } = require('../utils/auth');

const password = process.argv[2];

if (!password) {
  console.log('Usage: node scripts/generate-password-hash.js "yourNewPassword"');
  process.exit(1);
}

console.log('\nAdd this line to your .env file:\n');
console.log(`ADMIN_PASSWORD_HASH=${hashPassword(password)}\n`);
