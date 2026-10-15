# ADN Motors - Backend API

API REST para el taller mecánico **ADN Motors**. Construida con Express + Prisma + PostgreSQL.

## Tecnologías

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express 4
- **ORM:** Prisma 5
- **Base de datos:** PostgreSQL
- **Autenticación:** JWT (jsonwebtoken)
- **Validación:** Zod
- **Seguridad:** Helmet, CORS, Rate Limiting, bcrypt
- **Email:** Nodemailer
- **PDF:** PDFKit

---

## Base de Datos — Esquema

### Tablas y Relaciones

#### `rol`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | |
| descripcion | VARCHAR UNIQUE | Administrador, Empleado, Cliente, Secretaria |
| estado | BOOLEAN | Activo/inactivo |
| fechaReg | TIMESTAMP | Fecha de registro |

#### `permisos`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | |
| permiso | VARCHAR UNIQUE | Nombre del permiso |
| estado | BOOLEAN | |
| fechaReg | TIMESTAMP | |

#### `detalle_permiso`
| Columna | Tipo | FK |
|---------|------|----|
| id | UUID PK | |
| rolId | UUID | → rol.id |
| permisoId | UUID | → permisos.id |
| *Unique* | | (rolId, permisoId) |

#### `usuario`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | |
| nombreCompleto | VARCHAR | |
| email | VARCHAR UNIQUE | |
| password | VARCHAR | Hash bcrypt |
| telefono | VARCHAR? | |
| direccion | VARCHAR? | |
| sexo | ENUM? | Masculino / Femenino / Otro |
| edad | INT? | |
| estado | BOOLEAN | Activo/inactivo |
| fechaReg | TIMESTAMP | |
| rolId | UUID FK | → rol.id |
| emailVerificado | BOOLEAN | |
| emailVerificacionToken | VARCHAR? | |
| emailVerificacionExpiracion | TIMESTAMP? | |
| intentosFallidos | INT | Contador login |
| bloqueadoHasta | TIMESTAMP? | |

#### `cliente`
| Columna | Tipo | FK |
|---------|------|----|
| id | UUID PK | |
| usuarioId | UUID UNIQUE | → usuario.id |
| fechaReg | TIMESTAMP | |

#### `empleado`
| Columna | Tipo | FK |
|---------|------|----|
| id | UUID PK | |
| cargo | VARCHAR | |
| usuarioId | UUID UNIQUE | → usuario.id |
| estado | BOOLEAN | |
| fechaReg | TIMESTAMP | |

#### `horarios_empleado`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | |
| empleadoId | UUID FK | → empleado.id |
| diaSemana | INT | 0-6 |
| horaInicio | VARCHAR | |
| horaFin | VARCHAR | |
| tipoServicio | ENUM | revision / reparacion / ambos |
| activo | BOOLEAN | |

#### `servicios`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | |
| categoria | VARCHAR | |
| descripcion | VARCHAR | |
| costo | DECIMAL(10,2) | |
| duracionEstimada | VARCHAR? | |
| estado | BOOLEAN | |
| fechaReg | TIMESTAMP | |

#### `citas`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | |
| fechaCita | DATE | |
| horaInicio | TIME | |
| horaFin | TIME? | |
| observaciones | VARCHAR? | |
| clienteId | UUID FK | → cliente.id |
| empleadoId | UUID FK | → empleado.id |
| estado | ENUM | Agendado / En_taller / En_progreso / En_revision / Completado / Entregado / Cancelado |
| tipoServicio | ENUM | revision / reparacion / ambos |
| fechaReg | TIMESTAMP | |

#### `detalle_servicio`
| Columna | Tipo | FK |
|---------|------|----|
| id | UUID PK | |
| citaId | UUID | → citas.id |
| servicioId | UUID | → servicios.id |

#### `factura`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | |
| numeroFactura | VARCHAR UNIQUE | |
| citaId | UUID UNIQUE FK | → citas.id |
| clienteId | UUID FK | → cliente.id |
| usuarioId | UUID FK | → usuario.id (quien emite) |
| fechaEmision | TIMESTAMP | |
| total | DECIMAL(10,2) | |
| estado | ENUM | emitida / anulada |

