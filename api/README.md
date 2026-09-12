# 📡 API - Target Catriel

## Estructura

```
/api
├── _lib/                      # Utilidades compartidas
│   ├── db.ts                 # Prisma Client singleton
│   ├── types.ts              # Tipos TypeScript compartidos
│   ├── auth.ts               # Autenticación y validación
│   ├── roles.ts              # Validación de roles
│   └── response.ts           # Helpers para respuestas HTTP
│
├── marketing/                 # CRUD Marketing
│   ├── noticias/
│   │   ├── index.ts          # GET, POST noticias
│   │   └── [id].ts           # GET, PUT, DELETE noticia
│   ├── viajes/
│   │   ├── index.ts          # GET, POST viajes
│   │   └── [id].ts           # GET, PUT, DELETE viaje
│   ├── galeria/
│   │   ├── index.ts          # GET, POST galería
│   │   └── [id].ts           # GET, PUT, DELETE item
│   └── sobre-nosotros/
│       ├── index.ts          # GET, POST contenido
│       └── [id].ts           # GET, PUT, DELETE contenido
│
├── profesor/                  # CRUD Profesor ✅
│   ├── bloques/
│   │   ├── index.ts          # GET, POST bloques
│   │   ├── [id].ts           # GET, PUT, DELETE bloque
│   │   └── alumnos.ts        # GET, POST, DELETE alumnos del bloque
│   ├── modulos/
│   │   ├── index.ts          # GET, POST módulos
│   │   └── [id].ts           # GET, PUT, DELETE módulo
│   ├── contenidos/
│   │   ├── index.ts          # POST contenidos
│   │   └── [id].ts           # PUT, DELETE contenido
│   ├── alumnos/
│   │   └── index.ts          # GET candidatos a invitar (búsqueda por nombre/email)
│   └── respuestas/
│       └── index.ts          # GET respuestas de alumnos por bloque (o de todos los bloques propios)
│
├── alumno/                    # CRUD Alumno ✅
│   ├── bloques/
│   │   ├── index.ts          # GET bloques inscritos
│   │   └── [id].ts           # GET módulos del bloque
│   ├── modulos/
│   │   └── index.ts          # GET módulos habilitados de los bloques del alumno (filtro opcional por bloqueId)
│   ├── respuestas/
│   │   ├── index.ts          # GET, POST respuestas
│   │   └── [id].ts           # PUT, DELETE respuesta
│   └── asistencias/
│       └── index.ts          # GET asistencias propias
│
└── admin/                     # Admin endpoints ✅
    ├── usuarios/
    │   ├── index.ts          # GET, POST usuarios
    │   └── [id].ts           # GET, PUT, DELETE usuario
    └── reportes/
        └── index.ts          # GET reportes y dashboard
```

## Autenticación

**Todos los endpoints requieren autenticación.**

Envía un header `Authorization` con el usuario ID:

```bash
Authorization: Bearer <usuario_id>
```

**Usuarios de prueba disponibles** (deben coincidir con los IDs reales de la base local — ver `src/context/AuthContext.jsx`, que documenta esta misma correspondencia):
- `cmtatits80004oqd1u6qhu4bb` (Admin Target)
- `cmtatitsc0007oqd1hc4wx3xy` (Prof. María García)
- `cmtatitsf000aoqd1uq0we7l6` (Juan Pérez)
- `cmtatitsl000goqd1i4j8f6vc` (Marketing Team)
- Sofia López (`sofia@student.com`) está sembrada en `prisma/seed.ts` pero no tiene entrada en el mock del frontend — su ID real depende de tu seed local, consultalo con `npx prisma studio`

## Endpoints - Marketing

### 📰 Noticias

