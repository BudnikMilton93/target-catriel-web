# Arquitectura y modelo de datos — Target, Escuela de Inglés (React + Backend)

## Contexto del proyecto
Sitio web y plataforma educativa para Target, escuela de inglés fundada en 1994, que
abarca todas las edades tanto en clases (presenciales y online) como en viajes en combo.
El proyecto tiene dos grandes capas: un sitio público con contenido institucional
administrable, y una plataforma educativa con roles (administrador, profesor, alumno,
marketing) donde se gestionan clases, contenido académico y seguimiento de alumnos.

## Entorno de desarrollo local (Docker)
Para desarrollar sin depender de cuota de free tier de ningún proveedor, se trabaja con
Postgres local en Docker, y recién se apunta a Supabase (u otro proveedor elegido) al
subir a producción en Vercel.

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16
    restart: always
    environment:
      POSTGRES_USER: target_dev
      POSTGRES_PASSWORD: target_dev
      POSTGRES_DB: target_db
    ports:
      - "5432:5432"
    volumes:
      - target_pgdata:/var/lib/postgresql/data

volumes:
  target_pgdata:
```

Variables de entorno separadas por ambiente:
```
.env.local        -> Postgres de Docker (desarrollo)
.env.production    -> base remota elegida para producción (Vercel)
```

En local, `DATABASE_URL` y `DIRECT_URL` pueden ser la misma cadena (no hace falta pooler
en desarrollo). En producción sí se mantiene la distinción con el pooler.

Flujo de trabajo:
1. `docker compose up -d` — levanta Postgres local
2. `npx prisma migrate dev` — aplica el esquema en la base local y genera el cliente
3. Desarrollo y pruebas contra la base local
4. `npx prisma migrate deploy` (apuntando a `.env.production`) — aplica las mismas
   migraciones en la base remota al momento de desplegar

El paso 4 hoy lo automatiza el pipeline de CI/CD (ver `documents/infraestructura/01-ci-cd.md`) al desplegar
a staging o producción — no hace falta correrlo a mano.

## Stack técnico

> ⚠️ Esta sección mezcla lo que **ya está implementado** con el **plan objetivo para
> producción**. No asumir que todo lo listado abajo existe en el código hoy — ver el
> detalle de qué está vigente y qué es plan a continuación.

**Vigente hoy (desarrollo local):**
- Frontend: React 19 con Vite, React Router DOM v7
- Backend: Vercel Functions (serverless) en TypeScript — cada endpoint en `/api`,
  agrupado por rol (`admin/`, `alumno/`, `profesor/`, `marketing/`), no por recurso
  plano — ver la sección "Estructura de carpetas (implementada)" más abajo
- Base de datos: PostgreSQL en Docker local (ver sección anterior), sin Supabase
- ORM: Prisma, para tipado automático del esquema relacional y migraciones
- Autenticación: **mockeada** en el frontend (`src/context/AuthContext.jsx`, cualquier
  password funciona); el backend sí valida contra la base real vía
  `Authorization: Bearer <userId>` (sin JWT firmado — ver `02-plan-remediacion.md`)
- CSS con variables custom properties para theming de marca

**Plan objetivo para producción (no integrado todavía):**
- Base de datos: PostgreSQL alojado en Supabase
- Media (estrategia híbrida): Cloudinary para imágenes, Instagram por URL para reels,
  Supabase Storage para videos propios excepcionales
- Conexión a base de datos: usar el connection pooler de Supabase (PgBouncer), NO
  conexión directa — las functions serverless abren una conexión nueva por request y
  sin pooler se agotan las conexiones disponibles rápidamente
- Autenticación: Supabase Auth para login/sesión; la tabla `usuario_roles` (definida
  más abajo) se gestionaría por encima, vinculada al `user.id` que provee Supabase Auth

## Identidad de marca
- Logo: isologo circular de Target, con libro y hoja como ícono central
- Colores institucionales: azul marino (#1F3864) y verde (#4E8B6B)
- Tagline: "Un paso adelante" · Desde 1994
- Aplicar estos valores en `variables.css` (`--color-primary`, `--color-secondary`, etc.)

---

## PARTE 1 — Modelo de datos (arquitectura ya definida)

### Roles combinables
Los roles NO están fijos por usuario. Un mismo email puede tener uno o varios roles
asignados simultáneamente (ej: una persona puede ser Admin y Profesor a la vez).

Roles del sistema:
- **Administrador**: visibilidad total. Ve todos los profesores, todos los bloques,
  listado de alumnos con contenido dado, actividades realizadas, progreso y faltas.
  Puede entrar a cualquier bloque y actuar como profesor (crear/editar módulos). Cuando
  lo hace, debe quedar registrado que la acción fue del admin y no del profesor titular.
- **Profesor**: crea y gestiona sus propios bloques y módulos.
- **Alumno**: pertenece a un único bloque (relación 1 a 1 por ahora, pero modelada para
  poder expandirse a 1 a muchos en el futuro sin romper el esquema).
- **Marketing**: acceso exclusivo a contenido público (noticias, viajes, galería, sobre
  nosotros). Sin ningún acceso a datos académicos ni de alumnos. Puede combinarse con
  el rol Alumno en la misma persona.

### Entidades principales — Núcleo académico

```
usuarios (id, nombre, email, password_hash)
roles (id, nombre)
usuario_roles (usuario_id FK, rol_id FK)          -- roles combinables

