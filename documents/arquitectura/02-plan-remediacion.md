# 🛠️ PLAN DE REMEDIACIÓN — Auditoría técnica y de seguridad

*Generado: 2026-08-20 · Alcance: revisión completa de `src/`, `api/`, `prisma/`, configuración de entorno y dependencias.*

Este documento traduce los hallazgos de la auditoría (code-review + security) en tareas concretas, ordenadas por prioridad, para ir resolviendo paso a paso antes de que el proyecto siga creciendo en superficie (más endpoints, más roles, más datos reales). Cada tarea tiene checkbox, archivos afectados y criterio de "hecho". Marcar `[x]` a medida que se completan.

No reemplaza los roadmaps por rol (`ROADMAP_*.md`) — esos documentan features nuevas; este documento documenta deuda técnica y riesgos ya presentes en el código existente.

**Contexto importante:** el proyecto hoy se trabaja 100% en local (Postgres en Docker, sin ningún deploy productivo). Esto significa que los hallazgos de la Fase 0 (auth backend sin verificación real, mock de `AuthContext`, etc.) **no son un incendio activo hoy** — son deuda de diseño esperable en esta etapa, tal como ya lo documenta `CLAUDE.md` del proyecto. La urgencia real de la Fase 0 es: resolverla **antes de que exista cualquier entorno con datos reales o accesible públicamente** (staging incluido), no interrumpir el trabajo local actual. Las fases 1-3 son mejoras de calidad/escalabilidad que conviene ir intercalando con el desarrollo de features, sin bloquear nada.

---

## Cómo usar este documento

1. Resolver las tareas en orden de fase (0 → 3). Dentro de una fase, el orden numerado ya refleja dependencias (ej. no tiene sentido migrar a JWT antes de decidir el mecanismo de hashing).
2. Cada tarea resuelta debe pasar por el flujo normal del proyecto: implementación → tests → code review → security review → PR (ver `CLAUDE.md`).
3. Si una tarea revela que el alcance es mayor de lo esperado, dividirla en subtareas en vez de inflar el checklist original.
4. Actualizar `ROADMAP_INDEX.md` y el roadmap de rol correspondiente si una tarea cambia el estado de integración de un panel.

---

## Fase 0 — Crítico (bloqueante antes de conectar staging/producción — no bloquea el trabajo local actual)

### 0.1 — Implementar autenticación real en el backend
- [ ] Reemplazar `validateToken` en `api/_lib/auth.ts` (hoy usa el `Authorization: Bearer <token>` directamente como `usuarioId`, sin verificar contraseña ni firma) por verificación real: JWT firmado con secreto de servidor, o Supabase Auth si se adopta antes de lo previsto en el roadmap.
- [ ] Definir el endpoint de login que emita ese token a partir de email + contraseña verificada contra `passwordHash`.
- [ ] Confirmar que `withAuth` rechaza cualquier token que no sea válido/firmado (hoy acepta cualquier `id` existente en la tabla `Usuario`).
- **Archivos:** `api/_lib/auth.ts`, nuevo endpoint de login bajo `api/`.
- **Criterio de hecho:** un `Authorization: Bearer <id-de-usuario-real>` sin firma es rechazado con 401.

### 0.2 — Hashear contraseñas en el servidor
- [ ] Agregar `bcrypt` o `argon2` como dependencia.
- [ ] Hashear en el servidor antes de persistir en `POST /api/admin/usuarios` (`api/admin/usuarios/index.ts`) — nunca confiar en que el cliente mande un hash ya calculado.
- [ ] Actualizar `prisma/seed.ts` para sembrar hashes reales en vez de strings placeholder (`'hashed_password_admin'`).
- **Archivos:** `api/admin/usuarios/index.ts`, `prisma/seed.ts`, `package.json`.
- **Criterio de hecho:** ninguna contraseña en texto plano llega a la tabla `Usuario` bajo ningún flujo.

### 0.3 — Sacar el mock de auth del frontend de cualquier build contra backend real
- [ ] Confirmar que `src/context/AuthContext.jsx` (usuarios y `id`s hardcodeados) no se compila en el bundle que apunta a una base de datos con usuarios reales, mientras 0.1 no esté resuelto.
- [ ] Una vez resuelto 0.1, reemplazar el mock por login real contra el nuevo endpoint.
- **Archivos:** `src/context/AuthContext.jsx`.
- **Criterio de hecho:** ningún `id` de usuario real queda embebido en `dist/assets/*.js`.
- **Depende de:** 0.1.

