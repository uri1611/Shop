# Shop

Pequeña aplicación de e-commerce hecha para la evaluación técnica de CodigoDelSur.

Los clientes pueden ver el catálogo, buscar productos, armar un carrito y pagar con Stripe (modo test). Los administradores gestionan los productos desde un panel propio.

## Stack

| Parte | Tecnología |
| --- | --- |
| Frontend | React 18 + Vite + React Router (JavaScript) |
| Backend | Node.js + Express 5 (JavaScript, ES modules) |
| Base de datos | SQLite con Prisma (ORM y migraciones) |
| Autenticación | JWT en el header `Authorization`, contraseñas con bcrypt |
| Imágenes | multer, guardadas en `backend/uploads/` |
| Pagos | Stripe Checkout en modo test |

## Estructura

```
backend/
  prisma/            schema, migraciones y seed
  src/
    server.js        arma la app: middlewares, rutas y manejo de errores
    db.js            instancia única de Prisma
    stripe.js        cliente de Stripe
    upload.js        configuración de multer (tipo y tamaño de imágenes)
    middleware/      requireAuth y requireAdmin
    routes/          auth, products, cart, checkout, orders, admin
  uploads/           imágenes subidas (no se sube al repo)
frontend/
  src/
    api.js           función única para llamar al backend
    AuthContext.jsx  usuario logueado, login, registro y logout
    ProtectedRoute.jsx
    pages/           una pantalla por archivo
```

## Requisitos

- Node.js 20 o superior
- Una cuenta gratuita de Stripe, para la clave de test (no se hacen cobros reales)

## Cómo correrlo localmente

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Completá `.env`:

- `JWT_SECRET`: cualquier texto largo y aleatorio.
- `STRIPE_SECRET_KEY`: tu clave secreta de test (`sk_test_...`). Se saca de https://dashboard.stripe.com/test/apikeys.

Después:

```bash
npx prisma migrate dev     # crea la base SQLite con las tablas
npm run db:seed            # carga usuarios y productos de ejemplo (con imágenes)
npm run dev                # http://localhost:3000
```

### 2. Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

Abrí http://localhost:5173. Vite reenvía `/api` y `/uploads` al backend, así que no hace falta configurar CORS.

## Variables de entorno (`backend/.env`)

| Variable | Para qué sirve | Ejemplo |
| --- | --- | --- |
| `DATABASE_URL` | Archivo de la base SQLite | `file:./dev.db` |
| `PORT` | Puerto del backend | `3000` |
| `JWT_SECRET` | Firma de los tokens de sesión | texto aleatorio |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe en modo test | `sk_test_...` |
| `FRONTEND_URL` | Adónde vuelve Stripe después del pago | `http://localhost:5173` |

## Usuarios de prueba

Los crea el seed:

| Rol | Email | Contraseña |
| --- | --- | --- |
| ADMIN | `admin@example.com` | `admin123` |
| CUSTOMER | `cliente@example.com` | `cliente123` |

También podés registrar usuarios nuevos; siempre se crean como CUSTOMER.

El seed también copia las imágenes de ejemplo de `backend/prisma/seed-images/` a `backend/uploads/`, así el catálogo arranca con fotos. Las imágenes que suba un admin no están en el repo: se guardan en `backend/uploads/`, que está en `.gitignore`.

## Tarjetas de prueba de Stripe

En la página de pago de Stripe usá cualquier fecha futura, cualquier CVC y cualquier código postal.

| Tarjeta | Resultado |
| --- | --- |
| `4242 4242 4242 4242` | Pago aprobado |
| `4000 0000 0000 0002` | Tarjeta rechazada |
| `4000 0025 0000 3155` | Pide autenticación 3D Secure |

## API

