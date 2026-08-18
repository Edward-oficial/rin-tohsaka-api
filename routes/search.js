const express = require('express');
const { requireApiKey } = require('./apiAuth');

const router = express.Router();

// GET /api/search?query=...&apikey=...
router.get('/', requireApiKey, (req, res) => {
    const query = req.query.query || req.query.q;
    if (!query) {
        return res.status(400).json({ status: false, message: 'Falta el parámetro query.' });
    }

    res.json({
        status: true,
        creator: 'Rin-Tohsaka API',
        query,
        result: [
            { title: `Resultado de ejemplo para "${query}" #1`, url: 'https://example.com/1' },
            { title: `Resultado de ejemplo para "${query}" #2`, url: 'https://example.com/2' },
        ],
    });
});

module.exports = router;
