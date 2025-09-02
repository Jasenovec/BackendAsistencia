require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

// Configuración del puerto (usa el de .env si existe)
const PORT = process.env.PORT || 3000;

// Middleware globales
app.use(
  cors({
    origin: "http://localhost:4200", // ⚠️ ajusta según tu frontend
    credentials: true, // por si luego manejas cookies/JWT con HttpOnly
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
const estudianteRoutes = require("./routes/estudiante");
const asistenciaRoutes = require("./routes/asistencia");
const parametrosRoutes = require("./routes/parametros");
const asistenciasMesRoutes = require("./routes/asistenciasMes");
const authRoutes = require("./routes/auth");

// Usamos las rutas  de alumnos
app.use('/estudiante', estudianteRoutes);
app.use('/asistencia', asistenciaRoutes);
app.use('/parametros', parametrosRoutes);
app.use('/asistencias-mes', asistenciasMesRoutes);
app.use('/auth', authRoutes);

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("✅ API de asistencia funcionando");
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