Todas las respuestas son JSON. Los errores siempre tienen la forma `{ "error": "mensaje" }` con el código HTTP correspondiente (400, 401, 403, 404, 409, 502, 500).

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | público | Crea un usuario CUSTOMER y devuelve un token |
| POST | `/api/auth/login` | público | Devuelve un token |
| GET | `/api/auth/me` | logueado | Usuario del token |
| GET | `/api/products?search=` | público | Productos activos, con búsqueda por nombre |
| GET | `/api/products/:id` | público | Detalle de un producto activo |
| GET | `/api/cart` | logueado | Carrito con subtotales y total |
| POST | `/api/cart/items` | logueado | Agrega `{ productId, quantity }` |
| PATCH | `/api/cart/items/:productId` | logueado | Cambia la cantidad `{ quantity }` |
| DELETE | `/api/cart/items/:productId` | logueado | Quita un producto |
| POST | `/api/checkout` | logueado | Crea la orden y la sesión de Stripe; devuelve `{ url }` |
| POST | `/api/checkout/confirm` | logueado | `{ sessionId }`: verifica el pago con Stripe |
| POST | `/api/checkout/cancel` | logueado | `{ orderId }`: cancela una orden pendiente |
| GET | `/api/orders` | logueado | Órdenes del usuario |
| GET | `/api/orders/:id` | logueado | Detalle de una orden propia |
| GET | `/api/admin/products` | ADMIN | Todos los productos |
| GET | `/api/admin/products/:id` | ADMIN | Un producto |
| POST | `/api/admin/products` | ADMIN | Crea un producto |
| PATCH | `/api/admin/products/:id` | ADMIN | Edita (incluye activar/desactivar) |
| POST | `/api/admin/products/:id/image` | ADMIN | Sube la imagen (`multipart/form-data`, campo `image`) |

## Flujo de pago

1. En el carrito, "Ir a pagar" llama a `POST /api/checkout`.
2. El backend lee el carrito de la base, crea una orden `PENDING` con una copia del nombre y precio de cada producto, y crea una sesión de Stripe Checkout con esos mismos precios.
3. El navegador va a la página de pago de Stripe.
4. Si el pago sale bien, Stripe vuelve a `/checkout/success?session_id=...`. El frontend llama a `POST /api/checkout/confirm`; el backend le pregunta a Stripe si la sesión está pagada y, si lo está, marca la orden `PAID` y saca esos productos del carrito.
5. Si el usuario cancela, Stripe vuelve a `/checkout/cancel?order_id=...`. La orden pasa a `CANCELLED` y el carrito queda igual.
6. Si Stripe no responde al crear la sesión, la orden queda `FAILED` y el usuario ve un mensaje de error.

## Decisiones y reglas de negocio

- **Precios en centavos (enteros).** Se evitan los errores de redondeo de los decimales. Solo se formatean al mostrarlos.
- **El precio siempre sale de la base.** El frontend solo manda `productId` y `quantity`; cualquier precio enviado se ignora.
- **Seguridad en el backend.** Las rutas de admin pasan por `requireAuth` y `requireAdmin`. Ocultar links en el frontend es solo para la experiencia de usuario.
- **Cada usuario ve solo lo suyo.** Carrito y órdenes se filtran siempre por el id del token. Una orden ajena devuelve 404.
- **Productos inactivos.** No aparecen en el catálogo, no se pueden agregar al carrito ni comprar. Si uno se desactiva estando en un carrito, se muestra como "no disponible" y el checkout lo rechaza.
- **No se borran productos**, se desactivan, para no romper las órdenes que los referencian.
- **La orden guarda una copia** del nombre y precio de cada producto al momento de la compra.
- **Confirmación idempotente.** Llamar varias veces a `confirm` con la misma sesión no duplica nada: solo actúa si la orden sigue `PENDING`, y lo hace dentro de una transacción.
- **Imágenes fuera de la base.** Se guardan en disco con un nombre aleatorio; la base solo guarda el nombre del archivo. Se aceptan JPG, PNG y WEBP de hasta 5 MB.

## Supuestos

- La moneda es USD.
- No hay control de stock; la cantidad por producto en el carrito va de 1 a 99.
- El logout se hace borrando el token en el navegador. Los tokens duran 7 días.
- Un ADMIN también puede comprar como cualquier cliente.

## Qué haría con más tiempo

- **Webhooks de Stripe**, para confirmar pagos aunque el usuario cierre el navegador antes de volver a la tienda. Hoy, en ese caso, la orden queda `PENDING`.
- Tests automatizados de los endpoints (por ejemplo con Vitest y Supertest).
- Control de stock.
- Guardar las imágenes en S3 o MinIO. Solo cambiaría `upload.js` y cómo se arma la URL de la imagen.
- Paginación en el catálogo y en el panel de admin.
- Validar el contenido real de la imagen, no solo el tipo que informa el navegador.
- Tokens de sesión más cortos con renovación automática.
- Documentación de la API con OpenAPI/Swagger.
- Docker Compose para levantar todo con un comando.
