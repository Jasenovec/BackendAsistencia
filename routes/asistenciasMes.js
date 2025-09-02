const express = require('express');
const router = express.Router();
const pool = require('../database');
const auth = require('../middlewares/auth');
const roleGrades = require('../middlewares/roleGrades');

// Autenticación y permisos
router.use(auth);
router.use(roleGrades);

/**
 * 📅 ASISTENCIAS MENSUALES ENDPOINT (POSTMAN)
 *
 * # Obtener asistencias del mes y año
 * GET http://localhost:3000/asistencias-mes?mes=9&anio=2025
 * Headers:
 *   Authorization: Bearer <TOKEN_JWT>
 *
 * - Admin => ve todos los grados/secciones
 * - Auxiliar mañana => solo grados 4 y 5
 * - Auxiliar tarde => solo grados 1, 2 y 3
 */


/**
 * GET /
 * Query: ?mes=&anio=
 * Usa tu consulta original, y añade filtros por grado/sección del usuario (si no es admin).
 */
router.get('/', async (req, res) => {
    try {
        const { mes, anio } = req.query;

        if (!mes || !anio) {
            return res.status(400).json({ error: 'Parámetros mes y anio son obligatorios' });
        }

        // Consulta base intacta
        let sql = `
      SELECT 
        e.id_estudiante, 
        p.apellido_paterno, 
        p.apellido_materno, 
        p.nombres, 
        ge.nro_grado, 
        s.seccion,
        a.fecha, 
        a.estado_asistencia
      FROM estudiante e
      INNER JOIN persona p ON e.id_persona = p.id_persona
      INNER JOIN grado_estudiante ge ON ge.id_estudiante = e.id_estudiante
      INNER JOIN seccion s ON s.id_seccion = ge.id_seccion
      LEFT JOIN asistencia a 
        ON a.id_estudiante = e.id_estudiante
       AND MONTH(a.fecha) = ? AND YEAR(a.fecha) = ?
      WHERE 1=1
    `;

        const params = [mes, anio];

        // Filtros por rol (si no admin)
        if (!req.user.isAdmin) {
            const grades = req.user.allowedGrades || [];
            const sections = req.user.allowedSections || [];

            if (!grades.length) {
                return res.json([]); // sin acceso a ningún grado
            }

            sql += ` AND ge.nro_grado IN (${grades.map(() => '?').join(',')}) `;
            params.push(...grades);

            // Si tienes allowedSections calculadas, filtramos también
            if (sections.length) {
                sql += ` AND ge.id_seccion IN (${sections.map(() => '?').join(',')}) `;
                params.push(...sections);
            }
        }

        sql += `
      ORDER BY ge.nro_grado, s.seccion, p.apellido_paterno, p.apellido_materno
    `;

        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error('Error consultando asistencias del mes:', err);
        res.status(500).json({ error: 'Error en servidor' });
    }
});

module.exports = router;

// Nota: Este endpoint asume que los roles y sus permisos están definidos en el middleware roleGrades.js
// y que el middleware authMiddleware.js agrega el usuario a req.user