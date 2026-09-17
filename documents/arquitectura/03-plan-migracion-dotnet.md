# Plan de migración de la API a .NET 8

Este documento es el seguimiento vivo de la migración de `api/` (TypeScript, funciones serverless estilo Vercel) a .NET 8. Nace del discovery confirmado el 2026-09-12 (ver resumen de decisiones en la sección 1) y fue revisado por el agente de seguridad el 2026-09-12 (ver sección 3). Se actualiza tildando checkboxes a medida que se completan pasos — no se reescribe retroactivamente el historial de decisiones ya tomadas, solo se agregan notas de estado.

Motivación: necesidad de concurrencia alta a corto plazo (carga concreta esperada, no especulativa) y el problema conocido de agotamiento del pool de conexiones de Postgres por `PrismaClient` en funciones serverless efímeras. Se aprovecha el movimiento para resolver de paso buena parte de la deuda de Fase 0 de `02-plan-remediacion.md` (auth sin verificar, passwords sin hashear).

## 0. Principios de este plan

- **Atomicidad**: cada paso es la unidad mínima que se puede completar, probar y verificar de forma aislada. Un paso no depende de "terminar de programar" varias cosas antes de poder probarse.
- **Test antes que código**: en todo endpoint que hoy no tiene test, el primer paso de su migración es escribir un test de contrato (characterization test) contra la implementación Node existente. Ese test es el criterio de aceptación del endpoint equivalente en .NET — no se considera migrado hasta que ese mismo contrato pasa contra .NET.
- **Documentación al cierre de fase**: `CLAUDE.md`, `01-arquitectura.md` y `01-ci-cd.md` se actualizan al cerrar cada fase (no en cada paso individual, para no generar ruido; no se pospone al final de todo, para no describir una arquitectura que ya dejó de ser cierta).
- **Cambios significativos requieren aprobación explícita** antes de ejecutarse (según `CLAUDE.md` global): nueva infraestructura (gateway, Container Apps), autenticación, y el primer deploy de cada fase a un ambiente compartido. Se marcan con 🔒 en este documento.
- Este plan macro no reemplaza el detalle técnico de implementación de cada paso (eso lo define `implementer` al ejecutar cada uno) — es el mapa de secuenciación y control.

## 1. Decisiones ya tomadas (discovery, 2026-09-12)

| Decisión | Resumen |
|---|---|
| Auth | Se descarta el plan de Supabase Auth. JWT propio emitido/validado por la nueva capa de auth, con hashing de contraseñas. |
| Orden macro | Auth nuevo → Gateway de ruteo → Strangler por rol (marketing → profesor/alumno/admin). |
| Convivencia de auth | No se mantiene el esquema viejo (`Bearer <userId>`) en paralelo — se corta una sola vez, en el paso de auth. El JWT nuevo sí debe validarse igual en Node remanente y en .NET durante toda la convivencia. |
| Ruteo | Gateway único: el frontend siempre habla con la misma dirección; el gateway decide a qué backend enviar cada request. |
| Prioridad | La migración (que resuelve buena parte de la Fase 0 de deuda técnica vía el nuevo auth) es prioritaria frente al resto del plan de remediación no relacionado. |
| Estructura de datos | Postgres y el schema estructural se mantienen; EF Core se genera con `dotnet ef dbcontext scaffold` contra la base existente. |
| Capas | No se introduce service/repository layer en .NET por defecto — mismo criterio YAGNI vigente hoy. |

## 2. Preguntas abiertas no bloqueantes

Estas preguntas no impiden arrancar, pero cada una se vuelve bloqueante en un punto concreto del plan — están referenciadas ahí donde corresponde en vez de resolverse todas ahora:

