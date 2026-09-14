# Target Catriel — React Web

Plataforma fullstack de una escuela de inglés: frontend React con dashboards por rol, backend de API bajo `api/`, base de datos PostgreSQL vía Prisma.

Este archivo documenta lo específico de este proyecto. Los principios generales de ingeniería (SOLID, clean code, seguridad, git flow) y los agentes/skills/comandos disponibles (`/nueva-feature`, `/fix-bug`, `/review-pr`, `/ship`, `/docs`, y los agentes discovery/implementer/testing/code-review/security/git-delivery/docs-master) vienen del `CLAUDE.md` global del desarrollador — no los dupliques acá. `docs-master`/`/docs` aplica en particular a este proyecto porque ya mantiene documentación real (`documents/arquitectura/`, roadmaps, diagramas HTML) — usarlo antes de abrir el PR de un cambio que la toque.

## Stack

- **Frontend**: React 19 + Vite, React Router v7. JSX, sin TypeScript en `src/`.
- **Backend**: funciones serverless estilo Vercel bajo `api/`, escritas en TypeScript.
- **Base de datos**: PostgreSQL vía Prisma (`prisma/schema.prisma`). Docker Compose para levantar Postgres en local (`npm run db:up`).
- **Sin Supabase todavía** — se menciona como preferencia futura en la documentación del roadmap pero no está integrado. No asumas que existe.

## Estructura

```
src/            frontend (páginas, componentes por rol, contexto de auth, hooks, servicios)
api/            endpoints serverless, agrupados por rol: admin/, alumno/, profesor/, marketing/
api/_lib/       utilidades compartidas de la API: auth.ts, db.ts, response.ts, roles.ts, types.ts
prisma/         schema.prisma y seed
documents/      roadmaps por rol y documentación de arquitectura/testing/infraestructura — revisar antes de tocar un área
scripts/        utilidades de desarrollo (ej. dev-api-server.ts)
```

Documentación existente a consultar según el área que toques: `documents/00-roadmap-index.md` y los roadmaps por rol bajo `documents/roadmaps/` (`01-roadmap-profesor.md`, `02-roadmap-alumno.md`, `03-roadmap-administrador.md`, `04-roadmap-marketing.md`), `documents/arquitectura/01-arquitectura.md`, `documents/arquitectura/02-plan-remediacion.md` (deuda técnica y seguridad), `documents/arquitectura/03-plan-migracion-dotnet.md` (plan de acción vigente: migración de la API a .NET 8, en curso — revisar antes de tocar cualquier endpoint de `api/`), `documents/infraestructura/01-ci-cd.md`, `documents/testing/01-testing.md`, `documents/05-learnings.md` (aprendizajes y decisiones técnicas no obvias, capturados con la skill `capture-learnings`), `api/README.md`.

`documents/diagrams/` tiene diagramas HTML de uso interno (estructura del proyecto, stack/librerías, arquitectura, tests existentes) para orientación visual rápida. **Actualizarlos cada vez que haya un cambio importante** en esas áreas (nueva librería o versión relevante, carpeta/módulo nuevo, cambio de arquitectura o de auth, tests nuevos o quitados) — no dejar que queden desactualizados respecto al resto de `documents/`.

## Roles y autenticación

Cuatro roles: `administrador`, `profesor`, `alumno`, `marketing` (tabla `Rol`, relación N:N vía `UsuarioRol`).

- **Frontend**: autenticación mockeada en `src/context/AuthContext.jsx` contra usuarios de prueba fijos (`src/context/AuthContext.jsx`) — cualquier contraseña funciona. No hay Supabase Auth ni JWT real todavía.
- **Backend**: las Vercel Functions sí validan de verdad contra la base de datos. `api/_lib/auth.ts` resuelve el usuario autenticado a partir del header `Authorization: Bearer <userId>`; `api/_lib/roles.ts` expone `requireRole(...)`, `hasRole`, y el mapa `ROLE_PERMISSIONS` con los permisos por acción (ej. `crear_galeria`, `editar_noticia`). Cualquier endpoint nuevo que toque contenido de marketing, notas de profesor, etc. debe usar este mismo mecanismo, no reinventar uno propio.
- El mock de auth del frontend y la validación real del backend conviven así hoy — no asumas que están unificados ni que hay que resolverlo salvo que el requerimiento lo pida explícitamente.

## Convenciones de API

- Cada recurso vive bajo `api/<rol>/<recurso>/` (ej. `api/marketing/galeria/index.ts`).
- Los endpoints usan Prisma directo (`api/_lib/db.ts`) — no hay capa de repositorio/servicio intermedia.
- Errores estandarizados con `ApiError` y `ErrorMessages` (`api/_lib/types.ts`), formateados con `api/_lib/response.ts`.
- Antes de crear un endpoint nuevo, mirá uno existente del mismo rol como referencia de estructura y manejo de errores.

## Estado conocido / pendientes explícitos

- El campo `imagen`/`url` en `Galeria`, `Noticia` y `SobreNosotros` hoy es un string que se completa pegando una URL a mano — **no hay carga de archivos ni storage de objetos integrado** (se verificó: no hay `multipart`, `formidable`, `multer`, S3, Cloudinary ni Supabase Storage en el repo). Si el requerimiento es "subir una foto", esto es una decisión de arquitectura pendiente, no algo que ya esté resuelto en otra parte del código.
- `documents/roadmaps/04-roadmap-marketing.md` ya señala el manejo de imágenes/multimedia como pendiente conocido — revisarlo antes de discovery en esa área.
- Según el README, "la parte aún pendiente es la integración final entre algunos paneles y la API real, junto con refinamientos UX y pruebas end-to-end" — no asumas que un panel ya está completamente conectado al backend solo porque el backend existe.

## Comandos útiles

```bash
npm run dev          # frontend (Vite)
npm run dev:api      # servidor de API local
npm run db:up        # levanta Postgres en Docker
npx prisma studio    # explorar la base de datos
npm run lint         # ESLint
npm run check:no-roles-index  # gate de CI: falla si algún endpoint indexa roles[N] en vez de usar hasRole()
npm run typecheck    # chequeo de tipos (TS en api/)
npm test             # unit/integration tests (Vitest)
npm run test:e2e     # tests end-to-end (Playwright)
```