### 0.4 — Corregir IDOR en respuestas de alumnos por profesor
- [ ] En `api/profesor/respuestas/index.ts`, cuando se recibe `bloqueId` por query param, validar que ese bloque pertenezca al profesor autenticado (`req.user!.id`) antes de filtrar — hoy solo se restringe cuando **no** se pasa `bloqueId`.
- **Archivos:** `api/profesor/respuestas/index.ts`.
- **Criterio de hecho:** un profesor que pasa el `bloqueId` de otro profesor recibe 403, no los datos.
- **Nota:** esta tarea es independiente de 0.1-0.3 y puede resolverse primero si se busca una victoria rápida y acotada.

---

## Fase 1 — Alto

### 1.1 — Restringir exposición de `id` de usuario en endpoints de lectura
- [ ] Revisar `api/profesor/alumnos/index.ts` y los GET de `api/marketing/*` (noticias, viajes, galería, sobre-nosotros): hoy devuelven `id` real de otros usuarios a roles que no lo necesitan operativamente.
- [ ] Una vez resuelto 0.1, esta exposición deja de ser una fuga de "credenciales" utilizables, pero sigue siendo buena práctica no exponer IDs internos innecesariamente.
- **Archivos:** `api/profesor/alumnos/index.ts`, `api/marketing/*/index.ts`.

### 1.2 — Agregar índices a las foreign keys de Prisma
- [ ] Agregar `@@index` sobre `profesorId` (Bloque), `bloqueId` (Modulo, Respuesta, Asistencia), `alumnoId` (Respuesta, Asistencia), `autorId` (Noticia, Viaje, Galeria, SobreNosotros), `moduloId` (Contenido).
- [ ] Generar migración con `npx prisma migrate dev`.
- **Archivos:** `prisma/schema.prisma`, nueva migración en `prisma/migrations/`.
- **Criterio de hecho:** `EXPLAIN` de las queries de listado por FK usa index scan, no seq scan, con datos de volumen representativo.

### 1.3 — Conectar el panel de Marketing a la API real
- [ ] Reemplazar `src/services/contentService.js` (persiste en `localStorage`) por llamadas reales a `api/marketing/*`, que ya están implementadas y funcionales.
- [ ] Completar los TODOs en `src/services/api.js` (`noticiasService`/`viajesService` hoy devuelven arrays vacíos o el mismo objeto recibido sin llamar al backend).
- **Archivos:** `src/services/contentService.js`, `src/services/api.js`, `src/hooks/useMarketing.js`.
- **Criterio de hecho:** un cambio hecho en el panel de Marketing persiste en la base de datos y es visible en otra sesión/dispositivo.
- **Relacionado:** `ROADMAP_MARKETING.md` ya señala esto como pendiente conocido — actualizar ese roadmap al cerrar esta tarea.

### 1.4 — Arrancar cobertura de tests, empezando por autorización
- [ ] Instalar framework de testing (vitest recomendado por afinidad con Vite; agregar supertest o equivalente para tests de API).
- [ ] Priorizar tests de integración sobre los endpoints de mayor riesgo: autorización por rol, el IDOR corregido en 0.4, y el flujo de login una vez exista (0.1).
- **Archivos:** `package.json`, nuevos `*.test.ts`/`*.test.jsx`.
- **Criterio de hecho:** existe al menos un test que falla si se reintroduce el IDOR de 0.4 o si un endpoint deja de chequear rol.

### 1.5 — Actualizar dependencias vulnerables
- [ ] Correr `npm audit fix`, revisar el changelog de `react-router-dom` (CSRF en modo RSC — confirmar si aplica al uso actual) antes de actualizar.
- **Archivos:** `package.json`, `package-lock.json`.
- **Criterio de hecho:** `npm audit` sin vulnerabilidades altas en dependencias de producción.

---

## Fase 2 — Medio

### 2.1 — Centralizar autorización "autor o admin" en marketing
- [ ] Extraer el patrón `esAdmin || item.autorId === req.user!.id` (duplicado en al menos 4 recursos × 2 operaciones) a un helper único, aprovechando `canPerformAction`/`ROLE_PERMISSIONS` ya definidos en `api/_lib/roles.ts` pero no usados.
- **Archivos:** `api/_lib/roles.ts`, `api/marketing/*/[id].ts`.