- [ ] **P1** — Fecha de deploy a producción comprometida (condiciona el ritmo de todas las fases).
- [ ] **P2** — ¿Se toca el frontend en paralelo para conectar el panel de Marketing a la API real (tarea 1.3 de `02-plan-remediacion.md`)? Relevante antes de cerrar la Fase 3 (bloqueante en el paso 3.6).
- [ ] **P3** — ¿El IDOR de `api/profesor/respuestas/index.ts` se resuelve ya en Node, o se resuelve directamente en la reescritura .NET? **Recomendación de seguridad (2026-09-12): resolverlo ya, ver acción S1 en sección 3** — no esperar a Fase 4 si hay chance de que Node siga sirviendo tráfico real antes de esa fase.
- [ ] **P4** — ¿Ya existe una suscripción/instancia de Azure Container Apps de prueba, o se arranca de cero (red, secrets, IaC)? Bloqueante en el paso 2.1 (Fase 2, Gateway).
- [ ] **P5** — Tecnología concreta del gateway (Azure Front Door, API Management, YARP propio, otro). Bloqueante en el paso 2.1.
- [ ] **P6** — ¿El nuevo servicio de auth se implementa en Node (antes de tocar el primer endpoint .NET) o directamente como el primer servicio real en .NET? Bloqueante en el paso 1.1.
- [ ] **P7** — Ubicación del nuevo proyecto .NET en el repo: monorepo (ej. `api-dotnet/` conviviendo con `api/`) o repo separado. Bloqueante en el paso 1.1.

## 3. Revisión de seguridad previa al arranque (2026-09-12)

Hecha por el agente `security` antes de la Fase 0. Confirma que los hallazgos de `02-plan-remediacion.md` siguen vigentes, no encuentra secretos expuestos, y agrega los puntos nuevos de abajo. No hay nada que bloquee arrancar la Fase 0 (inventario de tests, formato de contrato) — no toca código de producción ni auth.

### 3.1 Acciones inmediatas, en paralelo, sin esperar el turno de su fase

- ✅ **S1** — Arreglar el IDOR de `api/profesor/respuestas/index.ts` en Node ahora: cuando se pasa `bloqueId` por query, no se verifica que ese bloque pertenezca al profesor autenticado (solo se restringe por profesor en la rama sin `bloqueId`). Reemplaza a "esperar la Fase 4" si Node va a servir tráfico real antes de llegar ahí. **Resuelto 2026-09-12**: valida pertenencia del bloque antes de usarlo en el `where`, 403 si no pertenece (admins exentos); test en `api/profesor/respuestas/index.test.ts`.
- ✅ **S2** — Actualizar `react-router-dom`/`react-router` (severidad alta, [GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2), CSRF bypass en modo RSC). Confirmado: el proyecto usa `BrowserRouter` clásico (`src/main.jsx`), sin modo RSC — no explotable en este runtime, pero se actualizó igual (`npm audit fix`, 0 vulnerabilidades) por ser de bajo costo.
- ✅ **S3** — Corregir `api/profesor/bloques/alumnos.ts`: el chequeo `req.user!.roles[0] !== 'administrador'` es un bug de autorización, no solo de estilo — Prisma no garantiza orden en el array de roles sin `orderBy` explícito en `getUserRoles`, así que un usuario con múltiples roles puede quedar mal autorizado en cualquier dirección. Reemplazar por `hasRole(...)` (tarea 2.4 de `02-plan-remediacion.md`, escalada de severidad). **Resuelto 2026-09-12**: reemplazado por `hasRole(...)`; test en `api/profesor/bloques/alumnos.test.ts`.
- ✅ **S1b** — Barrido de seguridad completo (2026-09-13) del mismo patrón de riesgo en los 34 endpoints. **Patrón B (IDOR)**: sin hallazgos nuevos, todo el resto del código valida pertenencia correctamente. **Patrón A (`roles[N]`)**: se repetía en `api/profesor/modulos/index.ts`, `api/profesor/modulos/[id].ts` y `api/profesor/contenidos/index.ts` — mismo bug de fondo que S3 (efecto: admin con múltiples roles podía quedar denegado de sus propios permisos, por el orden no determinista de `getUserRoles`). Los 3 corregidos con `hasRole(...)`, con test de regresión cada uno. Además se agregó un gate de CI (`scripts/check-no-roles-index.sh`, corrido como `npm run check:no-roles-index` en `.github/workflows/ci.yml`) que falla el build si el patrón `roles[N]` reaparece fuera de tests.