```bash
# Obtener todas las noticias
GET /api/marketing/noticias

# Obtener una noticia
GET /api/marketing/noticias/:id

# Crear noticia (rol: marketing, administrador)
POST /api/marketing/noticias
{
  "titulo": "string",
  "cuerpo": "string",
  "imagen": "string (opcional)"
}

# Actualizar noticia (solo autor o admin)
PUT /api/marketing/noticias/:id
{
  "titulo": "string",
  "cuerpo": "string",
  "imagen": "string"
}

# Eliminar noticia (solo autor o admin)
DELETE /api/marketing/noticias/:id
```

### ✈️ Viajes

```bash
# Obtener todos los viajes
GET /api/marketing/viajes

# Obtener un viaje
GET /api/marketing/viajes/:id

# Crear viaje (rol: marketing, administrador)
POST /api/marketing/viajes
{
  "destino": "string",
  "fechaInicio": "ISO date",
  "fechaFin": "ISO date",
  "nivelRecomendado": "string (A1, A2, B1, B2)",
  "precio": "number",
  "cupos": "number",
  "incluyeClases": "boolean (opcional)"
}

# Actualizar viaje (solo autor o admin)
PUT /api/marketing/viajes/:id
{
  "destino": "string",
  "fechaInicio": "ISO date",
  "fechaFin": "ISO date",
  "nivelRecomendado": "string",
  "precio": "number",
  "cupos": "number",
  "incluyeClases": "boolean"
}

# Eliminar viaje (solo autor o admin)
DELETE /api/marketing/viajes/:id
```

### 🖼️ Galería

```bash
# Obtener galería
GET /api/marketing/galeria

# Obtener item
GET /api/marketing/galeria/:id

# Crear item (rol: marketing, administrador)
POST /api/marketing/galeria
{
  "tipo": "foto | video",
  "url": "string (URL de imagen/video)",
  "orden": "number (opcional)"
}

# Actualizar item (solo autor o admin)
PUT /api/marketing/galeria/:id
{
  "tipo": "foto | video",
  "url": "string",
  "orden": "number"
}

# Eliminar item (solo autor o admin)
DELETE /api/marketing/galeria/:id
```

### 📖 Sobre Nosotros

```bash
# Obtener contenido
GET /api/marketing/sobre-nosotros

# Obtener item
GET /api/marketing/sobre-nosotros/:id

# Crear contenido (rol: marketing, administrador)
POST /api/marketing/sobre-nosotros
{
  "contenido": "string",
  "imagen": "string (opcional)"
}

# Actualizar contenido (solo autor o admin)
PUT /api/marketing/sobre-nosotros/:id
{
  "contenido": "string",
  "imagen": "string"
}

# Eliminar contenido (solo autor o admin)
DELETE /api/marketing/sobre-nosotros/:id
```

## Respuestas

### Éxito (200, 201)
```json
{
  "success": true,
  "data": { ... },
  "message": "..."
}
```

### Error (4xx, 5xx)
```json
{
  "success": false,
  "error": "Mensaje de error"
}
```

## Auditoría

Las acciones de alta/baja sobre entidades académicas y de marketing (invitar/remover
alumno de un bloque, crear/eliminar noticias, etc.) quedan persistidas en la tabla
`registros_auditoria` vía `logAudit()` (`api/_lib/auth.ts`). No hay endpoint de
lectura/consulta de esta tabla todavía — solo escritura desde los handlers existentes.
Un fallo al escribir la auditoría se loguea pero nunca interrumpe la operación de
negocio que la originó.

## Testing con cURL

```bash
# Obtener noticias
curl -H "Authorization: Bearer cmtatitsl000goqd1i4j8f6vc" \
  http://localhost:3000/api/marketing/noticias

# Crear noticia
curl -X POST \
  -H "Authorization: Bearer cmtatitsl000goqd1i4j8f6vc" \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Test","cuerpo":"Contenido test"}' \
  http://localhost:3000/api/marketing/noticias
```

## Endpoints - Profesor

**Rol requerido:** `profesor` o `administrador`

### 📚 Bloques

