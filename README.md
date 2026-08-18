# Rin-Tohsaka API

Rin-Tohsaka API — Multi-herramientas de alto rendimiento

## Descripción

API de alto rendimiento con múltiples herramientas (scraping, QR, utilidades, etc.).

## Instalación

```bash
npm install
cp .env.example .env
npm start
```

## Estructura

- `index.js` - Servidor Express principal
- `db.js` - Base de datos con infinitysqlite
- `public/` - Frontend estático
- `.env.example` - Variables de entorno de ejemplo

## Nota sobre archivos binarios

El archivo `public/ceo.jpeg` (imagen del CEO) no se pudo subir automáticamente debido a limitaciones de la herramienta de subida con archivos binarios. Si lo necesitas, descárgalo del ZIP original y súbelo manualmente a la carpeta `public/`.
