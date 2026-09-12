# 📱 ROADMAP - MARKETING

## Estado real

El marketing ya tiene el dashboard principal y los componentes administrativos básicos creados. El backend para contenido público también está completo. Ahora el trabajo pendiente está en la integración real de los paneles con las APIs y la validación editorial del contenido.

## ✅ Implementado

### 1️⃣ Dashboard de contenido
- Vista general del portal de marketing
- Resumen de noticias, viajes, galería y sobre nosotros
- Tabs para cada bloque de contenido
- Restauración de datos demo y edición desde el panel

### 2️⃣ Componentes del módulo marketing
- `GaleriaAdmin.jsx`
- `NoticiasAdmin.jsx`
- `ViajesAdmin.jsx`
- `SobreNosotrosAdmin.jsx`

### 3️⃣ APIs de contenido
- CRUD de noticias
- CRUD de viajes
- CRUD de galería
- CRUD de sobre nosotros
- Validación de roles y autoría

### 4️⃣ Base editorial del proyecto
- Contenido público pensado para home, viajes e institucional
- Modelo de datos orientado a contenido público y marketing

---

## ⏳ Pendiente

- Conectar los formularios de marketing con endpoints reales
- Validar creación/edición/eliminación con la base de datos real
- Revisar manejo de imágenes y multimedia en galería
- Completar panel de estados editoriales y filtros avanzados

---

## 📊 Estado general

```text
Frontend UI:        ██████████ 100%
Backend APIs:       ██████████ 100%
Integración real:    ███████░░░ 60%
Content ops:        ███████░░░ 65%
```

## 🔗 Archivos relevantes

- [src/components/dashboard/marketing/DashboardMarketing.jsx](../src/components/dashboard/marketing/DashboardMarketing.jsx)
- [src/components/admin](../src/components/admin)
- [api/marketing](../api/marketing)

## 📝 Próximos objetivos

- Conectar dashboard marketing a API real
- Validar CRUD de noticias, viajes y galería con persistencia real
- Revisar flujo de contenido público y disponibilidad de recursos
- Definir estrategia de medios y recursos multimedia en detalle

## Fase futura

La evolución recomendada es seguir con campañas editoriales y recursos multimedia, pero sin perder foco: primero debe quedar validado el flujo real de contenidos para la web pública.