```bash
# Obtener bloques del profesor
GET /api/profesor/bloques
Authorization: Bearer <profesor_id>

# Obtener detalles de un bloque
GET /api/profesor/bloques/:id
Authorization: Bearer <profesor_id>

# Crear nuevo bloque
POST /api/profesor/bloques
Authorization: Bearer <profesor_id>
{
  "nivel": "A1 | A2 | B1 | B2 | etc",
  "dias": "Lunes y Miércoles",
  "horaInicio": "2026-08-05T09:00:00Z",
  "horaFin": "2026-08-05T11:00:00Z",
  "anio": 2026
}

# Actualizar bloque
PUT /api/profesor/bloques/:id
Authorization: Bearer <profesor_id>
{
  "nivel": "string (opcional)",
  "dias": "string (opcional)",
  "horaInicio": "ISO date (opcional)",
  "horaFin": "ISO date (opcional)",
  "anio": "number (opcional)"
}

# Eliminar bloque
DELETE /api/profesor/bloques/:id
Authorization: Bearer <profesor_id>
```

### 👥 Alumnos del Bloque

```bash
# Listar alumnos inscritos en el bloque (bloqueId por query param, no path segment)
GET /api/profesor/bloques/alumnos?bloqueId=:bloqueId
Authorization: Bearer <profesor_id>

# Invitar alumno al bloque
POST /api/profesor/bloques/alumnos?bloqueId=:bloqueId
Authorization: Bearer <profesor_id>
{
  "alumnoId": "usuario_id"
}

# Remover alumno del bloque
DELETE /api/profesor/bloques/alumnos?bloqueId=:bloqueId&alumnoId=:alumnoId
Authorization: Bearer <profesor_id>
```

### 📖 Módulos

```bash
# Listar módulos del bloque
GET /api/profesor/modulos?bloqueId=:bloqueId
Authorization: Bearer <profesor_id>

# Obtener detalles del módulo
GET /api/profesor/modulos/:id
Authorization: Bearer <profesor_id>

# Crear módulo
POST /api/profesor/modulos
Authorization: Bearer <profesor_id>
{
  "bloqueId": "string",
  "fecha": "2026-08-05T09:00:00Z",
  "estado": "borrador | oculto | habilitado (opcional)"
}

# Actualizar módulo
PUT /api/profesor/modulos/:id
Authorization: Bearer <profesor_id>
{
  "fecha": "ISO date (opcional)",
  "estado": "string (opcional)"
}

# Eliminar módulo
DELETE /api/profesor/modulos/:id
Authorization: Bearer <profesor_id>
```

### 📝 Contenidos

```bash
# Crear contenido en módulo
POST /api/profesor/contenidos
Authorization: Bearer <profesor_id>
{
  "moduloId": "string",
  "tipo": "texto | actividad | pregunta | audio",
  "contenido": "string",
  "orden": "number (opcional, default: 0)"
}

# Actualizar contenido
PUT /api/profesor/contenidos/:id
Authorization: Bearer <profesor_id>
{
  "tipo": "string (opcional)",
  "contenidoActualizado": "string (opcional)",
  "orden": "number (opcional)"
}

# Eliminar contenido
DELETE /api/profesor/contenidos/:id
Authorization: Bearer <profesor_id>
```

### 🔍 Alumnos (candidatos a invitar)

```bash
# Buscar alumnos que se pueden invitar a un bloque (no inscritos aún)
GET /api/profesor/alumnos?bloqueId=:bloqueId&q=:texto (q opcional, filtra por nombre/email)
Authorization: Bearer <profesor_id>
```

### 📥 Respuestas de alumnos

```bash
# Listar respuestas de alumnos de un bloque propio, o de todos los bloques propios si no se pasa bloqueId
GET /api/profesor/respuestas?bloqueId=:bloqueId (bloqueId opcional)
Authorization: Bearer <profesor_id>
```

> ⚠️ Deuda de seguridad conocida (ver `documents/arquitectura/02-plan-remediacion.md`, tarea 0.4):
> cuando se pasa `bloqueId` explícito, hoy no se valida que el bloque pertenezca al
> profesor autenticado — es un IDOR pendiente de corregir, no algo ya resuelto.

