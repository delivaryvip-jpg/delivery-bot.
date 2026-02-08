const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./points.db');

db.run(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  points INTEGER DEFAULT 0,
  messages INTEGER DEFAULT 0
)
`);

module.exports = db;
