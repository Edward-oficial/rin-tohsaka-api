const express = require('express');
const crypto = require('crypto');
const { stmts } = require('../db');

const router = express.Router();

const COOKIE_NAME = 'rin_session';
const COOKIE_OPTS = {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 dias
};

function genKey() {
    return 'RINT-' + crypto.randomBytes(6).toString('hex').toUpperCase();
}

function genCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function publicUser(u) {
    if (!u) return null;
    return {
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        plan: u.plan,
        limit_req: u.limit_req,
        request_today: u.request_today,
        total_request: u.total_request,
        profile_img: u.profile_img,
        key: u.key,
        verified: !!u.verified,
    };
}

// Middleware — requiere sesión activa
function requireAuth(req, res, next) {
    const key = req.cookies[COOKIE_NAME];
    if (!key) return res.status(401).json({ status: false, message: 'No hay sesión activa.' });
    const user = stmts.findByKey.get(key);
    if (!user) return res.status(401).json({ status: false, message: 'Sesión inválida.' });
    if (!user.verified) return res.status(401).json({ status: false, message: 'Cuenta no verificada.' });
    req.rinUser = user;
    next();
}

// Middleware — requiere rol ceo
function requireCeo(req, res, next) {
    if (!req.rinUser || req.rinUser.role !== 'ceo') {
        return res.status(403).json({ status: false, message: 'Acceso restringido al CEO.' });
    }
    next();
}

// POST /api/auth/register
router.post('/register', (req, res) => {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) {
        return res.status(400).json({ status: false, message: 'Completa todos los campos.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ status: false, message: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    const existingEmail = stmts.findByEmail.get(email.toLowerCase().trim());
    if (existingEmail) {
        if (!existingEmail.verified) {
            // Ya existe pero sin verificar: reenvía (regenera) el código en vez de bloquear
            const code = genCode();
            stmts.setVerifyCode.run(code, existingEmail.email);
            return res.json({ status: true, message: 'Ya tenías una cuenta pendiente de verificación.', email: existingEmail.email, code });
        }
        return res.status(409).json({ status: false, message: 'Ese correo ya está registrado.' });
    }

    const existingUser = stmts.findByUsername.get(username.trim());
    if (existingUser) {
        return res.status(409).json({ status: false, message: 'Ese nombre de usuario ya está en uso.' });
    }

    const key = genKey();
    const code = genCode();

    stmts.createUser.run(
        username.trim(),
        email.toLowerCase().trim(),
        password,
        key,
        'user',
        'free',
        100,
        'https://i.ibb.co/chJXMd0q/NAGI-REO-RIN-SAE-ISAGI.jpg',
        0,
        code
    );

    // No hay servicio de correo externo conectado: el código se entrega directamente
    // en la respuesta para mostrarlo en /verify.
    res.json({ status: true, message: 'Cuenta creada. Confirma tu código de verificación.', email: email.toLowerCase().trim(), code });
});

// POST /api/auth/verify
router.post('/verify', (req, res) => {
    const { email, code } = req.body || {};
    if (!email || !code) return res.status(400).json({ status: false, message: 'Faltan datos.' });

    const user = stmts.findByEmail.get(email.toLowerCase().trim());
    if (!user) return res.status(404).json({ status: false, message: 'Cuenta no encontrada.' });
    if (user.verified) return res.json({ status: true, message: 'La cuenta ya estaba verificada.' });
    if (user.verify_code !== String(code).trim()) {
        return res.status(400).json({ status: false, message: 'Código incorrecto.' });
    }

    stmts.markVerified.run(user.email);
    res.cookie(COOKIE_NAME, user.key, COOKIE_OPTS);
    res.json({ status: true, message: 'Cuenta verificada.' });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ status: false, message: 'Completa todos los campos.' });

    const user = stmts.findByEmail.get(email.toLowerCase().trim());
    if (!user || user.password !== password) {
        return res.status(401).json({ status: false, message: 'Correo o contraseña incorrectos.' });
    }

    if (!user.verified) {
        const code = genCode();
        stmts.setVerifyCode.run(code, user.email);
        return res.status(403).json({ status: false, needsVerify: true, email: user.email, code, message: 'Tu cuenta no está verificada.' });
    }

    res.cookie(COOKIE_NAME, user.key, COOKIE_OPTS);
    res.json({ status: true, message: 'Sesión iniciada.' });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ status: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
    res.json({ status: true, user: publicUser(req.rinUser) });
});

// POST /api/auth/update-profile — cambiar nombre y/o foto (URL)
router.post('/update-profile', requireAuth, (req, res) => {
    const { username, profile_img } = req.body || {};
    const current = req.rinUser;
    const newUsername = (username || current.username).trim();
    const newImg = (profile_img || current.profile_img).trim();

    if (newUsername !== current.username) {
        const taken = stmts.findByUsername.get(newUsername);
        if (taken && taken.id !== current.id) {
            return res.status(409).json({ status: false, message: 'Ese nombre de usuario ya está en uso.' });
        }
    }

    stmts.updateProfile.run(newUsername, newImg, current.id);
    res.json({ status: true, message: 'Perfil actualizado.' });
});

// GET /api/auth/stats — usado en el index público
router.get('/stats', (req, res) => {
    const row = stmts.countUsers.get();
    res.json({ status: true, users: row ? row.count : 0 });
});

module.exports = { router, requireAuth, requireCeo, COOKIE_NAME };
