// Control de sidebar (hamburguesa) — compartido por docs, endpoints, configuración y panel
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('show');
}

document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.addEventListener('click', toggleSidebar);
});

// Carga la sesión actual. Si no hay sesión, redirige a /register.
// Si la página requiere rol ceo y el usuario no lo es, redirige a /docs.
async function requireSession({ requireCeo = false } = {}) {
    try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
            window.location.href = '/register';
            return null;
        }
        const data = await res.json();
        if (!data.status) {
            window.location.href = '/register';
            return null;
        }
        if (requireCeo && data.user.role !== 'ceo') {
            window.location.href = '/docs';
            return null;
        }
        fillSidebarUser(data.user);
        const panelLink = document.getElementById('nav-panel');
        if (panelLink) panelLink.style.display = data.user.role === 'ceo' ? 'flex' : 'none';
        return data.user;
    } catch (e) {
        window.location.href = '/register';
        return null;
    }
}

function fillSidebarUser(user) {
    const av = document.getElementById('sidebar-avatar');
    const nm = document.getElementById('sidebar-name');
    const rl = document.getElementById('sidebar-role');
    if (av) av.src = user.profile_img;
    if (nm) nm.innerText = user.username;
    if (rl) rl.innerText = user.role === 'ceo' ? 'CEO' : (user.plan || 'free');
}

async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
}
