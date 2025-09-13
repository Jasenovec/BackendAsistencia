const express = require('express');
const router = express.Router();
const pool = require('../database');
const auth = require('../middlewares/auth');
const roleGrades = require('../middlewares/roleGrades');

router.use(auth);
router.use(roleGrades);

const ANIO_LECTIVO = Number(process.env.ANIO_LECTIVO) || 2025;
const NIVEL_CODIGO = process.env.NIVEL_CODIGO || 'secundaria';

/**
 * GET /asistencias-mes?mes=9&anio=2025
 */
router.get('/', async (req, res) => {
    try {
        const mes = parseInt(req.query.mes, 10);
        const anio = parseInt(req.query.anio, 10);

        if (!Number.isInteger(mes) || !Number.isInteger(anio)) {
            return res.status(400).json({ error: 'Parámetros mes y anio son obligatorios' });
        }

        // Si tu MySQL ya está en tu TZ, esto está bien
        const fechaExpr = "DATE_FORMAT(a.fecha, '%Y-%m-%d')";

        let sql = `
            SELECT 
                e.id_estudiante,
                p.apellido_paterno,
                p.apellido_materno,
                p.nombres,
                ge.nro_grado AS nro_grado,
                s.seccion     AS seccion,
                ${fechaExpr}  AS fecha,
                a.estado_asistencia
            FROM estudiante e
            INNER JOIN persona p         ON e.id_persona    = p.id_persona
            INNER JOIN grado_estudiante ge ON ge.id_estudiante = e.id_estudiante
            INNER JOIN seccion s         ON s.id_seccion    = ge.id_seccion
            INNER JOIN nivel n           ON n.id_nivel      = ge.id_nivel
            INNER JOIN anio_lectivo al   ON al.id_anio_lectivo = ge.id_anio_lectivo
            LEFT JOIN asistencia a
                ON a.id_estudiante = e.id_estudiante
            AND MONTH(a.fecha) = ?
            AND YEAR(a.fecha)  = ?
            WHERE n.codigo_nivel = ?
                AND al.nro_anio = ?
            `;

        // orden de params debe coincidir con la query:
        const params = [mes, anio, NIVEL_CODIGO, ANIO_LECTIVO];

        if (!req.user.isAdmin) {
            const grades = Array.isArray(req.user.allowedGrades) ? req.user.allowedGrades : [];
            const sections = Array.isArray(req.user.allowedSections) ? req.user.allowedSections : [];

            if (!grades.length) return res.json([]);

            sql += ` AND ge.nro_grado IN (${grades.map(() => '?').join(',')}) `;
            params.push(...grades);

            if (sections.length) {
                sql += ` AND ge.id_seccion IN (${sections.map(() => '?').join(',')}) `;
                params.push(...sections);
            }
        }

        sql += `
            ORDER BY ge.nro_grado,
                    s.seccion,
                    p.apellido_paterno,
                    p.apellido_materno,
                    p.nombres,
                    a.fecha
            `;

        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error('Error consultando asistencias del mes:', err);
        res.status(500).json({ error: 'Error en servidor' });
    }
});


module.exports = router;
