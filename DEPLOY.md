# Guía de Despliegue - Sistema El JiCHI (Render + Supabase)

## Estructura del Proyecto
```
jichi/
├── backend/          ← FastAPI (Python) → Deploy en Render
│   ├── app/main.py
│   ├── requirements.txt
│   ├── render.yaml
│   └── seed.py
├── frontend/         ← React (Vite) → Deploy en Render Static Site
│   ├── src/
│   └── package.json
└── database.sql      ← Esquema en Supabase (ya ejecutado)
```

---

## Paso 1: Subir código a GitHub

1. Ve a https://github.com/new y crea un repositorio llamado `jichi-sistema`
2. Abre una terminal en la carpeta `jichi/backend` y ejecuta:
```bash
git init
git add .
git commit -m "Initial commit - JiCHI Backend"
git remote add origin https://github.com/TU_USUARIO/jichi-sistema.git
git push -u origin main
```

---

## Paso 2: Deploy Backend en Render

1. Ve a https://render.com → **New → Web Service**
2. Conecta tu repositorio de GitHub (`jichi-sistema`)
3. Configura:
   - **Name:** `jichi-backend`
   - **Language:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. En **Environment Variables** agrega:
   - `DATABASE_URL` = `postgresql://postgres.uvfigwlruvulvwjyppxa:70486379Josemagdiel@aws-1-us-west-2.pooler.supabase.com:6543/postgres`
5. Click **Create Web Service**
6. Render te dará una URL como: `https://jichi-backend.onrender.com`

---

## Paso 3: Actualizar URL en el Frontend

Una vez que tengas la URL del backend de Render, edita el archivo `frontend/src/App.jsx`:

```jsx
// Cambiar esta línea:
const API_BASE = 'http://127.0.0.1:8000';
// Por la URL de Render:
const API_BASE = 'https://jichi-backend.onrender.com';
```

---

## Paso 4: Deploy Frontend en Render (Static Site)

1. En Render → **New → Static Site**
2. Conecta el mismo repositorio, selecciona la carpeta `frontend`
3. Configura:
   - **Name:** `jichi-frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. Click **Create Static Site**
5. Render te dará una URL como: `https://jichi-frontend.onrender.com`

---

## Endpoints del API disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/stats` | Estadísticas generales |
| GET | `/contenedores` | Lista los 1000 contenedores |
| GET | `/contenedores/criticos` | Contenedores con ≥80% |
| POST | `/contenedores` | Crear nuevo contenedor |
| POST | `/rutas/generar` | Generar 30 rutas óptimas |

---

## Base de Datos (Supabase)
- **Project:** uvfigwlruvulvwjyppxa
- **Region:** AWS us-west-2
- **Tablas:** camiones, contenedores, rutas, ruta_puntos
- **Datos:** 1000 contenedores en 53 zonas reales de Santa Cruz
