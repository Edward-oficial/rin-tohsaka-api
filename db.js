const { createClient } = require('@libsql/client');
require('dotenv').config();

// ── Turso (libSQL) ──────────────────────────────────────────────
// Token visible a propósito (pedido por el usuario)
const TURSO_URL = process.env.TURSO_DATABASE_URL || 'libsql://xd-edward-oficial.aws-us-east-1.turso.io';
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODcwMjgxNzUsImlkIjoiMDFhMDEzMmMtOWQwMS03NDk1LTk4ODEtZjdiZGRkZjY2NDMyIiwia2lkIjoiTmZrcUg0a2FFRFlTNmxIMDhsc01Uc2VUQWdocDV4eUVBVEdIdHhKWVViMCIsInJpZCI6IjE3YmUxYmIzLTJiZGMtNDhiYi1iZDUwLWUzNTUzNjJlOTU5NSJ9.uQ6chO970wmshIG2EsCl8OWbDSQpwUymkz946gwNBrZWU-CLjaVMS-s25zmfOV7p-exsh37fJS6TnMmVkwYaDw';

const client = createClient({
    url: TURSO_URL,
    authToken: TURSO_TOKEN,
});

/** Helper: convierte el API sync-style (get/run/all) a async sobre libSQL */
function makeStmt(sql) {
    return {
        async get(...args) {
            const result = await client.execute({ sql, args });
            return result.rows[0] || null;
        },
        async all(...args) {
            const result = await client.execute({ sql, args });
            return result.rows;
        },
        async run(...args) {
            return client.execute({ sql, args });
        },
    };
}

async function initSchema() {
    await client.execute(`
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

    await client.execute(`
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

    await client.execute(`
        CREATE TABLE IF NOT EXISTS redeem_uses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL,
            user_email TEXT NOT NULL,
            used_at TEXT DEFAULT (datetime('now')),
            UNIQUE(code, user_email)
        )
    `);

    // Migraciones suaves (si la tabla ya existía sin estas columnas)
    try { await client.execute(`ALTER TABLE users ADD COLUMN verified INTEGER DEFAULT 0`); } catch (_) {}
    try { await client.execute(`ALTER TABLE users ADD COLUMN verify_code TEXT DEFAULT NULL`); } catch (_) {}
}

const stmts = {
    // Usuarios
    findByEmail: makeStmt('SELECT * FROM users WHERE email = ?'),
    findByUsername: makeStmt('SELECT * FROM users WHERE username = ?'),
    findByKey: makeStmt('SELECT * FROM users WHERE key = ?'),
    findById: makeStmt('SELECT * FROM users WHERE id = ?'),
    getAllUsers: makeStmt('SELECT * FROM users ORDER BY total_request DESC'),
    countUsers: makeStmt('SELECT COUNT(*) as count FROM users'),
    createUser: makeStmt(`
        INSERT INTO users (username, email, password, key, role, plan, limit_req, profile_img, verified, verify_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    updateUser: makeStmt(`
        UPDATE users SET
            username = ?, email = ?, password = ?, key = ?, role = ?,
            plan = ?, limit_req = ?, profile_img = ?, vip_since = ?, vip_expires = ?,
            request_today = ?, total_request = ?, last_request_date = ?, last_free_refill = ?
        WHERE id = ?
    `),
    deleteUser: makeStmt('DELETE FROM users WHERE email = ?'),
    addRequests: makeStmt('UPDATE users SET limit_req = limit_req + ? WHERE id = ?'),
    setVerifyCode: makeStmt('UPDATE users SET verify_code = ? WHERE email = ?'),
    markVerified: makeStmt('UPDATE users SET verified = 1, verify_code = NULL WHERE email = ?'),
    updateProfile: makeStmt('UPDATE users SET username = ?, profile_img = ? WHERE id = ?'),
    incrementRequest: makeStmt(`
        UPDATE users SET request_today = request_today + 1, total_request = total_request + 1, last_request_date = ?
        WHERE id = ?
    `),
    resetDaily: makeStmt('UPDATE users SET request_today = 0, last_free_refill = ? WHERE id = ?'),

    // Códigos
    findCode: makeStmt('SELECT * FROM redeem_codes WHERE code = ?'),
    getAllCodes: makeStmt('SELECT * FROM redeem_codes ORDER BY created_at DESC'),
    createCode: makeStmt('INSERT INTO redeem_codes (code, requests, max_uses) VALUES (?, ?, ?)'),
    updateCode: makeStmt('UPDATE redeem_codes SET uses = uses + 1, active = ? WHERE code = ?'),
    deleteCode: makeStmt('DELETE FROM redeem_codes WHERE code = ?'),
    hasUsedCode: makeStmt('SELECT * FROM redeem_uses WHERE code = ? AND user_email = ?'),
    registerUse: makeStmt('INSERT INTO redeem_uses (code, user_email) VALUES (?, ?)'),
};

module.exports = { client, stmts, initSchema };
