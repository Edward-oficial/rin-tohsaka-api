const { stmts } = require('../db');

function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

// Middleware de API key — lee ?apikey= o header apikey
function requireApiKey(req, res, next) {
    const key = req.query.apikey || req.headers['apikey'];
    if (!key) return res.status(401).json({ status: false, message: 'Falta el parámetro apikey.' });

    const user = stmts.findByKey.get(key);
    if (!user) return res.status(401).json({ status: false, message: 'API key inválida.' });
    if (!user.verified) return res.status(403).json({ status: false, message: 'Cuenta no verificada.' });

    const today = todayStr();
    if (user.last_request_date !== today) {
        stmts.resetDaily.run(today, user.id);
        user.request_today = 0;
    }

    if (user.role !== 'ceo' && user.request_today >= user.limit_req) {
        return res.status(429).json({ status: false, message: 'Alcanzaste el límite de solicitudes de tu plan.' });
    }

    stmts.incrementRequest.run(today, user.id);
    req.rinApiUser = user;
    next();
}

module.exports = { requireApiKey };
