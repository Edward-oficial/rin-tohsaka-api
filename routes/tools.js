const express = require('express');
const { stmts } = require('../db');

const router = express.Router();

// Middleware API key (header x-api-key o query key)
function requireApiKey(req, res, next) {
    const key = req.headers['x-api-key'] || req.query.key;
    if (!key) return res.status(401).json({ status: false, message: 'Falta API key.' });

    const user = stmts.findByKey.get(key);
    if (!user) return res.status(401).json({ status: false, message: 'API key inválida.' });
    if (!user.verified) return res.status(401).json({ status: false, message: 'Cuenta no verificada.' });

    // Rate limit simple
    const today = new Date().toISOString().slice(0, 10);
    if (user.last_request_date !== today) {
        stmts.resetDaily.run(today, user.id);
        user.request_today = 0;
    }

    if (user.request_today >= user.limit_req) {
        return res.status(429).json({ status: false, message: 'Límite de solicitudes alcanzado.' });
    }

    stmts.incrementRequest.run(today, user.id);
    req.rinUser = user;
    next();
}

// GET /api/tools/search?q=...
// Reemplaza la lógica interna por la búsqueda real que necesites.
router.get('/search', requireApiKey, (req, res) => {
    const q = req.query.q;
    if (!q) return res.status(400).json({ status: false, message: 'Falta el parámetro q.' });

    res.json({
        status: true,
        creator: 'Rin-Tohsaka API',
        query: q,
        result: [
            { title: `Resultado de ejemplo para "${q}" #1`, url: 'https://example.com/1' },
            { title: `Resultado de ejemplo para "${q}" #2`, url: 'https://example.com/2' },
        ],
    });
});

module.exports = router;
