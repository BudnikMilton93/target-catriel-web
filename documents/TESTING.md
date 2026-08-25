# 🧪 GUÍA DE PRUEBA ACTUALIZADA

## 1) Arranque del proyecto

```bash
cd /Users/miltonjeremiasbudnik/Workspace/TargetCatriel-react-web/TargetCatriel-react-web
npm install
npm run db:up
npx prisma generate
npx prisma migrate deploy
npm run dev
npm run dev:api
```

- Frontend: http://localhost:5173
- API local: http://localhost:3000

---

## 2) Usuarios de prueba

Los usuarios reales de la base de datos (semilla) y el mock local coinciden.

| Email | Rol | Dashboard |
|---|---|---|
| `maria@target.com` | profesor | `/dashboard/profesor` |
| `juan@student.com` | alumno | `/dashboard/alumno` |
| `admin@target.com` | administrador | `/dashboard/admin` |
| `marketing@target.com` | marketing | `/dashboard/marketing` |

La contraseña puede ser cualquiera en el mock de autenticación actual.

---

## 3) Flujo recomendado de validación

### 3.1 Páginas públicas
- Entrar a la home
- Verificar navegación por Clases, Viajes y Sobre Nosotros
- Probar acceso a login

### 3.2 Login por rol
- Iniciar sesión con cada email anterior
- Confirmar redirección correcta a su panel
- Verificar que el guard de rutas funcione

### 3.3 Profesor
- Crear un bloque
- Crear un módulo asociado
- Agregar contenido (texto / actividad / pregunta / audio)
- Validar bloqueo al intentar editar o borrar contenido con respuestas

### 3.4 Alumno
- Entrar como alumno
- Seleccionar bloque
- Ver módulos y contenidos
- Enviar respuestas
- Validar edición y visibilidad privada/compartida

### 3.5 Admin
- Revisar tab de usuarios/reportes
- Verificar acceso al panel de administración
- Validar pendencias en integraciones reales

### 3.6 Marketing
- Crear noticias y viajes
- Revisar galería y contenido institucional
- Verificar flujo con el contenido público

---

## 4) Validaciones críticas del sistema

1. El usuario debe poder autenticarse con email válido y redirección por rol.
2. Las rutas protegidas deben bloquear acceso no autorizado.
3. Los endpoints con roles deben responder 401/403 cuando corresponde.
4. Los contenidos ya respondidos no deben eliminarse ni editarse en forma agresiva.
5. El flujo profesor → módulo → contenido → alumno debe ser consistente con la base de datos.

---

## 5) Estado actual de testing

Se encuentra en etapa de validación funcional, no como testing final completo.

### Ya cubierto funcionalmente
- Autenticación mock por rol
- Dashboard por rol
- CRUD estructural de profesor
- CRUD de contenido para marketing
- Base de datos y API local funcionales

### Pendiente de validación
- Conexión real de dashboards a API
- Flujos de usuarios reales con datos persistidos
- Reportes y panel admin completos
- Revisión UX de uso en producción local

---

## 6) Recomendación

Antes de cerrar el proyecto como listo para producción, conviene ejecutar una batería de pruebas por rol con datos reales de Prisma y verificar los errores de negocio que devuelve la API.

Esto será la base para la siguiente fase de integración y estabilización del proyecto.

---

## 7) Tests automatizados

### 7.1 Unit tests (Vitest)

Cubren `api/_lib/` y los handlers de `api/` (auth, roles, response, y las
reglas de negocio/autorización de los endpoints con `[id].ts`). Mockean
`db` (Prisma) por completo — no requieren Postgres levantado.

```bash
npm run test
```

Helpers compartidos entre archivos de test en `api/_lib/test-utils.ts`:
`createMockRes()` (mock de `http.ServerResponse`) y `mockAuthAs(userId, roles)`
(simula un usuario autenticado, requiere que el test haya mockeado `db` con
`usuario.findUnique`/`usuarioRol.findMany`).

### 7.2 E2E (Playwright)

Cubren el login mockeado del frontend y el guard de rutas (`e2e/auth.spec.ts`),
contra `src/context/AuthContext.jsx` — no llaman a la API real, por lo que
**no requieren Postgres ni `npm run dev:api`**. `playwright.config.ts` levanta
únicamente el frontend (`npm run dev`) como `webServer`.

```bash
npm run test:e2e       # headless
npm run test:e2e:ui    # modo interactivo
```

