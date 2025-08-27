const express = require("express");
const router = express.Router();
const db = require("../database");
const auth = require("../middlewares/auth");
const roleGrades = require("../middlewares/roleGrades");

// Reporte mensual de asistencias
router.get("/", auth, roleGrades, (req, res) => {
  const { mes, anio } = req.query;
  const { rol } = req.user;

  if (!mes || !anio) {
    return res.status(400).json({ error: "Faltan parámetros mes y año" });
  }

  // Permisos definidos según rol
  const permisos = {
    administrador: [], // sin restricción
    auxiliar_mañana: [4, 5],
    auxiliar_tarde: [1, 2, 3],
  };

  const gradosPermitidos = permisos[rol] || [];

  // SQL base
  let sql = `
    SELECT 
      g.NRO_GRADO,
      s.SECCION,
      COUNT(CASE WHEN a.ESTADO = 'asistio' THEN 1 END) AS total_asistencias,
      COUNT(CASE WHEN a.ESTADO = 'falta' THEN 1 END) AS total_faltas,
      COUNT(CASE WHEN a.ESTADO = 'tardanza' THEN 1 END) AS total_tardanzas
    FROM asistencia a
    JOIN estudiante e ON a.ID_ESTUDIANTE = e.ID_ESTUDIANTE
    JOIN persona p ON e.ID_PERSONA = p.ID_PERSONA
    JOIN grado_estudiante g ON e.ID_ESTUDIANTE = g.ID_ESTUDIANTE
    JOIN seccion s ON g.ID_SECCION = s.ID_SECCION
    JOIN anio_lectivo al ON g.ID_ANIO_LECTIVO = al.ID_ANIO_LECTIVO
    WHERE MONTH(a.FECHA) = ? AND YEAR(a.FECHA) = ?
      AND al.NRO_ANIO = ?
  `;

  const params = [mes, anio, anio];

  // Si no es admin → filtrar por grados permitidos
  if (rol !== "administrador") {
    sql += ` AND g.NRO_GRADO IN (?)`;
    params.push(gradosPermitidos);
  }

  sql += ` GROUP BY g.NRO_GRADO, s.SECCION ORDER BY g.NRO_GRADO, s.SECCION`;

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("❌ Error al obtener el reporte mensual:", err);
      return res.status(500).json({ error: "Error al obtener el reporte mensual" });
    }
    res.json(results);
  });
});

module.exports = router;
// Nota: Este endpoint asume que los roles y sus permisos están definidos en el middleware roleGrades.js
// y que el middleware authMiddleware.js agrega el usuario a req.user