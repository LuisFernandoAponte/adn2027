# ADN Motors — Tablas de la Base de Datos

Motor: **PostgreSQL**  
Esquema: `public`

---

## `rol`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | UUID | PK, DEFAULT uuid() |
| descripcion | VARCHAR | UNIQUE, NOT NULL |
| estado | BOOLEAN | DEFAULT true |
| fechaReg | TIMESTAMP | DEFAULT now() |

> Roles del sistema: Administrador, Secretaria, Empleado, Cliente.

---

## `permisos`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | UUID | PK, DEFAULT uuid() |
| permiso | VARCHAR | UNIQUE, NOT NULL |
| estado | BOOLEAN | DEFAULT true |
| fechaReg | TIMESTAMP | DEFAULT now() |

> Permisos individuales (ej: "Ver citas", "Generar facturas").

---

## `detalle_permiso`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | UUID | PK, DEFAULT uuid() |
| rolId | UUID | FK → rol.id, NOT NULL |
| permisoId | UUID | FK → permisos.id, NOT NULL |

> UNIQUE(rolId, permisoId) — relación N:M entre roles y permisos.

---

## `usuario`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | UUID | PK, DEFAULT uuid() |
| nombreCompleto | VARCHAR | NOT NULL |
| email | VARCHAR | UNIQUE, NOT NULL |
| password | VARCHAR | NOT NULL (hash bcrypt) |
| telefono | VARCHAR | |
| direccion | VARCHAR | |
| sexo | Sexo? | ENUM: Masculino, Femenino, Otro |
| edad | INT | |
| estado | BOOLEAN | DEFAULT true |
| fechaReg | TIMESTAMP | DEFAULT now() |
| rolId | UUID | FK → rol.id, NOT NULL |
| emailVerificado | BOOLEAN | DEFAULT false |
| emailVerificacionToken | VARCHAR | |
| emailVerificacionExpiracion | TIMESTAMP | |
| intentosFallidos | INT | DEFAULT 0 |
| bloqueadoHasta | TIMESTAMP | |

> Un usuario puede ser Cliente, Empleado o Administrador.

---

## `cliente`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | UUID | PK, DEFAULT uuid() |
| usuarioId | UUID | UNIQUE, FK → usuario.id, NOT NULL |
| fechaReg | TIMESTAMP | DEFAULT now() |

> Extensión de usuario para clientes. Relación 1:1 con usuario.

---

## `empleado`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | UUID | PK, DEFAULT uuid() |
| cargo | VARCHAR | NOT NULL |
| usuarioId | UUID | UNIQUE, FK → usuario.id, NOT NULL |
| estado | BOOLEAN | DEFAULT true |
| fechaReg | TIMESTAMP | DEFAULT now() |

> Extensión de usuario para empleados (mecánicos, secretarias, admin). Relación 1:1 con usuario.

---

## `horarios_empleado`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | UUID | PK, DEFAULT uuid() |
| empleadoId | UUID | FK → empleado.id, NOT NULL |
| diaSemana | INT | NOT NULL (0=Domingo, ..., 6=Sábado) |
| horaInicio | VARCHAR | NOT NULL |
| horaFin | VARCHAR | NOT NULL |
| tipoServicio | TipoServicio | ENUM: revision, reparacion, ambos |
| activo | BOOLEAN | DEFAULT true |
| createdAt | TIMESTAMP | DEFAULT now() |
| updatedAt | TIMESTAMP | auto |

> Horarios laborales de cada empleado por día de la semana.

---

## `servicios`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | UUID | PK, DEFAULT uuid() |
| categoria | VARCHAR | NOT NULL |
| descripcion | VARCHAR | NOT NULL |
| costo | DECIMAL(10,2) | NOT NULL |
| duracionEstimada | VARCHAR | (ej: "60 minutos", "2 horas") |
| estado | BOOLEAN | DEFAULT true |
| fechaReg | TIMESTAMP | DEFAULT now() |

> Catálogo de servicios del taller.

---

## `citas`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | UUID | PK, DEFAULT uuid() |
| fechaCita | DATE | NOT NULL |
| horaInicio | TIME | NOT NULL |
| horaFin | TIME | |
| observaciones | VARCHAR | |
| clienteId | UUID | FK → cliente.id, NOT NULL |
| empleadoId | UUID | FK → empleado.id, NOT NULL |
| estado | EstadoCita | ENUM, DEFAULT 'Agendado' |
| tipoServicio | TipoServicio | ENUM, DEFAULT 'revision' |
| fechaReg | TIMESTAMP | DEFAULT now() |

> Estados: Agendado → En_taller → En_progreso → En_revision → Completado → Entregado / Cancelado.

---