### 2.2 — Descomponer `DashboardProfesor.jsx`
- [ ] Extraer lógica de bloques/módulos/alumnos/contenidos a hooks dedicados (siguiendo el patrón ya usado en `useAlumno.js`/`useMarketing.js`), reduciendo el componente de 1558 líneas y ~25 `useState`.
- **Archivos:** `src/components/dashboard/profesor/DashboardProfesor.jsx`, posible nuevo `src/hooks/useProfessorDashboard.js` (evaluar si ya existe `useProfessor.js` y por qué no se usa completo).

### 2.3 — Corregir validaciones en gestión de usuarios
- [ ] `PUT /api/admin/usuarios/[id]`: no permitir dejar a un usuario sin roles cuando `roleIds: []` sin confirmación/error explícito.
- [ ] Validar email duplicado en el PUT igual que ya se hace en el POST, devolviendo 409 controlado en vez de propagar la excepción cruda de Prisma.
- **Archivos:** `api/admin/usuarios/[id].ts`.

### 2.4 — Unificar chequeo de rol admin
- [ ] Reemplazar `req.user!.roles[0] !== 'administrador'` por `hasRole(req.user!.roles, 'administrador')` en `api/profesor/bloques/alumnos.ts`, consistente con el resto del código.
- **Archivos:** `api/profesor/bloques/alumnos.ts`.

### 2.5 — Rate limiting básico
- [ ] Agregar rate limiting (Vercel Edge Middleware o Upstash) al menos en el endpoint de login (una vez exista) y en los endpoints que listan usuarios.
- **Archivos:** middleware nuevo, `api/_lib/`.

---

## Fase 3 — Bajo

### 3.1 — Auditoría real en vez de placeholder ✅ Resuelto (2026-08-20)
- [x] Reemplazar `logAudit` (`api/_lib/auth.ts`, hoy solo hace `console.log`) por persistencia real en una tabla de auditoría, si se necesita trazabilidad para decisiones académicas o disputas de tutores.
- **Archivos:** `api/_lib/auth.ts`, `prisma/schema.prisma` (nueva tabla).
- **Cómo quedó:** nuevo modelo `RegistroAuditoria` (`registros_auditoria`) con `usuarioId` opcional y `onDelete: SetNull` (a diferencia del resto del schema que usa `Cascade` — un registro de auditoría no debe desaparecer si se borra el usuario), `accion`, `entidad`, `detalles` (Json), `createdAt`, con índices en `usuarioId` y `createdAt`. Migración: `prisma/migrations/20260820194244_add_registro_auditoria/`. `logAudit` mantiene la misma firma (no se tocó ningún call site de los ~15 lugares que la usan) y ahora persiste vía `db.registroAuditoria.create(...)` dentro de un `try/catch`: si falla la escritura de auditoría, se loguea el error pero no se interrumpe la operación de negocio principal.
- **Validado:** migración aplicada localmente, `npx tsc --noEmit` sin errores, `npm run lint` sin errores nuevos (los 11 preexistentes son de `src/`, confirmado con `git stash`).
- **Pendiente relacionado (no incluido en esta tarea):** no hay endpoint de lectura/consulta de la tabla de auditoría, y no se agregaron tests — evaluar si conviene sumarlos como parte de la tarea 1.4 (cobertura de tests).

### 3.2 — Documentar convención de manejo de errores en el cliente API
- [ ] Definir y documentar cuándo un método de `src/services/api.js` debe silenciar errores (devolver default) vs propagarlos, en vez de dejarlo implícito por convención no escrita.
- **Archivos:** `src/services/api.js`.

---

## Resumen de estado

| Fase | Tareas | Estado |
|---|---|---|
| 0 — Crítico | 4 | ⏳ Pendiente |
| 1 — Alto | 5 | ⏳ Pendiente |
| 2 — Medio | 5 | ⏳ Pendiente |
| 3 — Bajo | 2 | 🔵 1/2 en progreso (3.1 resuelto 2026-08-20) |

*Actualizar esta tabla y los checkboxes de cada tarea a medida que se resuelven. No marcar una fase como cerrada si quedan tareas críticas de una fase anterior sin resolver.*
