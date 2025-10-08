const { Sequelize } = require('sequelize');

// Support multiple env var names: prefer DATABASE_URL (Render standard),
// but accept POSTGRES_URL or PG_CONNECTION_STRING as fallbacks.
const rawConnection = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PG_CONNECTION_STRING || null;

// Normalize (remove accidental surrounding quotes and trim)
const connectionString = rawConnection ? rawConnection.replace(/^\s*"?(.*)"?\s*$/, '$1').trim() : null;

if (connectionString) {
  const usedVar = process.env.DATABASE_URL ? 'DATABASE_URL' : (process.env.POSTGRES_URL ? 'POSTGRES_URL' : 'PG_CONNECTION_STRING');
  console.log(`Using database connection from environment variable: ${usedVar}`);
} else {
  console.error('No database connection string found. Please set DATABASE_URL (preferred) or POSTGRES_URL in your environment.');
}

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  logging: false,
});

module.exports = sequelize;