### 3.2 Decisiones de diseño a cerrar antes del paso 1.8 (corte del esquema de auth viejo)

Estas decisiones se toman como parte del diseño de los pasos 1.1-1.7, no se descubren a mitad de la implementación:

- [ ] **S4** — Persistencia y rotación de la clave de firma del JWT: simétrica (HS256, misma clave compartida entre Node y .NET vía secret manager durante la convivencia) vs asimétrica (RS256/ES256, solo la clave pública viaja a quien valida) — con dos runtimes validando el mismo token en paralelo, la asimétrica reduce la superficie de exposición de la clave privada a un solo servicio emisor.
- [ ] **S5** — Expiración de access token (corto, ej. 15 min) vs refresh token (más largo, con rotación) — definir valores explícitos, no heredar el default de la librería elegida.
- [ ] **S6** — Mecanismo de revocación: con JWT stateless puro no hay forma de cortar acceso antes de que expire el access token. El modelo de roles de este proyecto es "todo o nada" por rol (`ROLE_PERMISSIONS`), así que una cuenta `administrador` comprometida es un compromiso total del sistema mientras el token siga vivo. Decidir explícitamente si se acepta esa ventana o si hace falta una lista de revocación/versión de token por usuario.
- [ ] **S7** — `localStorage` vs cookie `httpOnly` para el token en la SPA React: no heredar `localStorage` del mock de auth actual (`AuthContext.jsx`) por inercia. Hay una vulnerabilidad de CSRF pendiente en React Router (S2) y no hay sanitización sistemática de inputs — la superficie de XSS no es despreciable, lo cual inclina la balanza hacia `httpOnly` pese a que exige manejar CSRF aparte.
- [ ] **S8** — Estrategia de CORS, coordinada con el diseño del gateway (Fase 2): hoy no hay política CORS porque frontend y funciones serverless conviven bajo el mismo dominio de Vercel. Si el gateway/Container Apps termina en un dominio distinto al del frontend, esto deja de ser gratis — y si S7 se resuelve con cookies, hace falta `SameSite`/`credentials` explícitos coordinados con esa decisión. Cerrar junto con el paso 2.1.
- [ ] **S9** — Definir el modo de falla del propio servicio de auth nuevo (no solo el del backend .NET, ya cubierto en el paso 2.4): si el servicio de auth está caído, ¿ambos backends (Node remanente y .NET) rechazan todo, o hay algún fallback? Documentar en el cierre de Fase 1 (paso 1.9).
- [ ] **S10** — Antes de dar por cerrado el paso 1.8 (corte del esquema viejo), confirmar explícitamente que no queda ningún consumidor (interno o externo, documentado o no) todavía apuntando al esquema `Bearer <userId>` — tratarlo como checklist de verificación, no solo como punto de no retorno técnico.

### 3.3 Para incorporar como criterio de aceptación al escribir tests de contrato (Fases 4-6)

- [ ] **S11** — Validación de input en los límites del sistema: ejemplo confirmado en `alumno/respuestas/[id].ts`, donde `visibilidad` acepta cualquier string en vez de restringirse a `"privado"|"compartido"`. Al escribir el test de contrato de cada endpoint (Fases 3-6), no limitarse a preservar el comportamiento permisivo actual — usar la reescritura en .NET para agregar DTOs tipados con validación (ej. FluentValidation o data annotations).

## 4. Fases y pasos atómicos

### Fase 0 — Red de seguridad antes de tocar nada

