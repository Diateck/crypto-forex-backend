const bcrypt = require('bcryptjs');
const password = process.argv[2] || 'TempAdmin!2025';
const rounds = parseInt(process.argv[3], 10) || 10;

bcrypt.hash(password, rounds, (err, hash) => {
  if (err) {
    console.error('Hash error:', err);
    process.exit(1);
  }
  console.log(hash);
});