#### `detalle_factura`
| Columna | Tipo | FK |
|---------|------|----|
| id | UUID PK | |
| facturaId | UUID | → factura.id |
| servicioId | UUID | → servicios.id |
| descripcion | VARCHAR | |
| cantidad | INT | |
| precioUnitario | DECIMAL(10,2) | |
| subtotal | DECIMAL(10,2) | |

#### `estado_trabajo`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | |
| estado | VARCHAR | |
| estadoAnterior | VARCHAR? | |
| fechaCambio | TIMESTAMP | |
| observaciones | VARCHAR? | |
| citaId | UUID FK | → citas.id |
| usuarioId | UUID FK | → usuario.id |

#### `notificaciones`
| Columna | Tipo | FK |
|---------|------|----|
| id | UUID PK | |
| asunto | VARCHAR | |
| tipo | VARCHAR? | |
| estadoEnvio | VARCHAR? | |
| fechaProgramada | DATE? | |
| clienteId | VARCHAR | |
| citaId | VARCHAR | |

#### `pre_reserva`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | |
| nombreCompleto | VARCHAR | |
| telefono | VARCHAR | |
| email | VARCHAR | |
| marcaVehiculo | VARCHAR? | |
| modeloVehiculo | VARCHAR? | |
| anioVehiculo | INT? | |
| placa | VARCHAR? | |
| tipoServicio | VARCHAR | |
| descripcionProblema | VARCHAR? | |
| fechaCita | DATE | |
| horaCita | TIME | |
| empleadoId | UUID? FK | → empleado.id |
| clienteId | UUID? FK | → cliente.id |
| usuarioId | UUID? FK | → usuario.id |
| tokenVerificacion | VARCHAR? | |
| expiracionVerificacion | TIMESTAMP? | |
| estado | VARCHAR | PENDIENTE / ... |
| citaId | UUID? UNIQUE FK | → citas.id |
| fechaReg | TIMESTAMP | |

#### `vehiculos`
| Columna | Tipo | FK |
|---------|------|----|
| id | UUID PK | |
| marca | VARCHAR | |
| modelo | VARCHAR? | |
| anio | INT? | |
| placa | VARCHAR UNIQUE | |
| clienteId | UUID FK | → cliente.id |
| estado | BOOLEAN | |
| fechaReg | TIMESTAMP | |

#### `proveedor`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | |
| nombre | VARCHAR | |
| contacto | VARCHAR? | |
| telefono | VARCHAR? | |
| email | VARCHAR? | |
| direccion | VARCHAR? | |
| tiempoEntregaDias | INT | Default 7 |
| estado | BOOLEAN | |
| fechaReg | TIMESTAMP | |

#### `inventario`
| Columna | Tipo | FK / Descripción |
|---------|------|------------------|
| id | UUID PK | |
| codigo | VARCHAR UNIQUE | Código interno |
| nombre | VARCHAR | |
| descripcion | VARCHAR? | |
| categoria | ENUM | motor / frenos / suspension / electricidad / filtros / aceites / llantas / carroceria / otros |
| stockActual | INT | CHECK >= 0 |
| stockMinimo | INT | Default 5 |
| precioCompra | DECIMAL(10,2) | CHECK >= 0 |
| precioVenta | DECIMAL(10,2) | CHECK >= 0 |
| unidadMedida | VARCHAR | Default 'unidad' |
| proveedorId | UUID FK | → proveedor.id |
| ubicacion | VARCHAR? | |
| estado | BOOLEAN | |
| fechaReg | TIMESTAMP | |

#### `movimiento_inventario`
| Columna | Tipo | FK / Descripción |
|---------|------|------------------|
| id | UUID PK | |
| inventarioId | UUID FK | → inventario.id |
| tipo | VARCHAR | entrada / salida / ajuste |
| cantidad | INT | |
| stockAnterior | INT | |
| stockNuevo | INT | |
| usuarioId | UUID FK | → usuario.id |
| observaciones | VARCHAR? | |
| fechaReg | TIMESTAMP | |