- ✅ **0.1** Ver qué endpoints ya tienen test y cuáles no. **Resuelto**: resumen en sección 7 (26 endpoints, 8 con test, 18 sin test).
- ✅ **0.2** Definir cómo se escribe un test de contrato. **Resuelto**: resumen en sección 8; ejemplo en `api/marketing/sobre-nosotros/[id].test.ts`.
- [ ] **0.3** Escribir el test de contrato para el shape de error genérico/500 (hoy manejado por el catch de `withAuth`/`handleError`) — este es el que blinda el riesgo de "divergencia de errores no manejados" antes de que exista ningún código .NET.
- [ ] **0.4** Confirmar P6 y P7 (dónde vive el auth nuevo, dónde vive el proyecto .NET) — desbloquea la Fase 1.

### Fase 1 — 🔒 Autenticación nueva (JWT propio + hashing)

- [ ] **1.0** Cerrar las decisiones de diseño S4-S8 de la sección 3.2 antes de escribir código de esta fase.
- [ ] **1.1** Crear el proyecto base (Node o .NET, según P6/P7) para el servicio de auth. Sin lógica todavía — solo el esqueleto, health check, y su lugar en el repo.
- [ ] **1.2** Escribir el test de contrato de login actual (`Bearer <userId>` → usuario + roles) contra el comportamiento de hoy, como línea base a reemplazar (no a preservar).
- [ ] **1.3** Implementar hashing de contraseñas (resuelve tarea 0.2 de `02-plan-remediacion.md`) y migración de datos de usuarios existentes (seed) a passwords hasheadas.
- [ ] **1.4** Implementar emisión de JWT (login) con test de contrato: credenciales válidas → JWT con claims de usuario + roles; credenciales inválidas → 401. Aplicar la decisión de expiración de S5.
- [ ] **1.5** Implementar validación de JWT como middleware, reemplazando `authenticateRequest`/`extractToken` actuales — con test de contrato para token válido, expirado, inválido, ausente. Aplicar la decisión de clave de firma de S4.
- [ ] **1.6** Implementar refresh de token, con test de contrato. Aplicar la decisión de revocación de S6 si corresponde.
- [ ] **1.7** Portar `requireRole`/`ROLE_PERMISSIONS` al nuevo esquema (policy-based si es .NET) sin cambiar la matriz de permisos existente — test de contrato por rol/acción.
- [ ] **1.8** 🔒 Cortar el esquema viejo (`Bearer <userId>`) — punto de no retorno de esta fase. Requiere aprobación explícita antes de ejecutarse. Verificar S10 (ningún consumidor viejo activo) antes de dar el paso por cerrado.
- [ ] **1.9** Cierre de fase: actualizar `CLAUDE.md` (sección Roles y autenticación) y `01-arquitectura.md` reflejando el nuevo esquema de auth vigente, incluyendo el modo de falla del servicio de auth (S9) y la decisión de almacenamiento en frontend (S7).

### Fase 2 — 🔒 Gateway / ruteo

- [ ] **2.1** Confirmar P4 y P5 (infraestructura disponible, tecnología del gateway) y cerrar la estrategia de CORS/cookies de S8.
- [ ] **2.2** Levantar el gateway con una única regla: todo el tráfico va a Node (sin cambio de comportamiento observable todavía) — paso atómico para validar que el gateway en sí no rompe nada antes de que tenga lógica de ruteo real.
- [ ] **2.3** Agregar reglas de ruteo por rol/recurso (aunque todavía no haya nada en .NET que recibir) y health checks del/los backend(s).
- [ ] **2.4** Definir y documentar el modo de falla explícito: qué responde el gateway si el backend .NET no está disponible (no debe caer silenciosamente a datos inconsistentes de Node).
- [ ] **2.5** 🔒 Apuntar el frontend al gateway en vez de directo a Vercel — requiere aprobación explícita (cambia el punto de entrada real de producción/staging).
- [ ] **2.6** Cierre de fase: actualizar `01-ci-cd.md` con nota de "en transición" — el pipeline actual sigue atado a Vercel para lo no migrado, y el gateway es la nueva pieza intermedia.

