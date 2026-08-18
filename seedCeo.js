// Crea o actualiza la cuenta CEO al arrancar el servidor.
const { stmts } = require('./db');

const CEO_EMAIL = 'cololacalempira5@gmail.com';
const CEO_USERNAME = 'Duan';
const CEO_KEY = 'RINT-HOSA';
const CEO_PASSWORD = 'cololacalempira5@gmail.com'; // misma contraseña que el correo

async function seedCeo() {
    const password = CEO_PASSWORD;

    const existing = await stmts.findByEmail.get(CEO_EMAIL);

    if (!existing) {
        await stmts.createUser.run(
            CEO_USERNAME,
            CEO_EMAIL,
            password,
            CEO_KEY,
            'ceo',
            'ultra',
            999999999,
            'https://i.ibb.co/chJXMd0q/NAGI-REO-RIN-SAE-ISAGI.jpg',
            1,
            null
        );
        console.log('[seedCeo] Cuenta CEO creada:', CEO_EMAIL);
    } else {
        await stmts.updateUser.run(
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
        if (!existing.verified) await stmts.markVerified.run(CEO_EMAIL);
        console.log('[seedCeo] Cuenta CEO actualizada:', CEO_EMAIL);
    }
}

module.exports = { seedCeo };