#### `cita_repuesto`
| Columna | Tipo | FK |
|---------|------|----|
| id | UUID PK | |
| citaId | UUID FK | → citas.id |
| inventarioId | UUID FK | → inventario.id |
| cantidad | INT | |
| precioUnitario | DECIMAL(10,2) | |

### Diagrama de Relaciones

```
Rol ──→ Usuario ──→ Cliente ──→ Vehiculo
 │                  │
 │                  ├── Cita ──→ Factura
 │                  │    │         │
 │                  │    │         └── DetalleFactura ──→ Servicio
 │                  │    │
 │                  │    ├── DetalleServicio ──→ Servicio
 │                  │    ├── EstadoTrabajo
 │                  │    └── CitaRepuesto ──→ Inventario
 │                  │
 │                  └── PreReserva ──→ Cita
 │
 ├── DetallePermiso ──→ Permiso
 │
 ├── Empleado ──→ HorariosEmpleado
 │               └── Cita
 │               └── PreReserva
 │
 └── Proveedor ──→ Inventario ──→ MovimientoInventario ──→ Usuario
```

---

## API — Endpoints

### Autenticación — `/api/auth`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Iniciar sesión (email + password) |
| POST | `/api/auth/register` | No | Registrar nuevo usuario |
| POST | `/api/auth/refresh` | No | Refrescar token |
| GET | `/api/auth/profile` | JWT | Obtener perfil del usuario |
| POST | `/api/auth/verify-email` | JWT | Enviar email de verificación |
| GET | `/api/auth/verify-email` | No | Verificar email con token |

### Clientes — `/api/cliente`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/cliente/registro` | No | Registrar cliente |
| GET | `/api/cliente/empleados-disponibles` | No | Listar empleados disponibles |
| GET | `/api/cliente/horarios-disponibles` | No | Horarios disponibles para una fecha |
| GET | `/api/cliente/dias-disponibles` | JWT | Días disponibles |
| POST | `/api/cliente/agendar-cita` | JWT | Agendar una cita |
| GET | `/api/cliente/buscar` | JWT | Buscar clientes por nombre |
| GET | `/api/cliente/:clienteId/citas` | JWT | Citas de un cliente |

### Citas — `/api`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/admin/citas` | JWT | Listar citas (admin) |
| PATCH | `/api/admin/citas/:citaId/estado` | JWT | Cambiar estado de cita (admin) |
| GET | `/api/empleado/citas` | JWT | Citas asignadas al empleado |
| PATCH | `/api/empleado/citas/:citaId/estado` | JWT | Cambiar estado (empleado) |
| GET | `/api/cliente/citas` | JWT | Citas del cliente autenticado |

### Servicios — `/api/servicio`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/servicio/servicios` | JWT | Listar todos los servicios |

### Usuarios — `/api/usuarios`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/usuarios` | JWT | Listar usuarios |
| GET | `/api/usuarios/:id` | JWT | Obtener usuario por ID |
| POST | `/api/usuarios` | JWT | Crear usuario |
| PUT | `/api/usuarios/:id` | JWT | Actualizar usuario |
| DELETE | `/api/usuarios/:id` | JWT | Eliminar usuario |
| PATCH | `/api/usuarios/:id/activar` | JWT | Activar/desactivar usuario |

### Roles — `/api/roles`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/roles` | JWT | Listar roles |
| GET | `/api/roles/:id` | JWT | Obtener rol |
| POST | `/api/roles` | JWT | Crear rol |
| PUT | `/api/roles/:id` | JWT | Actualizar rol |
| DELETE | `/api/roles/:id` | JWT | Eliminar rol |
| PUT | `/api/roles/:id/permisos` | JWT | Asignar permisos a un rol |

### Permisos — `/api/permisos`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/permisos` | JWT | Listar permisos |
| GET | `/api/permisos/mis-permisos` | JWT | Permisos del usuario autenticado |
| GET | `/api/permisos/:id` | JWT | Obtener permiso |
| POST | `/api/permisos` | JWT | Crear permiso |
| PUT | `/api/permisos/:id` | JWT | Actualizar permiso |
| DELETE | `/api/permisos/:id` | JWT | Eliminar permiso |

