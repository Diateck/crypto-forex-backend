const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.POSTGRES_URL || 'postgresql://postgres:OLyinkaprecious5161@db.slnbdrinhhnbvxmylquh.supabase.co:5432/postgres', {
  dialect: 'postgres',
  logging: false,
});

module.exports = sequelize;