Si en el futuro un spec necesita ejercitar la API real, hay que agregar una
segunda entrada a `webServer` en `playwright.config.ts` para `npm run dev:api`
(con su propio readiness check) y documentar acá el requisito de
`npm run db:up` + `npx prisma migrate deploy` + seed antes de correr esos
specs — no asumir que todos los specs futuros lo necesitan.

---

## 8) Referencia de endpoints (cURL)

IDs de la base semilla usados como Bearer token en estos ejemplos:

```
Admin Target:      cmsg6edcc00048r2uktg2ho91
Prof. María:       cmsg6edcf00078r2uobml8udi
Juan Pérez:        cmsg6edcg000a8r2u80kyl8l2
Sofia López:       cmsg6edci000d8r2upapne4c3
Marketing Team:    cmsg6edcj000g8r2uxnn8lbbp
```

### PROFESOR - Bloques

Listar bloques del profesor
```bash
curl -H "Authorization: Bearer cmsg6edcf00078r2uobml8udi" \
  http://localhost:3000/api/profesor/bloques
```

Crear bloque
```bash
curl -X POST \
  -H "Authorization: Bearer cmsg6edcf00078r2uobml8udi" \
  -H "Content-Type: application/json" \
  -d '{
    "nivel": "A1",
    "dias": "Lunes y Miércoles",
    "horaInicio": "2026-08-05T09:00:00Z",
    "horaFin": "2026-08-05T11:00:00Z",
    "anio": 2026
  }' \
  http://localhost:3000/api/profesor/bloques
```

Obtener detalles de bloque
```bash
curl -H "Authorization: Bearer cmsg6edcf00078r2uobml8udi" \
  http://localhost:3000/api/profesor/bloques/:bloqueId
```

Actualizar bloque
```bash
curl -X PUT \
  -H "Authorization: Bearer cmsg6edcf00078r2uobml8udi" \
  -H "Content-Type: application/json" \
  -d '{
    "nivel": "A2",
    "dias": "Martes y Jueves"
  }' \
  http://localhost:3000/api/profesor/bloques/:bloqueId
```

Eliminar bloque
```bash
curl -X DELETE \
  -H "Authorization: Bearer cmsg6edcf00078r2uobml8udi" \
  http://localhost:3000/api/profesor/bloques/:bloqueId
```

### PROFESOR - Alumnos del Bloque

Listar alumnos inscritos
```bash
curl -H "Authorization: Bearer cmsg6edcf00078r2uobml8udi" \
  http://localhost:3000/api/profesor/bloques/:bloqueId/alumnos
```

Invitar alumno
```bash
curl -X POST \
  -H "Authorization: Bearer cmsg6edcf00078r2uobml8udi" \
  -H "Content-Type: application/json" \
  -d '{
    "alumnoId": "cmsg6edcg000a8r2u80kyl8l2"
  }' \
  http://localhost:3000/api/profesor/bloques/:bloqueId/alumnos
```

Remover alumno
```bash
curl -X DELETE \
  -H "Authorization: Bearer cmsg6edcf00078r2uobml8udi" \
  http://localhost:3000/api/profesor/bloques/:bloqueId/alumnos/:alumnoId
```

### PROFESOR - Módulos

Listar módulos
```bash
curl -H "Authorization: Bearer cmsg6edcf00078r2uobml8udi" \
  "http://localhost:3000/api/profesor/modulos?bloqueId=:bloqueId"
```

Crear módulo
```bash
curl -X POST \
  -H "Authorization: Bearer cmsg6edcf00078r2uobml8udi" \
  -H "Content-Type: application/json" \
  -d '{
    "bloqueId": ":bloqueId",
    "fecha": "2026-08-05T09:00:00Z",
    "estado": "borrador"
  }' \
  http://localhost:3000/api/profesor/modulos
```

Actualizar módulo
```bash
curl -X PUT \
  -H "Authorization: Bearer cmsg6edcf00078r2uobml8udi" \
  -H "Content-Type: application/json" \
  -d '{
    "estado": "habilitado"
  }' \
  http://localhost:3000/api/profesor/modulos/:moduloId
```

Eliminar módulo
```bash
curl -X DELETE \
  -H "Authorization: Bearer cmsg6edcf00078r2uobml8udi" \
  http://localhost:3000/api/profesor/modulos/:moduloId
```

### PROFESOR - Contenidos

Crear contenido
```bash
curl -X POST \
  -H "Authorization: Bearer cmsg6edcf00078r2uobml8udi" \
  -H "Content-Type: application/json" \
  -d '{
    "moduloId": ":moduloId",
    "tipo": "texto",
    "contenido": "Texto de la lección",
    "orden": 1
  }' \
  http://localhost:3000/api/profesor/contenidos
```