### Fase 3 — Migración piloto: Marketing

Orden interno por riesgo creciente: `sobre-nosotros` → `galeria` → `noticias` → `viajes`.

- [ ] **3.1** `sobre-nosotros`: test de contrato (si no existe) → implementación EF Core scaffold + endpoint .NET → verificar contrato → activar ruteo en el gateway para este recurso.
- [ ] **3.2** `galeria`: mismo ciclo (test → implementación → verificación → corte de ruteo).
- [ ] **3.3** `noticias`: mismo ciclo.
- [ ] **3.4** `viajes`: mismo ciclo. Al llegar acá, resolver de paso el fix de "autor o admin" centralizado (tarea 2.1 de `02-plan-remediacion.md`) usando la matriz de permisos ya portada en 1.7 — no reproducir la duplicación en C#.
- [ ] **3.5** Agregar los índices de FK faltantes detectados al auditar el modelo scaffoldeado por EF Core (tarea 1.2 de `02-plan-remediacion.md`). **Adelantado 2026-09-12**: los 17 índices ya están agregados en `prisma/schema.prisma` (independiente del scaffold de EF Core, no hacía falta esperar). Falta correr `npx prisma migrate dev --name add_missing_fk_indexes` con Postgres local levantado (`npm run db:up`) para generar la migración — pendiente porque Docker no estaba disponible al momento de hacer el cambio.
- [ ] **3.6** Confirmar P2 (¿se conecta el panel de Marketing del frontend a la API real como parte de este cierre, o marketing en .NET queda sin consumidor real hasta que se resuelva aparte?).
- [ ] **3.7** Cierre de fase: actualizar `01-arquitectura.md`/`CLAUDE.md` marcando `marketing` como migrado a .NET; decommission del código Node de `api/marketing/*` solo después de un período de estabilización a definir.

### Fase 4 — Migración: Profesor

Orden interno: `bloques`/`modulos`/`contenidos` (CRUD propio) → `respuestas` (mayor riesgo, IDOR conocido).

- [ ] **4.1** `bloques` (index + `[id]` + `alumnos.ts`): test de contrato → implementación → verificación → corte. Si S3 no se resolvió antes, resolverlo acá.
- [ ] **4.2** `modulos` (index + `[id]`): mismo ciclo.
- [ ] **4.3** `contenidos` (index + `[id]`): mismo ciclo.
- [ ] **4.4** Confirmar P3/S1 (el IDOR de `respuestas` debería estar resuelto en Node desde antes — ver sección 3.1). Si por algún motivo no se resolvió, se resuelve como parte de este paso, no después.
- [ ] **4.5** `respuestas`: test de contrato (incluyendo el caso del IDOR ya corregido) → implementación con DTOs validados (S11) → verificación → corte.
- [ ] **4.6** Cierre de fase: actualizar documentación.

### Fase 5 — Migración: Alumno

Orden interno: `bloques`/`modulos`/`asistencias` (lectura acotada al propio alumno) → `respuestas` (escritura + visibilidad).

- [ ] **5.1** `bloques` (index + `[id]`): test de contrato → implementación → verificación → corte.
- [ ] **5.2** `modulos`: mismo ciclo.
- [ ] **5.3** `asistencias`: mismo ciclo.
- [ ] **5.4** `respuestas` (index + `[id]`): mismo ciclo, prestando atención especial a las reglas de visibilidad privado/compartido y a la validación de `visibilidad` como DTO tipado (S11).
- [ ] **5.5** Cierre de fase: actualizar documentación.

### Fase 6 — Migración: Admin (cierre del strangler)

Orden interno: `reportes` (lectura agregada) → `usuarios` (mayor riesgo del sistema completo).

