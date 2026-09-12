# 👨‍💼 ROADMAP - ADMINISTRADOR

## Estado real

El administrador ya tiene un panel base implementado y el backend tiene endpoints completos para usuarios y reportes. La tarea principal es conectar la UI a los datos reales y terminar las vistas de gestión y auditoría.

## ✅ Implementado

### 1️⃣ Dashboard consolidado
- Vista general del sistema
- Resumen de bloques, alumnos y contenido
- Navegación por tabs
- Layout base del panel administrativo

### 2️⃣ Backend del admin
- CRUD de usuarios
- Reportes globales
- Dashboard con métricas del sistema
- Auditoría de acciones y validación de roles

### 3️⃣ Estructura de acceso
- Rol administrador reconocido en rutas y guards
- Redirección a panel de administración
- Soporte para roles combinados (admin + profesor)

---

## ⏳ Pendiente

### 1️⃣ Integración real con la API
- Conectar listado de usuarios a endpoints reales
- Mostrar reportes y métricas reales
- Ajustar fallbacks para errores y estados vacíos

### 2️⃣ Gestión operativa
- CRUD completo de usuarios desde UI
- Filtros por rol, fecha y estado
- Vistas de auditoría y logs

### 3️⃣ Reporting
- Gráficos y KPI visuales
- Exportación de reportes
- Tabla de asistencias y progreso globales

---

## 📊 Estado general

```text
Frontend UI:        ██████████ 100%
Backend APIs:       ██████████ 100%
Integración real:    ███████░░░ 60%
Reportes avanzados: ██████░░░░ 40%
```

## 🔗 Archivos relevantes

- [src/components/dashboard/admin/DashboardAdmin.jsx](../src/components/dashboard/admin/DashboardAdmin.jsx)
- [api/admin](../api/admin)
- [api/_lib/auth.ts](../api/_lib/auth.ts)

## 📝 Próximos objetivos

- Conectar el dashboard administrativo a la API real
- Validar usuarios, roles y reportes con base de datos concreta
- Completar auditoría y filtros de administración

La prioridad siguiente no es desarrollar un dashboard nuevo, sino dejar funcionando el panel actual con datos reales y control operativo.

