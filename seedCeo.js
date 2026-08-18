// Crea o actualiza la cuenta CEO al arrancar el servidor.
const { stmts } = require('./db');

const CEO_EMAIL = 'cololacalempira5@gmail.com';
const CEO_USERNAME = 'Duan';
const CEO_KEY = 'RINT-HOSA';
const CEO_PASSWORD = 'cololacalempira5@gmail.com'; // misma contraseña que el correo

function seedCeo() {
    const password = CEO_PASSWORD;

    const existing = stmts.findByEmail.get(CEO_EMAIL);

    if (!existing) {
        stmts.createUser.run(
            CEO_USERNAME,
            CEO_EMAIL,
            password,
            CEO_KEY,
            'ceo',
            'ultra',
            999999999,
            'https://i.ibb.co/chJXMd0q/NAGI-REO-RIN-SAE-ISAGI.jpg', // FOTO: reemplazar por la URL real cuando la tengas (también editable desde /docs/settings)
            1,
            null
        );
        console.log('[seedCeo] Cuenta CEO creada:', CEO_EMAIL);
    } else {
        stmts.updateUser.run(
            CEO_USERNAME,
            CEO_EMAIL,
            password,
            CEO_KEY,
            'ceo',
            'ultra',
            999999999,
            existing.profile_img,
            existing.vip_since,
            existing.vip_expires,
            existing.request_today,
            existing.total_request,
            existing.last_request_date,
            existing.last_free_refill,
            existing.id
        );
        if (!existing.verified) stmts.markVerified.run(CEO_EMAIL);
        console.log('[seedCeo] Cuenta CEO actualizada:', CEO_EMAIL);
    }
}

module.exports = { seedCeo };
