# 👨‍🏫 ROADMAP - PROFESOR

## Estado real

El rol de profesor ya tiene un panel funcional con flujo principal de creación y gestión académica. La parte principal de bloques, módulos y contenidos quedó implementada; lo que sigue es cerrar la capa de alumnos, asistencia y reportes avanzados.

## ✅ Implementado

### 1️⃣ Gestión de bloques
- Listar bloques del profesor
- Crear bloque
- Editar bloque
- Eliminar bloque con validaciones de integridad
- Definir nivel, días y horarios
- Dashboard con resumen general de bloques

### 2️⃣ Gestión de módulos
- Listar módulos por bloque
- Crear módulo
- Editar módulo
- Habilitar/deshabilitar módulo con validación
- Eliminar módulo cuando no hay respuestas vinculadas

### 3️⃣ Gestión de contenidos
- Agregar contenido por tipo: texto, actividad, pregunta, audio
- Editar contenido
- Eliminar contenido con regla de bloqueo si ya tiene respuestas
- Ordenamiento manual por campo `orden`

### 4️⃣ Integridad académica
- Bloqueo de edición/eliminación si el contenido ya fue respondido
- Bloqueo de eliminación de módulo con respuestas
- Bloqueo de eliminación de bloque si tiene historial
- Validación en backend al habilitar módulo sin actividades

### 5️⃣ Dashboard
- Vista general de bloques
- Resumen de alumnos
- Vista de contenido por módulo
- Estado de carga y errores visibles

---

## ⏳ Pendiente

### 1️⃣ Alumnos y seguimiento
- Listar alumnos inscritos en bloque en la UI
- Invitar/remover alumnos desde la interfaz
- Mostrar perfiles o contacto del tutor
- Ver asistencias por bloque
- Ver respuestas de alumnos con filtros

### 2️⃣ Reportes
- Estadísticas de participación
- progreso individual por alumno
- panel de últimas respuestas
- métricas de asistencia y rendimiento

### 3️⃣ Mejora de contenido
- Reordenamiento drag & drop
- vista previa completa del módulo
- soporte de archivos adjuntos/links más ricos

---

## 📊 Estado general

```text
Frontend UI:        ██████████ 100%
Backend APIs:       ██████████ 100%
Integración real:    ████████░░ 75%
Fase de pulido:     ███████░░░ 60%
```

## 🔗 Archivos relevantes

- [src/components/dashboard/profesor/DashboardProfesor.jsx](../src/components/dashboard/profesor/DashboardProfesor.jsx)
- [src/components/profesor/BloqueModal.jsx](../src/components/profesor/BloqueModal.jsx)
- [src/hooks/useProfessor.js](../src/hooks/useProfessor.js)
- [api/profesor](../api/profesor)

## 📝 Próximos objetivos

- Completar tab de alumnos dentro del bloque
- Conectar asistencias y respuestas reales al dashboard
- Consolidar métricas de participación por módulo
- Probar escenarios límite con contenidos ya respondidos

## Fase futura

Se recomienda continuar con actividades enriquecidas, pero no como prioridad inmediata. Primero se debe cerrar el flujo académico actual y dejar validado el recorrido profesor → bloque → contenido → alumno.


- **API Documentation**: `/api/README.md`
- **Frontend Code**: `src/components/dashboard/profesor/`
- **Backend Code**: `api/profesor/`
- **Tipos TypeScript**: `api/_lib/types.ts`
