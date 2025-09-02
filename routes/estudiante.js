const express = require('express');
const router = express.Router();
const db = require('../database');
const auth = require('../middlewares/auth');
const roleGrades = require('../middlewares/roleGrades');

// ✅ Aplico autenticación a todo el router
router.use(auth);

/**
 * 🧑‍🎓 ESTUDIANTES ENDPOINTS (POSTMAN)
 *
 * # Obtener estudiantes de un grado y sección
 * GET http://localhost:3000/estudiante/4/1
 * Headers:
 *   Authorization: Bearer <TOKEN_JWT>
 *
 * Params:
 *   grado   = número de grado (ej. 4)
 *   seccion = ID_SECCION (ej. 1)
 *
 * ⚠️ Importante: Se usa ID_SECCION, no el nombre "A", "B", etc.
 */


// Ruta para obtener todos los alumnos de un grado/sección
router.get("/:grado/:seccion", roleGrades, async (req, res) => {
    try {
        const { grado, seccion } = req.params;
        const anioLectivo = 2025;

        console.log("👉 Ejecutando query con:", [grado, seccion, anioLectivo]);

        const sql = `
      SELECT 
          e.ID_ESTUDIANTE, 
          p.NOMBRES, 
          p.APELLIDO_PATERNO, 
          p.APELLIDO_MATERNO, 
          s.SECCION, 
          g.NRO_GRADO
      FROM grado_estudiante g
      JOIN estudiante e ON g.ID_ESTUDIANTE = e.ID_ESTUDIANTE
      JOIN persona p ON e.ID_PERSONA = p.ID_PERSONA
      JOIN seccion s ON g.ID_SECCION = s.ID_SECCION
      JOIN anio_lectivo a ON g.ID_ANIO_LECTIVO = a.ID_ANIO_LECTIVO
      WHERE 
          g.ID_NIVEL = 3 
          AND g.NRO_GRADO = ? 
          AND g.ID_SECCION = ? 
          AND a.NRO_ANIO = ?
      ORDER BY p.APELLIDO_PATERNO, p.APELLIDO_MATERNO, p.NOMBRES
    `;

        // 👇 aquí va con await porque es promise
        const [results] = await db.query(sql, [grado, seccion, anioLectivo]);

        console.log("✅ Query ejecutada, resultados:", results.length);

        res.json(results);
    } catch (err) {
        console.error("❌ Error al obtener los estudiantes:", err);
        res.status(500).json({ error: "Error al obtener los estudiantes" });
    }
});


module.exports = router;