### Facturas — `/api/facturas`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/facturas/generar/:citaId` | JWT + Permiso | Generar factura desde una cita |
| GET | `/api/facturas/:id` | JWT + Permiso | Obtener factura (JSON) |
| GET | `/api/facturas/:id/pdf` | JWT + Permiso | Descargar factura en PDF |

### Dashboard — `/api`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/dashboard/stats` | JWT | Estadísticas del dashboard |
| GET | `/api/dashboard/recent-services` | JWT | Servicios recientes |

### Estado de Trabajo — `/api`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| PATCH | `/api/trabajos/:citaId/estado` | JWT | Actualizar estado de trabajo |
| GET | `/api/trabajos/:citaId/historial` | JWT | Historial de estados de un trabajo |

### Pre-Reservas (Público) — `/api`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/reservas/pre-reserva` | No | Crear pre-reserva |
| GET | `/api/reservas/verificar/:token` | No | Verificar token de pre-reserva |
| POST | `/api/reservas/verificar/:token` | No | Confirmar pre-reserva y crear cita |
| GET | `/api/reservas/disponibilidad` | No | Verificar disponibilidad |

### Inventario — `/api/inventario`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/inventario` | JWT | Listar inventario (filtros: ?categoria, ?busqueda, ?stock_bajo) |
| GET | `/api/inventario/:id` | JWT | Obtener repuesto + movimientos |
| POST | `/api/inventario` | JWT + Permiso | Crear repuesto (requiere: codigo, nombre, categoria, precio_compra, precio_venta) |
| PUT | `/api/inventario/:id` | JWT + Permiso | Actualizar repuesto |
| PATCH | `/api/inventario/:id/stock` | JWT + Permiso | Ajustar stock (entrada/salida/ajuste) |
| DELETE | `/api/inventario/:id` | JWT + Permiso | Desactivar repuesto |
| GET | `/api/inventario/:id/movimientos` | JWT | Movimientos de un repuesto |

### Proveedores — `/api/proveedores`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/proveedores` | JWT | Listar proveedores |
| GET | `/api/proveedores/:id` | JWT | Obtener proveedor + sus repuestos |
| POST | `/api/proveedores` | JWT + Permiso | Crear proveedor |
| PUT | `/api/proveedores/:id` | JWT + Permiso | Actualizar proveedor |
| DELETE | `/api/proveedores/:id` | JWT + Permiso | Desactivar proveedor |

---

## Autenticación y Autorización

- **JWT** en header `Authorization: Bearer <token>`
- **Roles:** Administrador, Secretaria, Empleado, Cliente
- **Permisos:** Asignados a roles mediante `detalle_permiso`
- Verificación por middleware `verifyToken` y `requirePermiso('nombre')`

### Permisos disponibles

| Permiso | Descripción |
|---------|-------------|
| Ver citas | |
| Cambiar estado de trabajo | |
| Gestionar trabajos | |
| Agendar citas | |
| Ver facturas | |
| Generar facturas | |
| Gestionar empleados | |
| Activar o desactivar mecanicos | |

### Roles por defecto y sus permisos

| Rol | Permisos |
|-----|----------|
| Administrador | Ver citas, Ver facturas, Gestionar empleados |
| Secretaria | Ver citas, Generar facturas, Agendar citas, Ver facturas |
| Empleado | Ver citas, Cambiar estado de trabajo |
| Cliente | Ninguno (solo accede a sus propios recursos) |

---

## Variables de Entorno (`.env`)

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | `3000` |
| `NODE_ENV` | Entorno | `development` |
| `DATABASE_URL` | Conexión PostgreSQL | — |
| `JWT_SECRET` | Secreto JWT | — |
| `JWT_EXPIRES_IN` | Expiración token | `24h` |
| `JWT_REFRESH_EXPIRES_IN` | Expiración refresh | `7d` |
| `EMAIL_HOST` | SMTP host | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP puerto | `587` |
| `EMAIL_USER` | Correo SMTP | — |
| `EMAIL_APP_PASSWORD` | Contraseña app SMTP | — |
| `FRONTEND_URL` | URL del frontend | `http://localhost:8080` |
| `CORS_ORIGINS` | Orígenes permitidos CORS | `http://localhost:8080` |
| `RATE_LIMIT_WINDOW_MS` | Ventana rate limit (ms) | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Máx solicitudes por ventana | `100` |

