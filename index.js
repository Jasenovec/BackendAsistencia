
// Importar el módulo Express
const express = require('express');

// Importar el módulo CORS para permitir solicitudes desde otros orígenes
const cors = require('cors');
const app = express();

// Configuración del puerto
const PORT = 3000;

// Middleware para parsear el cuerpo de las solicitudes JSON
app.use(cors({
  origin: 'http://localhost:4200' // o '*' si quieres permitir todo temporalmente
}));
app.use(express.json());

// Importamos las rutas de alumnos
const estudianteRoutes = require('./routes/estudiante');
const asistenciaRoutes = require('./routes/asistencia');
const parametrosRoutes = require('./routes/parametros');
const asistenciasMesRoutes = require('./routes/asistenciasMes');

// Usamos las rutas  de alumnos
app.use('/estudiante', estudianteRoutes);
app.use('/asistencia', asistenciaRoutes);
app.use('/parametros', parametrosRoutes);
app.use('/api', asistenciasMesRoutes);

// Ruta de prueba para verificar que el servidor está funcionando
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