## `detalle_servicio`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | UUID | PK, DEFAULT uuid() |
| citaId | UUID | FK → citas.id, NOT NULL |
| servicioId | UUID | FK → servicios.id, NOT NULL |

> Relación N:M entre citas y servicios.

---

## `factura`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | UUID | PK, DEFAULT uuid() |
| numeroFactura | VARCHAR | UNIQUE, NOT NULL |
| citaId | UUID | UNIQUE, FK → citas.id, NOT NULL |
| clienteId | UUID | FK → cliente.id, NOT NULL |
| usuarioId | UUID | FK → usuario.id, NOT NULL (quien emite) |
| fechaEmision | TIMESTAMP | DEFAULT now() |
| total | DECIMAL(10,2) | NOT NULL |
| estado | EstadoFactura | ENUM: emitida, anulada |

---

## `detalle_factura`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | UUID | PK, DEFAULT uuid() |
| facturaId | UUID | FK → factura.id, NOT NULL |
| servicioId | UUID | FK → servicios.id, NOT NULL |
| descripcion | VARCHAR | NOT NULL |
| cantidad | INT | DEFAULT 1 |
| precioUnitario | DECIMAL(10,2) | NOT NULL |
| subtotal | DECIMAL(10,2) | NOT NULL |

---

## `estado_trabajo`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | UUID | PK, DEFAULT uuid() |
| estado | VARCHAR | NOT NULL |
| estadoAnterior | VARCHAR | |
| fechaCambio | TIMESTAMP | DEFAULT now() |
| observaciones | VARCHAR | |
| citaId | UUID | FK → citas.id, NOT NULL |
| usuarioId | UUID | FK → usuario.id, NOT NULL |

> Historial de cambios de estado de cada cita.

---

## `notificaciones`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | UUID | PK, DEFAULT uuid() |
| asunto | VARCHAR | NOT NULL |
| tipo | VARCHAR | |
| estadoEnvio | VARCHAR | |
| fechaProgramada | DATE | |
| clienteId | VARCHAR | |
| citaId | VARCHAR | |

---

## `pre_reserva`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | UUID | PK, DEFAULT uuid() |
| nombreCompleto | VARCHAR | NOT NULL |
| telefono | VARCHAR | NOT NULL |
| email | VARCHAR | NOT NULL |
| marcaVehiculo | VARCHAR | |
| modeloVehiculo | VARCHAR | |
| anioVehiculo | INT | |
| placa | VARCHAR | |
| tipoServicio | VARCHAR | NOT NULL |
| descripcionProblema | VARCHAR | |
| fechaCita | DATE | NOT NULL |
| horaCita | TIME | NOT NULL |
| empleadoId | UUID | FK → empleado.id |
| clienteId | UUID | FK → cliente.id |
| usuarioId | UUID | FK → usuario.id |
| tokenVerificacion | VARCHAR | |
| expiracionVerificacion | TIMESTAMP | |
| estado | VARCHAR | DEFAULT 'PENDIENTE' |
| citaId | UUID | UNIQUE, FK → citas.id |
| fechaReg | TIMESTAMP | DEFAULT now() |

> Pre-reserva pública que requiere verificación por email antes de crear la cita.

---

## `vehiculos`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| id | UUID | PK, DEFAULT uuid() |
| marca | VARCHAR | NOT NULL |
| modelo | VARCHAR | |
| anio | INT | |
| placa | VARCHAR | UNIQUE, NOT NULL |
| clienteId | UUID | FK → cliente.id, NOT NULL |
| estado | BOOLEAN | DEFAULT true |
| fechaReg | TIMESTAMP | DEFAULT now() |

> Vehículos registrados de cada cliente.

---

## Enums

| Enum | Valores |
|------|---------|
| Sexo | Masculino, Femenino, Otro |
| TipoServicio | revision, reparacion, ambos |
| EstadoCita | Agendado, En_taller, En_progreso, En_revision, Completado, Entregado, Cancelado |
| EstadoFactura | emitida, anulada |

---

## Diagrama de Relaciones

```
rol ──→ usuario ──→ cliente ──→ vehiculos
 │                  │
 │                  ├── citas ──→ factura
 │                  │    │         │
 │                  │    │         └── detalle_factura ──→┐
 │                  │    │                               │
 │                  │    └── detalle_servicio ────────────┤
 │                  │    └── estado_trabajo               │
 │                  │    └── pre_reserva                  │
 │                  │                                    │
 │                  └──────────────── servicios ←─────────┘
 │
 ├── detalle_permiso ──→ permisos
 │
 └── empleado ──→ horarios_empleado
                  └── citas
                  └── pre_reserva
```

**Total: 15 tablas + 4 enums**
