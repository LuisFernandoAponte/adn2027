# 🚀 Guía Oficial de Despliegue en Producción: ADN Motors (Supabase + Render)

Esta guía paso a paso te explicará exactamente cómo desplegar la aplicación **ADN Motors** a producción al 100%.

---

## PASO 1: Configurar la Base de Datos en Supabase

1. Entra a [Supabase.com](https://supabase.com) y crea un nuevo proyecto (ej. `adn-motors-prod`).
2. Guarda la contraseña maestra del usuario `postgres`.
3. Ve a **Project Settings > Database** y copia dos URLs de conexión:

### 1. Connection String (Transaction Pooler - Puerto 6543):
```text
postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```
*(Asígnala a la variable `DATABASE_URL`)*

### 2. Direct Connection (Session - Puerto 5432):
```text
postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```
*(Asígnala a la variable `DIRECT_URL`)*

---

## PASO 2: Desplegar el Backend en Render

1. Entra a [Render.com](https://dashboard.render.com) y haz clic en **New + > Web Service**.
2. Conecta tu repositorio de GitHub `adn_motors`.
3. Configura los siguientes campos:
   - **Name:** `adn-motors-backend`
   - **Root Directory:** `backend_adn`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npx prisma generate`
   - **Start Command:** `npx prisma db push && npm start`

4. En **Environment Variables**, añade:

| Variable | Valor de Ejemplo | Descripción |
|---|---|---|
| `NODE_ENV` | `production` | Modo producción |
| `PORT` | `10000` | Puerto asignado |
| `DATABASE_URL` | `postgresql://postgres...:6543/postgres?pgbouncer=true` | Pooler de Supabase |
| `DIRECT_URL` | `postgresql://postgres...:5432/postgres` | Conexión directa a Supabase |
| `JWT_SECRET` | `un_secret_secreto_super_seguro_2026` | Clave secreta para tokens JWT |
| `FRONTEND_URL` | `https://adn-motors.onrender.com` | URL pública de tu frontend |
| `CORS_ORIGINS` | `https://adn-motors.onrender.com` | Orígenes permitidos |

5. Haz clic en **Create Web Service**. Guarda la URL que Render le asigna a tu backend (ej. `https://adn-motors-backend.onrender.com`).

---

## PASO 3: Sembrar Datos Iniciales en Supabase (Seeding)

Desde la terminal local en la carpeta `backend_adn`, ejecuta la inicialización completa:

```bash
# Reemplaza con tus URLs reales de Supabase:
$env:DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
$env:DIRECT_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Opción Automática (1 solo comando hace todo: tablas + funciones SQL + seed):
npm run db:setup:supabase
```

*(Alternativa Manual si prefieres usar el Dashboard de Supabase):*
1. `npx prisma db push` (crea las tablas).
2. Ve al **SQL Editor** de Supabase, pega el archivo [backend_adn/database/supabase_setup.sql](file:///c:/Users/alamb/Downloads/adn_motors-main/adn_motors-main/backend_adn/database/supabase_setup.sql) y dale **Run**.
3. `node prisma/seed.js` (siembra roles, usuario admin `admin@adnmotors.com` / `admin1919`, empleados y catálogo).
```

---

## PASO 4: Desplegar el Frontend en Render

1. En Render, haz clic en **New + > Static Site**.
2. Selecciona tu repositorio `adn_motors`.
3. Configura los campos:
   - **Name:** `adn-motors-frontend`
   - **Root Directory:** `fab-adn`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`

4. En **Environment Variables**, añade:

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://adn-motors-backend.onrender.com` *(URL real de tu backend)* |

5. Haz clic en **Create Static Site**.

---

## PASO 5: Verificación de Producción

1. Abre la URL del backend `/health` (ej. `https://adn-motors-backend.onrender.com/health`) y verifica que devuelva `{"status":"ok","database":"connected"}`.
2. Abre la URL del frontend (ej. `https://adn-motors-frontend.onrender.com`).
3. Inicia sesión con las credenciales creadas en el seed (`admin@adnmotors.com` / `admin1919`).
4. Prueba agendar una cita o pre-reserva desde la página principal.
5. Revisa los logs en Render para verificar que no existan errores de conexión o CORS.

¡Tu aplicación estará 100% operativa y accesible en producción! 🏎️💨

