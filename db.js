const Database = require('infinitysqlite');
const path = require('path');

const db = new Database(path.join(__dirname, 'data.db'));

db.exec('PRAGMA journal_mode = WAL;');

// Tabla de usuarios
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        key TEXT UNIQUE NOT NULL,
        role TEXT DEFAULT 'user',
        plan TEXT DEFAULT 'free',
        limit_req INTEGER DEFAULT 100,
        request_today INTEGER DEFAULT 0,
        total_request INTEGER DEFAULT 0,
        last_request_date TEXT DEFAULT '',
        last_free_refill TEXT DEFAULT '',
        profile_img TEXT DEFAULT 'https://i.ibb.co/chJXMd0q/NAGI-REO-RIN-SAE-ISAGI.jpg',
        vip_since TEXT DEFAULT NULL,
        vip_expires TEXT DEFAULT NULL,
        verified INTEGER DEFAULT 0,
        verify_code TEXT DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now'))
    )
`);

// Tabla de códigos redeem
db.exec(`
    CREATE TABLE IF NOT EXISTS redeem_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        requests INTEGER NOT NULL,
        max_uses INTEGER NOT NULL,
        uses INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
    )
`);

// Tabla de usos de códigos (para evitar doble canje)
db.exec(`
    CREATE TABLE IF NOT EXISTS redeem_uses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL,
        user_email TEXT NOT NULL,
        used_at TEXT DEFAULT (datetime('now')),
        UNIQUE(code, user_email)
    )
`);

// Intenta agregar columnas nuevas si la db ya existia de una version anterior
try { db.exec(`ALTER TABLE users ADD COLUMN verified INTEGER DEFAULT 0`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN verify_code TEXT DEFAULT NULL`); } catch (e) {}

// Prepared statements
const stmts = {
    // Usuarios
    findByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
    findByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
    findByKey: db.prepare('SELECT * FROM users WHERE key = ?'),
    findById: db.prepare('SELECT * FROM users WHERE id = ?'),
    getAllUsers: db.prepare('SELECT * FROM users ORDER BY total_request DESC'),
    countUsers: db.prepare('SELECT COUNT(*) as count FROM users'),
    createUser: db.prepare(`
        INSERT INTO users (username, email, password, key, role, plan, limit_req, profile_img, verified, verify_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    updateUser: db.prepare(`
        UPDATE users SET
            username = ?, email = ?, password = ?, key = ?, role = ?,
            plan = ?, limit_req = ?, profile_img = ?, vip_since = ?, vip_expires = ?,
            request_today = ?, total_request = ?, last_request_date = ?, last_free_refill = ?
        WHERE id = ?
    `),
    deleteUser: db.prepare('DELETE FROM users WHERE email = ?'),
    addRequests: db.prepare('UPDATE users SET limit_req = limit_req + ? WHERE id = ?'),
    setVerifyCode: db.prepare('UPDATE users SET verify_code = ? WHERE email = ?'),
    markVerified: db.prepare(`UPDATE users SET verified = 1, verify_code = NULL WHERE email = ?`),
    updateProfile: db.prepare('UPDATE users SET username = ?, profile_img = ? WHERE id = ?'),
    incrementRequest: db.prepare(`
        UPDATE users SET request_today = request_today + 1, total_request = total_request + 1, last_request_date = ?
        WHERE id = ?
    `),
    resetDaily: db.prepare(`UPDATE users SET request_today = 0, last_free_refill = ? WHERE id = ?`),

    // Codigos
    findCode: db.prepare('SELECT * FROM redeem_codes WHERE code = ?'),
    getAllCodes: db.prepare('SELECT * FROM redeem_codes ORDER BY created_at DESC'),
    createCode: db.prepare('INSERT INTO redeem_codes (code, requests, max_uses) VALUES (?, ?, ?)'),
    updateCode: db.prepare('UPDATE redeem_codes SET uses = uses + 1, active = ? WHERE code = ?'),
    deleteCode: db.prepare('DELETE FROM redeem_codes WHERE code = ?'),
    hasUsedCode: db.prepare('SELECT * FROM redeem_uses WHERE code = ? AND user_email = ?'),
    registerUse: db.prepare('INSERT INTO redeem_uses (code, user_email) VALUES (?, ?)'),
};

module.exports = { db, stmts };
