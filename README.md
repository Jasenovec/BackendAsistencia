# BackendAsistencia — API REST (Asistencias escolares)

API REST para gestionar asistencias por **grado / sección / fecha**, pensada para ser consumida desde:
- **Frontend web (Angular)**
- **App móvil (Flutter)**

El objetivo del backend es exponer endpoints claros para:
- Catálogos (grados, secciones)
- Alumnos por aula (grado/sección)
- Registro y mantenimiento de asistencias (CRUD)
- Consultas e historial
- Reporte mensual

---

## Base URL

Por defecto (local):

- `http://localhost:<PUERTO>`

> Nota: si en tu `index.js` montas un prefijo tipo `/api`, tu base real sería:
`http://localhost:<PUERTO>/api`

---

## Puesta en marcha (local)

1) Instalar dependencias
```bash
npm install
