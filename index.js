const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { initSchema } = require('./db');
const { seedCeo } = require('./seedCeo');
const { router: authRouter } = require('./routes/auth');
const adminRouter = require('./routes/admin');
const toolsRouter = require('./routes/tools');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.set('trust proxy', 1);

// ===== API =====
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/tools', toolsRouter);

// ===== Archivos estáticos (css, js, imágenes) =====
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
app.use('/public', express.static(path.join(__dirname, 'public')));

const pages = path.join(__dirname, 'public', 'pages');

function sendPage(name) {
    return (req, res) => res.sendFile(path.join(pages, name));
}

// Helper async: exige sesión de servidor antes de servir una página protegida
async function pageAuth(req, res, next) {
    try {
        const { stmts } = require('./db');
        const key = req.cookies['rin_session'];
        const user = key ? await stmts.findByKey.get(key) : null;
        if (!user || !user.verified) return res.redirect('/register');
        req.rinPageUser = user;
        next();
    } catch (err) {
        console.error('[pageAuth]', err);
        res.redirect('/register');
    }
}

function pageCeoOnly(req, res, next) {
    if (!req.rinPageUser || req.rinPageUser.role !== 'ceo') return res.redirect('/docs');
    next();
}

// ===== Páginas públicas =====
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', sendPage('login.html'));
app.get('/register', sendPage('register.html'));
app.get('/verify', sendPage('verify.html'));

// ===== Páginas protegidas (requieren sesión) =====
app.get('/docs', pageAuth, sendPage('docs.html'));
app.get('/docs/search', pageAuth, sendPage('docs-search.html'));
app.get('/docs/settings', pageAuth, sendPage('settings.html'));

// ===== Panel — solo CEO =====
app.get('/panel', pageAuth, pageCeoOnly, sendPage('panel.html'));

// ===== 404 =====
app.use((req, res) => {
    res.status(404).sendFile(path.join(pages, '404.html'));
});

// Arranque: inicializa schema de Turso + seed CEO + listen
async function start() {
    try {
        console.log('[db] Conectando a Turso...');
        await initSchema();
        console.log('[db] Schema listo');
        await seedCeo();
        app.listen(PORT, () => {
            console.log(`Rin-Tohsaka API corriendo en el puerto ${PORT}`);
        });
    } catch (err) {
        console.error('[start] Error al iniciar:', err);
        process.exit(1);
    }
}

start();
