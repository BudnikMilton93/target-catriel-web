# 📚 ÍNDICE DE ROADMAPS POR ROL

Este proyecto ya no está en estado "roadmap futuro": la base funcional está implementada y se encuentra en la fase de integración y pulido.

## Estado real del proyecto

| Componente | Estado | Observación |
|---|---|---|
| Frontend público | ✅ | Páginas Home, Clases, Viajes, Sobre Nosotros, Contacto y Login ya existentes |
| Autenticación mock | ✅ | Roles y dashboard selection funcionando con localStorage |
| Dashboards por rol | ✅ | Profesor, alumno, admin y marketing ya están creados |
| Base de datos | ✅ | PostgreSQL en Docker + Prisma + migración inicial |
| APIs backend | ✅ | CRUDs principales implementados para marketing, profesor, alumno y admin |
| Integración real frontend ↔ API | ⏳ | Parcial; varios paneles tienen UI, pero aún se está conectando a endpoints reales |
| Pruebas E2E | ⏳ | Requieren revisión de flujos reales sobre la base de datos |
| Autenticación backend real / seguridad | 🟡 | Auditoría 2026-08-20: deuda esperable en esta etapa 100% local (auth backend sin verificar password, IDOR, contraseñas sin hashear). No bloquea el trabajo local actual. Ver [PLAN_REMEDIACION.md](./PLAN_REMEDIACION.md) — resolver antes de conectar staging/producción |

---

## ⚠️ Deuda técnica y seguridad

Además de los roadmaps de feature por rol, el [PLAN_REMEDIACION.md](./PLAN_REMEDIACION.md) documenta hallazgos de una auditoría de código y seguridad (2026-08-20) traducidos a tareas priorizadas: autenticación backend rota, contraseñas sin hashear, un IDOR en respuestas de alumnos, falta de índices en Prisma, panel de Marketing desconectado de la API real, y ausencia de tests. El proyecto se trabaja hoy 100% en local sin ningún deploy productivo, así que nada de esto es urgente para el desarrollo del día a día — la Fase 0 de ese documento debe resolverse antes de conectar cualquier entorno real (staging incluido), no antes de seguir trabajando localmente.

---

## 🎯 Roadmaps por rol

### 👨‍💼 [ROADMAP ADMINISTRADOR](./ROADMAP_ADMINISTRADOR.md)
**Gestión de sistema y reportes**

Estado actual: UI de dashboard creada y backend listo. La prioridad es conectar la vista a endpoints reales y completar reportes/auditoría.

### 👨‍🏫 [ROADMAP PROFESOR](./ROADMAP_PROFESOR.md)
**Gestión académica y contenido del curso**

Estado actual: CRUD de bloques, módulos y contenidos integrado y funcional en la mayor parte del flujo. Faltan detalle de alumnos, asistencia y reportes avanzados.

### 👨‍🎓 [ROADMAP ALUMNO](./ROADMAP_ALUMNO.md)
**Aprendizaje y seguimiento del estudiante**

Estado actual: dashboard implementado, bloque y módulo interactivos y flujo de respuestas disponible. El objetivo ahora es cerrar la integración real de navegación y respuestas con la API.

### 📱 [ROADMAP MARKETING](./ROADMAP_MARKETING.md)
**Contenido público**

Estado actual: dashboard y componentes administrativos existen, pero requieren conexión con endpoints reales y revisión de contenido editorial.

---

## 🔄 Fase actual

La fase actual es una mezcla entre:

1. Finalización de integración frontend ↔ endpoints reales
2. Validación de flujos por rol
3. Pulido UX y manejo de errores
4. Preparación para actividades enriquecidas futuras

### Prioridades inmediatas

- Conectar dashboards con endpoints reales
- Probar CRUD de profesor y alumno con datos reales
- Revisar autenticación real vs mock
- Validar errores de negocio y respuestas del backend
- Completar reportes y administración para admin

---

## 📁 Estructura relevante

```bash
├── README.md
├── api/
│   ├── _lib/
│   ├── admin/
│   ├── alumno/
│   ├── marketing/
│   └── profesor/
├── documents/
├── prisma/
├── public/
├── src/
│   ├── components/
│   ├── context/
│   ├── pages/
│   ├── services/
│   └── styles/
└── docker-compose.yml
```

---

## 📚 Recursos útiles

- [README.md](../README.md)
- [api/README.md](../api/README.md)
- [prisma/schema.prisma](../prisma/schema.prisma)
- [src/context/AuthContext.jsx](../src/context/AuthContext.jsx)
- [src/services/api.js](../src/services/api.js)

---

## ✅ Conclusión

El proyecto ya tiene la mayor parte de la base funcional construida: UX, roles, dashboard, backend y datos. Lo que sigue no es “empezar desde cero”, sino cerrar la integración y pulir los flujos pendientes para dejarlo listo para uso real y pruebas completas.

- **APIs**: Consulta `/api/README.md`
- **Schema de BD**: Consulta `prisma/schema.prisma`
- **Componentes Frontend**: Consulta `src/components/`
- **Tipos TypeScript**: Consulta `api/_lib/types.ts`

---

*Última actualización: 2026-08-05*
*Proyecto: TARGET CATRIEL - Fullstack React + Node.js + PostgreSQL*
