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

// Middleware — requiere sesión activa (async)
async function requireAuth(req, res, next) {
    try {
        const key = req.cookies[COOKIE_NAME];
        if (!key) return res.status(401).json({ status: false, message: 'No hay sesión activa.' });
        const user = await stmts.findByKey.get(key);
        if (!user) return res.status(401).json({ status: false, message: 'Sesión inválida.' });
        if (!user.verified) return res.status(401).json({ status: false, message: 'Cuenta no verificada.' });
        req.rinUser = user;
        next();
    } catch (err) {
        console.error('[requireAuth]', err);
        res.status(500).json({ status: false, message: 'Error de base de datos.' });
    }
}

// Middleware — requiere rol ceo
function requireCeo(req, res, next) {
    if (!req.rinUser || req.rinUser.role !== 'ceo') {
        return res.status(403).json({ status: false, message: 'Acceso restringido al CEO.' });
    }
    next();
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body || {};
        if (!username || !email || !password) {
            return res.status(400).json({ status: false, message: 'Completa todos los campos.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ status: false, message: 'La contraseña debe tener al menos 6 caracteres.' });
        }

        const existingEmail = await stmts.findByEmail.get(email.toLowerCase().trim());
        if (existingEmail) {
            if (!existingEmail.verified) {
                const code = genCode();
                await stmts.setVerifyCode.run(code, existingEmail.email);
                return res.json({ status: true, message: 'Ya tenías una cuenta pendiente de verificación.', email: existingEmail.email, code });
            }
            return res.status(409).json({ status: false, message: 'Ese correo ya está registrado.' });
        }

        const existingUser = await stmts.findByUsername.get(username.trim());
        if (existingUser) {
            return res.status(409).json({ status: false, message: 'Ese nombre de usuario ya está en uso.' });
        }

        const key = genKey();
        const code = genCode();

        await stmts.createUser.run(
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

        res.json({ status: true, message: 'Cuenta creada. Confirma tu código de verificación.', email: email.toLowerCase().trim(), code });
    } catch (err) {
        console.error('[register]', err);
        res.status(500).json({ status: false, message: 'Error al registrar.' });
    }
});

// POST /api/auth/verify
router.post('/verify', async (req, res) => {
    try {
        const { email, code } = req.body || {};
        if (!email || !code) return res.status(400).json({ status: false, message: 'Faltan datos.' });

        const user = await stmts.findByEmail.get(email.toLowerCase().trim());
        if (!user) return res.status(404).json({ status: false, message: 'Cuenta no encontrada.' });
        if (user.verified) return res.json({ status: true, message: 'La cuenta ya estaba verificada.' });
        if (user.verify_code !== String(code).trim()) {
            return res.status(400).json({ status: false, message: 'Código incorrecto.' });
        }

        await stmts.markVerified.run(user.email);
        res.cookie(COOKIE_NAME, user.key, COOKIE_OPTS);
        res.json({ status: true, message: 'Cuenta verificada.' });
    } catch (err) {
        console.error('[verify]', err);
        res.status(500).json({ status: false, message: 'Error al verificar.' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) return res.status(400).json({ status: false, message: 'Completa todos los campos.' });

        const user = await stmts.findByEmail.get(email.toLowerCase().trim());
        if (!user || user.password !== password) {
            return res.status(401).json({ status: false, message: 'Correo o contraseña incorrectos.' });
        }

        if (!user.verified) {
            const code = genCode();
            await stmts.setVerifyCode.run(code, user.email);
            return res.status(403).json({ status: false, needsVerify: true, email: user.email, code, message: 'Tu cuenta no está verificada.' });
        }

        res.cookie(COOKIE_NAME, user.key, COOKIE_OPTS);
        res.json({ status: true, message: 'Sesión iniciada.' });
    } catch (err) {
        console.error('[login]', err);
        res.status(500).json({ status: false, message: 'Error al iniciar sesión.' });
    }
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

// POST /api/auth/update-profile
router.post('/update-profile', requireAuth, async (req, res) => {
    try {
        const { username, profile_img } = req.body || {};
        const current = req.rinUser;
        const newUsername = (username || current.username).trim();
        const newImg = (profile_img || current.profile_img).trim();

        if (newUsername !== current.username) {
            const taken = await stmts.findByUsername.get(newUsername);
            if (taken && taken.id !== current.id) {
                return res.status(409).json({ status: false, message: 'Ese nombre de usuario ya está en uso.' });
            }
        }

        await stmts.updateProfile.run(newUsername, newImg, current.id);
        res.json({ status: true, message: 'Perfil actualizado.' });
    } catch (err) {
        console.error('[update-profile]', err);
        res.status(500).json({ status: false, message: 'Error al actualizar perfil.' });
    }
});

// GET /api/auth/stats
router.get('/stats', async (req, res) => {
    try {
        const row = await stmts.countUsers.get();
        res.json({ status: true, users: row ? row.count : 0 });
    } catch (err) {
        res.json({ status: true, users: 0 });
    }
});

module.exports = { router, requireAuth, requireCeo, COOKIE_NAME };
