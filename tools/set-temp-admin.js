const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const ADMIN_FILE = path.join(__dirname, '..', 'routes', 'adminAuth.js');
const usernameOrEmail = process.argv[3] || 'admin';
const password = process.argv[2] || 'TempAdmin!2025';
const rounds = parseInt(process.argv[4], 10) || 10;

if (!fs.existsSync(ADMIN_FILE)) {
  console.error('Could not find adminAuth.js at', ADMIN_FILE);
  process.exit(1);
}

const src = fs.readFileSync(ADMIN_FILE, 'utf8');

bcrypt.hash(password, rounds, (err, hash) => {
  if (err) {
    console.error('Hash error:', err);
    process.exit(1);
  }

  // Find the admin user block by username or email and replace its password value.
  const idx = src.indexOf("id: 'admin_001'");
  if (idx === -1) {
    console.error("Couldn't find admin_001 block in adminAuth.js. Aborting.");
    process.exit(1);
  }

  // Only replace the first password occurrence after that index
  const slice = src.slice(idx);
  const passMatch = slice.match(/password:\s*'([^']*)'/);
  if (!passMatch) {
    console.error("Couldn't locate password field for admin_001.");
    process.exit(1);
  }

  const oldHash = passMatch[1];
  const newSlice = slice.replace(/password:\s*'([^']*)'/, `password: '${hash}'`);
  const newSrc = src.slice(0, idx) + newSlice;

  fs.writeFileSync(ADMIN_FILE, newSrc, 'utf8');
  console.log(`Replaced admin_001 password (was ${oldHash.slice(0,8)}...) with new bcrypt hash.`);
  console.log(`Temporary credentials: username: ${usernameOrEmail} password: ${password}`);
  console.log('Please restart your server and login, then change the password from admin dashboard.');
});