---

## Instalación y Ejecución

```bash
# Clonar e instalar dependencias
npm install

# Configurar variables de entorno (copiar .env)
# Editar DATABASE_URL con tus credenciales PostgreSQL

# Generar cliente Prisma y sincronizar esquema
npm run prisma:generate
npm run prisma:push

# Poblar base de datos con datos iniciales
npm run seed

# Iniciar servidor (desarrollo)
npm run dev

# Iniciar servidor (producción)
npm start
```

### Seed por defecto

- **Admin:** admin@adnmotors.com / admin123
- Roles: Administrador, Empleado, Cliente, Secretaria
- 8 permisos
- 6 servicios de taller

---

## Notas para Migración a PostgREST

Si migras esta API a [PostgREST](https://postgrest.org), considera lo siguiente:

### 1. Esquema de base de datos
El schema actual de Prisma está en `prisma/schema.prisma`. PostgREST trabaja directamente sobre vistas y tablas PostgreSQL. Puedes mantener el mismo esquema.

### 2. Equivalencia de endpoints

| Express | PostgREST |
|---------|-----------|
| `GET /api/usuarios` | `GET /usuario` |
| `GET /api/usuarios/:id` | `GET /usuario?id=eq.{id}` |
| `POST /api/usuarios` | `POST /usuario` |
| `PUT /api/usuarios/:id` | `PATCH /usuario?id=eq.{id}` |
| `DELETE /api/usuarios/:id` | `DELETE /usuario?id=eq.{id}` |
| Filtros personalizados | Query params: `?columna=eq.valor`, `?columna=like.valor` |
| Joins | `?select=columna,otra_tabla(*)` |

### 3. Autenticación JWT
PostgREST soporta JWT nativamente. Puedes migrar:
- `verifyToken` → Configurar `jwt-secret` en PostgREST
- `requirePermiso` → Usar roles de PostgreSQL + `request.jwt.claims`
- `requireRole` → Roles de base de datos con `SET ROLE`

### 4. Lógica de negocio que deberás migrar a funciones PostgreSQL

Estos endpoints tienen lógica que no es mero CRUD y necesitarán **funciones/stored procedures** en PostgreSQL:

- `POST /api/auth/login` — Verificar password con bcrypt, generar JWT
- `POST /api/auth/register` — Hash de password, crear usuario + cliente
- `POST /api/auth/refresh` — Refrescar JWT
- `GET /api/auth/profile` — Perfil con relaciones
- `POST /api/facturas/generar/:citaId` — Calcular total, generar número, crear factura + detalles
- `GET /api/facturas/:id/pdf` — Generar PDF (necesita capa aparte o extensión)
- `GET /api/dashboard/stats` — Consultas agregadas
- `GET /api/dashboard/recent-services` — JOINs con límite
- `PATCH /api/admin/citas/:citaId/estado` — Validación de transición de estados
- `POST /api/cliente/agendar-cita` — Validar disponibilidad y crear
- `GET /api/cliente/horarios-disponibles` — Lógica de disponibilidad
- `POST /api/reservas/pre-reserva` — Generar token, enviar email
- `GET /api/reservas/verificar/:token` — Validar token
- `POST /api/reservas/verificar/:token` — Confirmar y crear usuario/cliente/cita
- `GET /api/reservas/disponibilidad` — Verificar cruce de horarios
- `PATCH /api/usuarios/:id/activar` — Alternar estado
- `PUT /api/roles/:id/permisos` — Reemplazar asignación de permisos
- `POST /api/auth/verify-email` + `GET /api/auth/verify-email` — Flujo de verificación

### 5. Envío de emails
PostgREST no maneja envío de emails. Necesitarás:
- Usar `pg_notify` + un worker externo, o
- Un trigger PostgreSQL + extensión `pg_net`, o
- Mantener un pequeño servicio Node para enviar emails (Nodemailer + PDFKit)

### 6. Rate limiting
PostgREST no incluye rate limiting. Deberás agregarlo a nivel de proxy/reverse proxy (NGINX, Cloudflare, etc.) o con la extensión `pg_stat_statements`.

### 7. Consideraciones adicionales
- **CORS:** PostgREST tiene configuración de CORS nativa
- **Helmet:** Headers de seguridad deben ir en el proxy reverso
- **Validación:** Puedes usar `CHECK` constraints y triggers en PostgreSQL
- **PDF:** PDFKit no tiene equivalente directo en PostgreSQL; necesitarás un microservicio aparte o una función PL/v8

---

## Microservicio Node (Puerto 3001)

Servicio auxiliar para auth alternativo, generación de PDF y envío de emails vía `pg_notify`.

### Ubicación
`backend_adn/postgrest-microservice/`

### Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/` | No | Health check |
| POST | `/auth/login` | No | Login alternativo (SQL directo) |
| POST | `/auth/register` | No | Registro de cliente |
| POST | `/auth/refresh` | No | Refrescar token |
| GET | `/facturas/:id/pdf` | No | Descargar PDF de factura |

### Worker de Emails
Escucha canales `cita_creada` y `pre_reserva_creada` vía `LISTEN`/`NOTIFY` de PostgreSQL.

- **cita_creada**: Envía confirmación de cita al cliente
- **pre_reserva_creada**: Envía enlace de verificación para pre-reserva

### Inicio rápido
```bash
cd postgrest-microservice
npm install
node server.js   # Puerto 3001
```

### Funciones SQL (`postgrest-microservice/sql_functions.sql`)
- `pre_reserva_crear()` — Crea pre-reserva con token
- `pre_reserva_verificar()` — Verifica y confirma token
- `pre_reserva_disponibilidad()` — Verifica disponibilidad
- `pre_reserva_confirmar()` — Crea usuario/cliente/cita desde pre-reserva
- `cita_agendar()` — Agenda cita con validación de horarios
- `citas_empleado_dia()` — Citas de un empleado para una fecha
- `factura_generar()` — Genera factura con detalles desde cita
- `dashboard_stats()` — Estadísticas del dashboard
- `horarios_disponibles()` — Horarios libres por empleado/fecha
- `inventario_stock_bajo()` — Repuestos con stock bajo
- `inventario_resumen()` — Resumen de inventario por categoría
- `inventario_movimiento()` — Registrar movimiento de stock
- `inventario_usar_en_cita()` — Descontar repuestos usados en una cita

### Fixes aplicados
- `pre_reserva_confirmar`: reemplazado `rolId = '3'` hardcodeado por búsqueda dinámica del rol Cliente
- `inventario_usar_en_cita`: agregado parámetro `p_usuario_id` en lugar de UUID hardcodeado

---

## Pruebas de Integración — Resultados

Ejecutadas el 17/06/2026 contra servidores en localhost:3000 (backend) y localhost:3001 (microservicio).

| # | Prueba | Estado | Detalle |
|---|--------|--------|---------|
| 1 | Login admin | ✅ | Token obtenido correctamente |
| 2 | Dashboard stats | ✅ | OK |
| 3 | Listar servicios | ✅ | 6 servicios |
| 4 | Empleados disponibles | ✅ | 0 empleados (seed sin datos) |
| 5 | Listar usuarios | ✅ | 1 usuario |
| 6 | Listar roles | ✅ | 4 roles |
| 7 | Listar citas | ✅ | 0 citas |
| 8 | Listar permisos | ✅ | 12 permisos |
| 9 | Crear proveedor | ✅ | Repuestos ABC |
| 10 | Listar proveedores | ✅ | 4 proveedores |
| 11 | Crear repuesto | ✅ | Aceite 10W40 (stock=20) |
| 12 | Listar inventario | ✅ | 2 items |
| 13 | Ajustar stock | ✅ | Stock: 30 (entrada +10) |
| 14 | Movimientos inventario | ✅ | 2 movimientos |
| 15 | Microservicio root | ✅ | ADN Motors Microservice v1.0.0 |
| 16 | Microservicio login | ✅ | Administrador ADN - Administrador |

**Total: 16/16 pruebas exitosas**

### Credenciales por defecto
- **Admin:** admin@adnmotors.com / admin123
