# AeroRuta — Guía para dejarlo funcionando de verdad

Tu proyecto ya estaba construido para cumplir el instrumento de evaluación GA4-220501096-AA1-EV01.
Este documento tiene dos partes: (1) cómo se cumple cada criterio y (2) los pasos exactos para
conectar la API real y probarla en funcionamiento.

## 1. Cómo se cumple cada criterio de la lista de chequeo

| # | Criterio | Dónde está |
|---|----------|------------|
| 1 | API con GET/POST/PUT/DELETE del módulo de **autenticación** | `api/routes/autenticacion.js` (registro, login, sesión, cambio de clave, cierre de sesión) |
| 2 | API con GET/POST/PUT/DELETE del módulo de **usuarios** | `api/routes/usuarios.js` |
| 3 | API con GET/POST/PUT/DELETE del módulo de **servicios** (reservas) | `api/routes/servicios.js` |
| 4 | API con GET/POST/PUT/DELETE del módulo de **productos** (vuelos) | `api/routes/productos.js` |
| 5 | Programación orientada a objetos | Clases `Usuario`, `Vuelo`, `Reserva` en `api/models/` |
| 6 | Herramientas de *testing* y publicación | `api/tests/api.http` (extensión REST Client de VS Code); ver sección 3 |
| 7 | Formato REST | Rutas con sustantivos en plural, verbos HTTP correctos, códigos de estado (200/201/400/401/403/404/409/500), JSON en cuerpo y respuesta |
| 8 | Comprensión de la funcionalidad de las API | Comentarios explicativos en cada archivo de `api/` |

Agregué además una pantalla de **registro** (`registro.html`) enlazada desde el login, manteniendo
exactamente el mismo diseño (misma tarjeta, mismos estilos), para que el sistema funcione de
principio a fin sin depender solo del usuario de prueba sembrado por el script `seed.js`.

## 2. Requisitos

- **XAMPP** (o cualquier MySQL/MariaDB) para la base de datos.
- **Node.js 18 o superior** (incluye npm).
- Un editor como VS Code (opcional, para las pruebas con `api.http`).

## 3. Pasos para dejarlo en funcionamiento real

### Paso 1 — Base de datos
1. Abre XAMPP y arranca el módulo **MySQL**.
2. Abre phpMyAdmin → pestaña **SQL**.
3. Pega el contenido de `api/db/schema.sql` y ejecútalo. Esto crea la base `aeroruta` y sus 4 tablas.

### Paso 2 — Configurar la API
1. Abre una terminal en la carpeta `api/`.
2. Ya incluí un archivo `.env` listo para XAMPP por defecto (usuario `root`, sin contraseña).
   Si tu XAMPP tiene contraseña de MySQL, ábrelo y ajusta `DB_PASSWORD`.
3. Instala las dependencias:
   ```
   npm install
   ```

### Paso 3 — Sembrar datos de ejemplo
```
npm run seed
```
Esto crea 8 vuelos de ejemplo y un usuario de prueba:
`piloto@aeroruta.com` / `AeroRuta2026`

### Paso 4 — Levantar la API
```
npm start
```
Deberías ver: `AeroRuta API escuchando en http://localhost:3000`

Verifícalo abriendo `http://localhost:3000/api` en el navegador; debe responder un JSON con los 4 módulos.

### Paso 5 — Abrir el frontend
El frontend (`index.html`, `login.html`, `registro.html`, `vuelos.html`) es HTML/CSS/JS puro y
consume la API en `http://localhost:3000/api` (variable `API_BASE_URL` en `js/script.js`, por si
más adelante publicas la API en otra dirección).

Ábrelo con **Live Server** de VS Code (clic derecho → "Open with Live Server" sobre `index.html`)
o cualquier servidor estático. No lo abras con doble clic como archivo local, porque algunos
navegadores bloquean las peticiones `fetch` desde `file://`.

Con la API corriendo (Paso 4) y el frontend abierto, ya puedes:
- Ver el tablero de salidas en vivo (Inicio).
- Crear una cuenta nueva (Registro) o entrar con el usuario de prueba (Login).
- Buscar y filtrar vuelos, reservar, cambiar de clase y cancelar reservas (Vuelos).

### Paso 6 — Probar la API directamente (criterio 6, *testing*)
1. Instala la extensión **REST Client** (Huachao Mao) en VS Code.
2. Abre `api/tests/api.http`.
3. Con la API corriendo, haz clic en "Send Request" sobre cada bloque, en orden (de arriba hacia
   abajo, porque algunos reutilizan el token de login).

## 4. Publicar la API para que no dependa de "localhost"

Si necesitas que la API sea accesible de verdad desde internet (no solo en tu equipo):
1. Sube la carpeta `api/` a un servicio como Railway, Render o un VPS con Node.js.
2. Crea allí una base de datos MySQL (muchos de estos servicios la ofrecen) y configura las mismas
   variables de entorno del `.env`, apuntando a esa base.
3. Cambia `API_BASE_URL` en `js/script.js` por la URL pública de tu API (por ejemplo,
   `https://tu-api.onrender.com/api`).
4. Publica el frontend (HTML/CSS/JS) en cualquier hosting estático (GitHub Pages, Netlify, Vercel).

Dime si quieres que te ayude con el despliegue en alguno de estos servicios.
