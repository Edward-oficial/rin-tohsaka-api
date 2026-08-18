const express = require('express');
const { stmts } = require('../db');
const { requireAuth, requireCeo } = require('./auth');

const router = express.Router();

router.use(requireAuth, requireCeo);

// GET /api/admin/users — incluye correo y contraseña (visible solo para el CEO, uso interno)
router.get('/users', (req, res) => {
    const users = stmts.getAllUsers.all().map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        password: u.password,
        role: u.role,
        plan: u.plan,
        limit_req: u.limit_req,
        request_today: u.request_today,
        total_request: u.total_request,
        verified: !!u.verified,
        key: u.key,
        created_at: u.created_at,
    }));
    res.json({ status: true, users });
});

// POST /api/admin/add-requests { email, amount }
router.post('/add-requests', (req, res) => {
    const { email, amount } = req.body || {};
    if (!email || !amount) return res.status(400).json({ status: false, message: 'Faltan datos.' });

    const user = stmts.findByEmail.get(email.toLowerCase().trim());
    if (!user) return res.status(404).json({ status: false, message: 'Usuario no encontrado.' });

    stmts.addRequests.run(parseInt(amount, 10), user.id);
    res.json({ status: true, message: `Se agregaron ${amount} solicitudes a ${user.username}.` });
});

// DELETE /api/admin/users/:email
router.delete('/users/:email', (req, res) => {
    const email = req.params.email.toLowerCase().trim();
    if (email === req.rinUser.email) {
        return res.status(400).json({ status: false, message: 'No puedes eliminar tu propia cuenta CEO.' });
    }
    const user = stmts.findByEmail.get(email);
    if (!user) return res.status(404).json({ status: false, message: 'Usuario no encontrado.' });

    stmts.deleteUser.run(email);
    res.json({ status: true, message: 'Usuario eliminado.' });
});

module.exports = router;