alumno_perfil (usuario_id PK/FK, fecha_nacimiento, telefono)
tutores (id, nombre, email, telefono, relacion)    -- sin login en Fase 1
alumno_tutores (alumno_id FK, tutor_id FK)         -- relación muchos a muchos

bloques (id, profesor_id FK, nivel, dias, hora_inicio, hora_fin, anio)
  -- el nombre del bloque NO se escribe libre: se compone automáticamente a partir
  -- de nivel + días + horario (ej: "A1 - Martes y Jueves - 16:00 a 17:00 hs")
  -- el bloque es un ciclo lectivo ANUAL: nace y termina con el año, queda como
  -- histórico del alumno; el año siguiente se crean bloques nuevos

bloque_alumnos (bloque_id FK, alumno_id FK, fecha_invitacion)
  -- el alumno se vincula por invitación del profesor, no se autoinscribe

bloque_recursos (id, bloque_id FK, tipo, contenido, orden)
  -- material fijo del bloque, disponible todo el año (ej: libro de texto, referencia),
  -- NO ligado a un módulo/fecha puntual

modulos (id, bloque_id FK, creado_por FK, fecha, estado)
  -- estado: borrador/oculto | habilitado
  -- se pueden crear manualmente o de forma masiva (uno por cada día de clase del año)
  -- el profesor debe habilitarlos para que el alumno los vea
  -- si un día no hay clase (feriado, imprevisto), se deja deshabilitado o se habilita
  -- solo como aviso, sin contenido de estudio

contenidos (id, modulo_id FK, tipo, contenido, orden)
  -- tipo: texto | actividad | pregunta | audio

respuestas (id, contenido_id FK, alumno_id FK, respuesta, visibilidad)
  -- visibilidad: privado | compartido — se define por respuesta individual, no por
  -- módulo entero. El profesor decide caso a caso si comparte con el grupo

asistencias (id, modulo_id FK, alumno_id FK, presente)
```

### Entidades — Contenido público (rol Marketing)

```
noticias (id, autor_id FK, titulo, cuerpo, imagen, fecha)
viajes (id, autor_id FK, destino, fecha_inicio, fecha_fin, nivel_recomendado,
        incluye_clases, precio, cupos)
galeria (id, autor_id FK, tipo, url, orden)
sobre_nosotros (id, autor_id FK, contenido, imagen)
```

### Estrategia multimedia para galeria (implementacion Fase 4)

- `galeria` se administra por metadata; los archivos no pasan por la API de Vercel.
- Origenes permitidos:
  - `cloudinary_image` para fotos (noticias, viajes, galeria)
  - `instagram_reel` para videos ya publicados en Instagram (guardar URL)
  - `supabase_video` para videos propios como excepcion
- Campos recomendados para evolucion del modelo:
  - `source_type`, `provider_id`, `thumbnail_url`, `bytes`, `duration_seconds`, `status`
- Limites de operacion iniciales:
  - maximo 24 videos activos en galeria
  - maximo 6 videos destacados en home
  - para `supabase_video`: maximo 60 segundos y 25 MB
- Validaciones minimas de backend:
  - dominio permitido para reels: `instagram.com`
  - `mimeType` permitido para videos propios: `video/mp4`, `video/quicktime`
  - rechazo de nuevas altas cuando se supera el tope de videos activos

Estas tablas solo se relacionan con `usuarios` (autor_id). No tienen ninguna relación
con las tablas del núcleo académico — el rol Marketing nunca necesita acceder a ellas.

### Entidades — Auditoría

```
registros_auditoria (id, usuario_id FK nullable, accion, entidad, detalles JSON, created_at)
  -- accion: CREAR | ACTUALIZAR | ELIMINAR | LEER
  -- entidad: BLOQUE | MODULO | USUARIO | NOTICIA | BLOQUE_ALUMNO | RESPUESTA | etc.
  -- usuario_id usa onDelete SetNull (no Cascade como el resto del esquema): un
  -- registro de auditoría no debe desaparecer si se borra el usuario que lo originó
  -- indices en usuario_id y created_at