Actualizar contenido
```bash
curl -X PUT \
  -H "Authorization: Bearer cmsg6edcf00078r2uobml8udi" \
  -H "Content-Type: application/json" \
  -d '{
    "contenidoActualizado": "Texto actualizado"
  }' \
  http://localhost:3000/api/profesor/contenidos/:contenidoId
```

Eliminar contenido
```bash
curl -X DELETE \
  -H "Authorization: Bearer cmsg6edcf00078r2uobml8udi" \
  http://localhost:3000/api/profesor/contenidos/:contenidoId
```

### ALUMNO - Bloques

Listar bloques inscritos
```bash
curl -H "Authorization: Bearer cmsg6edcg000a8r2u80kyl8l2" \
  http://localhost:3000/api/alumno/bloques
```

Obtener módulos del bloque
```bash
curl -H "Authorization: Bearer cmsg6edcg000a8r2u80kyl8l2" \
  http://localhost:3000/api/alumno/bloques/:bloqueId
```

### ALUMNO - Respuestas

Listar respuestas propias
```bash
curl -H "Authorization: Bearer cmsg6edcg000a8r2u80kyl8l2" \
  http://localhost:3000/api/alumno/respuestas
```

Crear respuesta
```bash
curl -X POST \
  -H "Authorization: Bearer cmsg6edcg000a8r2u80kyl8l2" \
  -H "Content-Type: application/json" \
  -d '{
    "contenidoId": ":contenidoId",
    "respuesta": "Mi respuesta",
    "visibilidad": "privado"
  }' \
  http://localhost:3000/api/alumno/respuestas
```

Actualizar respuesta
```bash
curl -X PUT \
  -H "Authorization: Bearer cmsg6edcg000a8r2u80kyl8l2" \
  -H "Content-Type: application/json" \
  -d '{
    "respuestaActualizada": "Respuesta actualizada",
    "visibilidad": "compartido"
  }' \
  http://localhost:3000/api/alumno/respuestas/:respuestaId
```

Eliminar respuesta
```bash
curl -X DELETE \
  -H "Authorization: Bearer cmsg6edcg000a8r2u80kyl8l2" \
  http://localhost:3000/api/alumno/respuestas/:respuestaId
```

### ALUMNO - Asistencias

Ver asistencias propias
```bash
curl -H "Authorization: Bearer cmsg6edcg000a8r2u80kyl8l2" \
  http://localhost:3000/api/alumno/asistencias
```

### ADMIN - Usuarios

Listar todos los usuarios
```bash
curl -H "Authorization: Bearer cmsg6edcc00048r2uktg2ho91" \
  http://localhost:3000/api/admin/usuarios
```

Obtener detalles de usuario
```bash
curl -H "Authorization: Bearer cmsg6edcc00048r2uktg2ho91" \
  http://localhost:3000/api/admin/usuarios/:usuarioId
```

Crear usuario
```bash
curl -X POST \
  -H "Authorization: Bearer cmsg6edcc00048r2uktg2ho91" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Nuevo Usuario",
    "email": "nuevo@example.com",
    "passwordHash": "hashedPassword123"
  }' \
  http://localhost:3000/api/admin/usuarios
```

Actualizar usuario
```bash
curl -X PUT \
  -H "Authorization: Bearer cmsg6edcc00048r2uktg2ho91" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Nombre Actualizado"
  }' \
  http://localhost:3000/api/admin/usuarios/:usuarioId
```

Eliminar usuario
```bash
curl -X DELETE \
  -H "Authorization: Bearer cmsg6edcc00048r2uktg2ho91" \
  http://localhost:3000/api/admin/usuarios/:usuarioId
```

### ADMIN - Reportes

Dashboard consolidado
```bash
curl -H "Authorization: Bearer cmsg6edcc00048r2uktg2ho91" \
  http://localhost:3000/api/admin/reportes
```

Reportes de actividades
```bash
curl -H "Authorization: Bearer cmsg6edcc00048r2uktg2ho91" \
  "http://localhost:3000/api/admin/reportes?tipo=actividades"
```

Resumen de asistencias
```bash
curl -H "Authorization: Bearer cmsg6edcc00048r2uktg2ho91" \
  "http://localhost:3000/api/admin/reportes?tipo=asistencias"
```

Progreso de alumnos
```bash
curl -H "Authorization: Bearer cmsg6edcc00048r2uktg2ho91" \
  "http://localhost:3000/api/admin/reportes?tipo=progreso"
```
