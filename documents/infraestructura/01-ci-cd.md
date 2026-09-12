# CI/CD — GitHub Actions + Vercel

> **Estado actual (MVP):** los workflows de este documento están desactivados a propósito
> para no consumir los minutos gratis de GitHub Actions mientras el proyecto todavía no
> tiene una versión estable. Mientras tanto, migraciones y deploy a testing se hacen
> manualmente (ver abajo). El único proyecto Supabase existente (`Target Catriel`, ref
> `dfwiqdmnzjxcytkraknk`) se usa como ambiente de testing; cuando haya algo productivo se
> crea una instancia separada para producción, tal como indica la sección de secrets por
> ambiente más abajo.

## Objetivo
Antes de este pipeline, el proyecto solo corría en local. El objetivo es poder llevar un
cambio a un ambiente de testing persistente, verificarlo ahí, y recién después promoverlo
a producción, con checks automáticos gateando cada paso.

## Modelo de branches

```
feature branch → PR → ci.yml gatea el merge
  → merge a staging → deploy-staging.yml despliega solo al ambiente de testing
  → verificación manual en staging
  → PR/merge staging → main → deploy-production.yml espera aprobación manual
    en el Environment "production" → aprobar → despliega a producción
```

`staging` es una branch persistente (no previews efímeras por PR) mapeada a una URL
estable de Vercel. `main` sigue siendo producción.

## Workflows

- **`.github/workflows/ci.yml`** — corre en cada push (excepto a `staging`/`main`, que
  usan sus propios workflows) y en cada PR. Jobs: `npm ci`, lint, `tsc --noEmit`
  (typecheck de `api/`/`scripts/`/`prisma/`, que es lo único tipado hoy — `src/` es JSX
  plano), `vitest run`, `vite build`. No necesita una base Postgres real: los tests
  actuales mockean el cliente de Prisma.
- **`.github/workflows/deploy-staging.yml`** — trigger: push a `staging`. Reusa `ci.yml`
  como job previo (`workflow_call`); si pasa, aplica `prisma migrate deploy` contra la
  base de staging y despliega a Vercel (ambiente preview) con la Vercel CLI.
- **`.github/workflows/deploy-production.yml`** — mismo shape, trigger: push a `main`.
  Usa el GitHub Environment `production`, que debe tener un reviewer requerido — ese
  approval manual es el gate real de promoción a producción. Despliega con `vercel
  deploy --prod`.

Las migraciones corren explícitas en el propio workflow (no dentro del build de Vercel)
para que queden en el log de GitHub Actions, auditable y separado del paso de deploy.

## Secrets por ambiente

Se cargan como secrets de los GitHub Environments `staging` y `production` (no como
secrets globales del repo, para que cada ambiente solo pueda ver los suyos):

| Secret               | Para qué sirve                                              |
|----------------------|---------------------------------------------------------------|
| `VERCEL_TOKEN`       | Autenticar la Vercel CLI en el workflow                      |
| `VERCEL_ORG_ID`      | Identificar la organización/cuenta de Vercel                 |
| `VERCEL_PROJECT_ID`  | Identificar el proyecto de Vercel a desplegar                |
| `DATABASE_URL`       | Conexión pooled a Postgres (migración + runtime de la app)   |
| `DIRECT_URL`         | Conexión directa a Postgres (requerida por Prisma Migrate)   |

Cada ambiente tiene su propia base de datos — staging y producción nunca comparten
Postgres.

## Checklist manual de configuración (una sola vez)

Estos pasos requieren crear cuentas, generar tokens y cargar secrets en interfaces de
terceros — no son algo que un agente pueda hacer por vos, hacelos en este orden:

1. Crear/loguearse en [Vercel](https://vercel.com) e importar el repo
   `BudnikMilton93/TargetCatriel-react-web` como proyecto nuevo.
2. En el proyecto de Vercel → Settings → Git, **desactivar** el auto-deploy de Git. El
   único disparador de deploys va a ser GitHub Actions (si se deja activo, cada push
   dispararía un deploy duplicado).
3. Correr `vercel link` en local (o revisar `.vercel/project.json` después de linkear)
   para obtener `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`.
4. Generar un token en Vercel → Settings → Tokens (`VERCEL_TOKEN`).
5. Provisionar dos bases Postgres — una para staging, otra para producción (Supabase es
   la opción que ya anticipa `ARQUITECTURA.md`, pero cualquier proveedor con pooler +
   conexión directa sirve). Guardar el `DATABASE_URL` (pooled) y `DIRECT_URL` (directa)
   de cada una.
6. En GitHub → Settings → Environments, crear `staging` y `production`. En
   `production`, agregar un reviewer requerido — es el gate de promoción.
7. Cargar los 5 secrets de la tabla de arriba en cada Environment (los de Vercel pueden
   repetirse entre ambos si es el mismo proyecto; los de base de datos son distintos
   por ambiente).
8. En Vercel → Settings → Environment Variables, cargar `DATABASE_URL` y `DIRECT_URL`
   para Preview (staging) y Production respectivamente — la app también los necesita en
   runtime, no solo el paso de migración del workflow.
9. En Vercel → Domains, asignar el dominio de branch de `staging` (o un subdominio
   propio, si hay uno disponible) para que la URL de testing sea estable.
10. (Recomendado) En GitHub → Settings → Branches, agregar branch protection en `main`
    exigiendo que el check `CI` pase antes de mergear.
11. Probar el flujo completo: push trivial a `staging` → confirmar que
    `deploy-staging.yml` despliega solo → mergear `staging` a `main` → aprobar el gate
    de producción en el Environment.

## Migración y deploy manual a testing (mientras los workflows están desactivados)

1. Copiar `.env.testing.example` a `.env.testing` y completar `DATABASE_URL`/`DIRECT_URL`
   con los valores reales del proyecto Supabase (Dashboard > Project Settings > Database
   > Connect). `.env.testing` está gitignoreado — nunca commitear las credenciales.
2. Aplicar las migraciones pendientes contra testing:
   ```bash
   set -a && source .env.testing && set +a && npx prisma migrate deploy
   ```
3. Desplegar el frontend/API a Vercel (proyecto `targetcatriel-react-web`, linkeado en
   `.vercel/project.json`):
   ```bash
   npx vercel env pull .env.vercel.testing --environment=preview   # primera vez / si cambian las env vars
   npx vercel build
   npx vercel deploy --prebuilt
   ```
   Esto genera un deploy tipo *preview* (no `--prod`), que es lo que corresponde a
   testing. Las env vars `DATABASE_URL`/`DIRECT_URL` de testing también hay que cargarlas
   en Vercel (Project Settings > Environment Variables > Preview) para que la app las
   tenga en runtime, no solo el paso de migración.

> Nota: al linkear el proyecto, la Vercel CLI conectó automáticamente el repo de GitHub.
> Eso significa que Vercel puede estar generando sus propios preview deploys en cada push
> además de los manuales de acá — revisar Project Settings > Git en Vercel y desactivar
> el auto-deploy si se quiere que el único disparador sea este flujo manual.