```

Se persiste vía `logAudit()` en `api/_lib/auth.ts`, invocado desde los endpoints que
hacen altas/bajas sobre entidades académicas o de marketing. Un fallo al escribir la
auditoría se loguea pero nunca interrumpe la operación de negocio que la originó.

### Control de acceso
Los permisos por rol se validan en la capa de aplicación (backend), no en la base de
datos. Antes de cada acción, verificar los roles del usuario en `usuario_roles`.
Ejemplos:
- Crear/editar noticia → requiere rol `marketing` o `admin`
- Ver faltas de un bloque → requiere rol `admin`, o ser el `profesor_id` de ese bloque
- Ver dashboard de alumno → requiere ser el propio alumno, su/s profesor/es, o admin

---

## PARTE 2 — Estructura del sitio

### Secciones administrables por rol Marketing (público, sin login para verlas)
- **Noticias**: novedades, eventos, crónicas de viajes
- **Viajes**: catálogo de viajes en combo con destino, fechas, nivel recomendado, precio, cupos
- **Galería destacada**: fotos y videos
- **Sobre nosotros**: historia del instituto, misión, docentes

### Secciones fijas del sitio público (no editables, contenido institucional)
- **Encabezado / Marca y confianza**: logo, tagline, indicadores de trayectoria, CTA principal
- **Oferta de clases**: filtros por modalidad (presencial/online), edad, objetivo;
  mención a preparación para certificaciones internacionales por módulos
- **Alumno — Experiencia y journey**: recorrido test de nivel → curso → certificación → viaje

### Plataforma educativa (con login, según rol)

**Dashboard del profesor**
- Ver y crear sus bloques
- Dentro de cada bloque: crear módulos (manual o masivo), habilitar/deshabilitar,
  cargar contenido (texto, actividades, preguntas, audio)
- Ver respuestas de alumnos, decidir visibilidad (privado/compartido) por respuesta
- Tomar asistencia
- Invitar alumnos a su bloque (por email)
- Ver y gestionar recursos fijos del bloque (material de todo el año)

**Dashboard del alumno**
- Ver su bloque, módulos habilitados, recursos fijos
- Responder actividades/preguntas
- Ver respuestas compartidas por el profesor con el grupo (espacio de intercambio)
- Ver su asistencia y progreso
- Certificado descargable al completar nivel (si aplica)

**Panel del administrador**
- Ver todos los profesores y todos los bloques asignados a cada uno
- Listado de alumnos con: contenido dado, actividades realizadas, progreso, faltas
- Entrar a cualquier bloque y operar como profesor (queda registrado como acción del admin)
- Gestión de usuarios y roles combinables

**Panel de Marketing**
- CRUD de noticias, viajes, galería, sobre nosotros
- Sin acceso a ninguna sección académica

---

## Estructura de carpetas (implementada)

> Esta sección describía originalmente una estructura "sugerida" previa a la
> implementación. Se actualizó para reflejar la organización real del código: los
> endpoints se agrupan por **rol** (no por recurso plano bajo `/api`), y el frontend
> vive en `src/` en la raíz del repo, no bajo `/frontend`.

```
/api                      (Vercel Functions — cada archivo es un endpoint TypeScript)
  profesor/
    bloques/              (index.ts, [id].ts, alumnos.ts)
    modulos/
    contenidos/
    alumnos/               (búsqueda de candidatos a invitar a un bloque)
    respuestas/            (lectura de respuestas de alumnos por bloque)
  alumno/
    bloques/
    modulos/               (módulos habilitados de los bloques del alumno)
    respuestas/
    asistencias/
  admin/
    usuarios/
    reportes/
  marketing/
    noticias/
    viajes/
    galeria/
    sobre-nosotros/
  _lib/
    db.ts                 (cliente Prisma singleton)
    auth.ts                (validación de `Authorization: Bearer <usuarioId>`, sin JWT real aún; incluye `logAudit`)
    roles.ts                (requireRole, hasRole, ROLE_PERMISSIONS)
    types.ts
    response.ts

/prisma
  schema.prisma             (definición de las tablas del modelo, incluye `RegistroAuditoria`)

src/                        (raíz del repo, no bajo /frontend)
  components/
    layout/          (Header, Footer)
    home/             (Hero, ClasesOferta, AlumnoJourney, Noticias, GaleriaDestacada)
    clases/
    viajes/
    dashboard/
      profesor/       (DashboardProfesor)
      alumno/         (DashboardAlumno)
      admin/           (DashboardAdmin)
      marketing/       (DashboardMarketing)
    admin/            (GaleriaAdmin, NoticiasAdmin, ViajesAdmin, SobreNosotrosAdmin)
    profesor/         (BloqueModal)
    shared/            (Card, Button, Modal, RoleGuard)
  pages/
  hooks/               (useAlumno.js, useProfessor.js, useMarketing.js — lógica de datos por rol)
  services/            (api.js, contentService.js — llamadas al backend por entidad)
  context/              (AuthContext — usuario mockeado logueado y sus roles)
  styles/
    variables.css
    global.css
```
