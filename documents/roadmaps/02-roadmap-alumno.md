# 👨‍🎓 ROADMAP - ALUMNO

## Estado real

El alumno ya cuenta con un dashboard funcional y una experiencia de aprendizaje con módulos, respuestas y asistencias. La parte principal del flujo está desarrollada; la prioridad inmediata es revisar los casos reales de consumo con la API y cerrar la integración final.

## ✅ Implementado

### 1️⃣ Dashboard y navegación
- Vista general del alumno
- Listado de bloques
- Selección de bloque activo
- Resumen de progreso general
- Porcentaje de asistencia

### 2️⃣ Módulos y contenidos
- Carga de módulos por bloque
- Visualización de contenidos por tipo
- Selector de bloque para cambiar de curso
- Estado de carga y errores

### 3️⃣ Respuestas
- Crear respuesta a contenido
- Editar respuesta existente
- Eliminar respuesta
- Visibilidad privada/compartida
- Ver respuestas compartidas del bloque

### 4️⃣ Asistencias
- Consulta de asistencias del alumno
- Cálculo de porcentaje general
- Visualización por bloque actual

### 5️⃣ UX del flujo
- Drafts locales para cada contenido
- Confirmación antes de sobrescribir respuesta
- Manejo de loading y errores visibles

---

## ⏳ Pendiente

- Completar integración real de paneles con endpoints backend en producción local
- Revisar flujo de navegación por módulos y contenidos en detalle
- Verificar comportamiento real con múltiples bloques y respuestas
- Mejorar perfil alumno, tutores y ayuda contextual
- Completar notificaciones o estadísticas avanzadas

---

## 📊 Estado general

```text
Frontend UI:        ██████████ 100%
Backend APIs:       ██████████ 100%
Integración real:    ████████░░ 75%
Experiencia alumno: ██████████ 90%
```

## 🔗 Archivos relevantes

- [src/components/dashboard/alumno/DashboardAlumno.jsx](../src/components/dashboard/alumno/DashboardAlumno.jsx)
- [src/services/api.js](../src/services/api.js)
- [api/alumno](../api/alumno)

## 📝 Próximos objetivos

- Validar el flujo completo alumnos → bloque → módulo → respuesta
- Completar envío real de respuestas y visibilidad
- Revisar asistencia y estadísticas con datos persistidos
- Mejorar navegación y perfil del alumno

## Fase futura

La evolución recomendada es crear actividades enriquecidas con preguntas estructuradas y recursos multimedia, pero no es la próxima prioridad inmediata. Primero debe quedar validado el alumno actual en su recorrido real de aprendizaje.

