const { Sequelize } = require('sequelize');

let sequelize;

/**
 * Create a test database connection using PostgreSQL.
 * Expects DB_HOST, DB_PORT, DB_USER, DB_PASSWORD env vars (or uses defaults).
 * Creates the test database if it doesn't exist.
 */
async function setupTestDB() {
  const DB_NAME = process.env.DB_NAME || 'gestion_aulas_test';
  const DB_USER = process.env.DB_USER || 'postgres';
  const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
  const DB_HOST = process.env.DB_HOST || 'localhost';
  const DB_PORT = process.env.DB_PORT || 5432;

  // Connect to postgres to create test DB if needed
  const adminSequelize = new Sequelize('postgres', DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'postgres',
    logging: false,
  });

  try {
    await adminSequelize.query(`CREATE DATABASE "${DB_NAME}" WITH OWNER '${DB_USER}'`);
    console.log(`  ✅ Test database "${DB_NAME}" created`);
  } catch (error) {
    if (error.parent?.code === '42P04') {
      // Database already exists — fine
    } else {
      console.warn(`  ⚠️  Could not create test DB: ${error.message}`);
    }
  } finally {
    await adminSequelize.close();
  }

  // Connect to test database
  sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'postgres',
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  });

  await sequelize.authenticate();
  return sequelize;
}

/**
 * Sync all models (create tables) before tests.
 */
async function syncModels() {
  // Load all models and their associations
  require('../src/models');
  await sequelize.sync({ force: true }); // force: true drops and recreates tables
}

/**
 * Drop all tables and close connection after tests.
 */
async function teardownTestDB() {
  if (sequelize) {
    await sequelize.sync({ force: true }); // clean up
    await sequelize.close();
  }
}

/**
 * Get the test Sequelize instance.
 */
function getTestSequelize() {
  return sequelize;
}

module.exports = {
  setupTestDB,
  syncModels,
  teardownTestDB,
  getTestSequelize,
};
