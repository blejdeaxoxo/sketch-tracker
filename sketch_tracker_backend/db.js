const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool to the database using the variables from .env
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

// Export the query function so other files can use it
module.exports = {
  query: (text, params) => pool.query(text, params),
};