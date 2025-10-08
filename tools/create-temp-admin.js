const bcrypt = require('bcryptjs');
const User = require('../models/User');
const sequelize = require('../db');

async function createAdmin() {
  await sequelize.sync();
  const email = 'admin@temp.local';
  const name = 'admin';
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);

  let admin = await User.findOne({ where: { email } });
  if (admin) {
    await admin.update({ password: hash, isActive: true, name });
    console.log('Admin user updated:', email);
  } else {
    admin = await User.create({ name, email, password: hash, isActive: true });
    console.log('Admin user created:', email);
  }
  console.log('Temporary credentials:');
  console.log('Email:', email);
  console.log('Password:', password);
}

createAdmin().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