---

## Endpoints - Alumno

**Rol requerido:** `alumno`

### 📚 Bloques Inscritos

```bash
# Listar bloques del alumno
GET /api/alumno/bloques
Authorization: Bearer <alumno_id>

# Obtener módulos del bloque
GET /api/alumno/bloques/:id
Authorization: Bearer <alumno_id>
```

### 📖 Módulos habilitados

```bash
# Listar módulos habilitados de los bloques en los que el alumno está inscrito
GET /api/alumno/modulos?bloqueId=:bloqueId (bloqueId opcional; filtra a uno de los bloques propios)
Authorization: Bearer <alumno_id>
```

### ✍️ Respuestas

```bash
# Listar respuestas propias
GET /api/alumno/respuestas
Authorization: Bearer <alumno_id>

# Crear respuesta
POST /api/alumno/respuestas
Authorization: Bearer <alumno_id>
{
  "contenidoId": "string",
  "respuesta": "string",
  "visibilidad": "privado | compartido (opcional)"
}

# Actualizar respuesta
PUT /api/alumno/respuestas/:id
Authorization: Bearer <alumno_id>
{
  "respuestaActualizada": "string (opcional)",
  "visibilidad": "string (opcional)"
}

# Eliminar respuesta
DELETE /api/alumno/respuestas/:id
Authorization: Bearer <alumno_id>
```

### 📋 Asistencias

```bash
# Ver asistencias propias
GET /api/alumno/asistencias
Authorization: Bearer <alumno_id>
# Retorna:
# {
#   "asistencias": [...],
#   "estadisticas": {
#     "total": number,
#     "presentes": number,
#     "ausentes": number,
#     "porcentajeAsistencia": number
#   }
# }
```

---

## Endpoints - Admin

**Rol requerido:** `administrador`

### 👥 Usuarios

```bash
# Listar todos los usuarios
GET /api/admin/usuarios
Authorization: Bearer <admin_id>

# Obtener detalles de usuario
GET /api/admin/usuarios/:id
Authorization: Bearer <admin_id>

# Crear usuario
POST /api/admin/usuarios
Authorization: Bearer <admin_id>
{
  "nombre": "string",
  "email": "string",
  "passwordHash": "string",
  "roleIds": ["rol_id1", "rol_id2"] (opcional)
}

# Actualizar usuario
PUT /api/admin/usuarios/:id
Authorization: Bearer <admin_id>
{
  "nombre": "string (opcional)",
  "email": "string (opcional)",
  "roleIds": ["rol_id1", "rol_id2"] (opcional)
}

# Eliminar usuario
DELETE /api/admin/usuarios/:id
Authorization: Bearer <admin_id>
```

### 📊 Reportes y Dashboard

```bash
# Dashboard consolidado
GET /api/admin/reportes
Authorization: Bearer <admin_id>
# Retorna: usuarios, bloques, módulos, alumnos, últimas respuestas

# Reportes de actividades
GET /api/admin/reportes?tipo=actividades
Authorization: Bearer <admin_id>
# Retorna: últimas 50 respuestas

# Resumen de asistencias
GET /api/admin/reportes?tipo=asistencias
Authorization: Bearer <admin_id>
# Retorna: asistencias por módulo, porcentajes, totales

# Progreso de alumnos
GET /api/admin/reportes?tipo=progreso
Authorization: Bearer <admin_id>
# Retorna: progreso por alumno, respuestas, asistencias
```

---

## Próximos pasos

- [x] 3.3 CRUD Profesor (bloques, módulos, contenidos)
- [x] 3.4 CRUD Alumno (respuestas, asistencias)
- [x] 3.5 Endpoints Admin (reportes, vistas consolidadas)
- [ ] 4.1 Conectar frontend a APIs
- [ ] 4.2 Autenticación real Supabase
- [ ] 4.3 Test flujo completo
- [ ] 4.4 Deploy local validado