- [ ] **6.1** `reportes`: test de contrato → implementación → verificación → corte.
- [ ] **6.2** `usuarios` (index + `[id]`): test de contrato → implementación, incluyendo validación de email duplicado y roles vacíos (tarea 2.3 de `02-plan-remediacion.md`) → verificación → corte. Este es el último recurso del strangler completo.
- [ ] **6.3** Cierre de fase: actualizar documentación confirmando que los cuatro roles están 100% en .NET.

### Fase 7 — Cierre de la migración

- [ ] **7.1** Decommission del código Node bajo `api/` y de `scripts/dev-api-server.ts`, una vez confirmado el período de estabilización de cada rol.
- [ ] **7.2** Simplificar el gateway si ya no necesita repartir entre dos backends (evaluar si sigue teniendo valor por otras razones, ej. autoscaling/KEDA, antes de removerlo).
- [ ] **7.3** Actualización final de `CLAUDE.md` (stack, estructura), `01-arquitectura.md` (retirar la sección "en migración") y `01-ci-cd.md` (pipeline definitivo sobre Container Apps).
- [ ] **7.4** Evaluar con `capture-learnings` qué decisiones no obvias de esta migración vale la pena dejar registradas en `documents/05-learnings.md`.

## 5. Qué se resuelve de paso (no requiere paso aparte)

Ya integrado en los pasos de arriba, no son tareas adicionales: hashing de passwords (1.3), fix autor-o-admin en marketing (3.4), índices FK (3.5), IDOR de `profesor/respuestas` (S1/4.4-4.5), bug de autorización en `profesor/bloques/alumnos.ts` (S3/4.1), validaciones de `admin/usuarios` (6.2), validación de DTOs (S11).

## 6. Explícitamente fuera de alcance de esta migración

- Rate limiting (tarea 2.5 de `02-plan-remediacion.md`) — se evalúa una vez el gateway esté funcionando y se sepa qué tecnología se usó.
- Descomposición de `DashboardProfesor.jsx` (tarea 2.2) — es frontend.
- Actualización de dependencias de desarrollo/build no críticas (`brace-expansion`, `nanoid`, `postcss`) — bajo impacto, no llegan al runtime expuesto.

## 7. Cobertura de tests actual (paso 0.1)

- Son 26 endpoints en total (no 34 como se pensaba al principio).
- 8 endpoints ya tienen al menos un test, más 3 archivos internos (`_lib`) que también están cubiertos.
- 18 endpoints todavía no tienen ningún test.
- Con test: `alumno/respuestas/[id]`, `profesor/bloques/[id]`, `profesor/bloques/alumnos`, `profesor/contenidos` (index y `[id]`), `profesor/modulos` (index y `[id]`), `profesor/respuestas/index`.
- Sin test: todo `admin/*`, todo `marketing/*`, el resto de `alumno/*`, y `profesor/alumnos`/`profesor/bloques/index`.
- Algunos de los que sí tienen test solo cubren permisos (quién puede usarlo), no otros casos como "no existe" o validación de datos — quedan para reforzar antes de la Fase 4.

## 8. Formato del test de contrato (paso 0.2)

- Se sigue usando Vitest, como el resto del proyecto — no se suma ninguna herramienta nueva.
- Cada test de contrato revisa dos cosas simples: qué código HTTP devuelve (200, 403, 404, etc.) y si la respuesta viene con la forma esperada (`{ success: true, data }` o `{ success: false, error }`) — sin fijarse en el texto exacto del mensaje de error, que puede cambiar de redacción sin que eso sea un problema.
- El caso "sin sesión" (401) no se repite en cada endpoint: ya está cubierto una sola vez en `_lib/auth.test.ts`, y todos los endpoints lo heredan de ahí.
- Los casos 403 (sin permiso) y 404 (no existe) sí se escriben por endpoint, porque dependen de la regla de negocio de cada uno.
- Este mismo test, corrido después contra el endpoint ya reescrito en .NET, es lo que confirma que ese endpoint quedó bien migrado.
- Ejemplo de referencia: `api/marketing/sobre-nosotros/[id].test.ts`.
