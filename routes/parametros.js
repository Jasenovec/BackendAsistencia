const express = require('express');
const router = express.Router();
const pool = require('../database');
const auth = require('../middlewares/auth');
const roleGrades = require('../middlewares/roleGrades');

// ✅ Autenticación + cálculo de allowedGrades/allowedSections
router.use(auth);
router.use(roleGrades);

// Año lectivo (ENV o default 2025)
const ANIO_LECTIVO = Number(process.env.ANIO_LECTIVO) || 2025;
const NIVEL_CODIGO = process.env.NIVEL_CODIGO || 'secundaria'; // ✅

/**
 * ⚙️ PARÁMETROS ENDPOINTS (POSTMAN)
 *
 * # Obtener grados disponibles (según rol)
 * GET http://localhost:3000/parametros/grados
 * Headers:
 *   Authorization: Bearer <TOKEN_JWT>
 *
 * - Admin => todos los grados
 * - Auxiliar mañana => solo 4 y 5
 * - Auxiliar tarde => solo 1, 2, 3
 *
 * # Obtener secciones disponibles (según rol)
 * GET http://localhost:3000/parametros/secciones
 * Headers:
 *   Authorization: Bearer <TOKEN_JWT>
 *
 * - Admin => todas las secciones en uso
 * - Auxiliares => solo secciones asociadas a sus grados
 */


/**
 * GET /parametros/grados
 * Devuelve los grados visibles para el usuario.
 * - Admin => todos los grados existentes en grado_estudiante (nivel=3, año ANIO_LECTIVO)
 * - Auxiliar => solo los de req.user.allowedGrades
 */
router.get('/grados', async (req, res) => {
  try {
    let sql = `
      SELECT DISTINCT g.NRO_GRADO
      FROM grado_estudiante g
      JOIN nivel n        ON n.ID_NIVEL = g.ID_NIVEL
      JOIN anio_lectivo a ON a.ID_ANIO_LECTIVO = g.ID_ANIO_LECTIVO
      WHERE n.CODIGO_NIVEL = ? AND a.NRO_ANIO = ?
    `;
    const params = [NIVEL_CODIGO, ANIO_LECTIVO];

    if (!req.user.isAdmin) {
      const grades = req.user.allowedGrades || [];
      if (!grades.length) return res.json([]);
      sql += ` AND g.NRO_GRADO IN (${grades.map(() => '?').join(',')})`;
      params.push(...grades);
    }

    sql += ' ORDER BY g.NRO_GRADO ASC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error al obtener grados:', err);
    res.status(500).json({ error: 'Error al obtener grados' });
  }
});

/**
 * GET /parametros/secciones
 * Devuelve las secciones visibles para el usuario.
 * - Admin => todas las secciones que están en uso en el año/nivel
 * - Auxiliar => solo las de req.user.allowedSections
 *
 * Nota: Se usa la tabla seccion para mostrar nombre, y se filtra por
 *       su presencia en grado_estudiante (nivel=3, año ANIO_LECTIVO).
 */
router.get('/secciones', async (req, res) => {
  try {
    let sql = `
      SELECT DISTINCT s.ID_SECCION, s.SECCION
      FROM seccion s
      JOIN grado_estudiante g ON g.ID_SECCION = s.ID_SECCION
      JOIN nivel n            ON n.ID_NIVEL = g.ID_NIVEL
      JOIN anio_lectivo a     ON a.ID_ANIO_LECTIVO = g.ID_ANIO_LECTIVO
      WHERE n.CODIGO_NIVEL = ? AND a.NRO_ANIO = ?
    `;
    const params = [NIVEL_CODIGO, ANIO_LECTIVO];

    if (!req.user.isAdmin) {
      const sections = req.user.allowedSections || [];
      if (!sections.length) return res.json([]);
      sql += ` AND s.ID_SECCION IN (${sections.map(() => '?').join(',')})`;
      params.push(...sections);
    }

    sql += ' ORDER BY s.SECCION ASC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error al obtener secciones:', err);
    res.status(500).json({ error: 'Error al obtener secciones' });
  }
});

module.exports = router;
