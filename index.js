require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

// Configuración del puerto (usa el de .env si existe)
const PORT = process.env.PORT || 3000;

// Middleware globales
const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Rutas
const estudianteRoutes = require("./routes/estudiante");
const asistenciaRoutes = require("./routes/asistencia");
const parametrosRoutes = require("./routes/parametros");
const asistenciasMesRoutes = require("./routes/asistenciasMes");
const authRoutes = require("./routes/auth");
const incidenciaRoutes = require("./routes/incidencias");

// Usamos las rutas  de alumnos
app.use('/estudiante', estudianteRoutes);
app.use('/asistencia', asistenciaRoutes);
app.use('/parametros', parametrosRoutes);
app.use('/asistencias-mes', asistenciasMesRoutes);
app.use('/auth', authRoutes);
app.use('/incidencias', incidenciaRoutes);

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("✅ API de asistencia funcionando");
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
