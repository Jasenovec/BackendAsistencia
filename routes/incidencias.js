// routes/incidencias.js
const express = require('express');
const router = express.Router();
const pool = require('../database');
const auth = require('../middlewares/auth');
const roleGrades = require('../middlewares/roleGrades');

const ANIO_LECTIVO = Number(process.env.ANIO_LECTIVO) || 2025;
const NIVEL_CODIGO = process.env.NIVEL_CODIGO || 'secundaria';

router.use(auth);
router.use(roleGrades);

/**
 * GET /incidencias?mes=9&anio=2025&grado=1&seccion=1
 * Devuelve por alumno: A_count, FJ_fechas[], TJ_fechas[] para el mes/año y aula seleccionados (Secundaria).
 */
router.get('/', async (req, res) => {
    try {
        const mes = parseInt(req.query.mes, 10);
        const anio = parseInt(req.query.anio, 10);
        const grado = parseInt(req.query.grado, 10);
        const seccion = parseInt(req.query.seccion, 10);

        if (![mes, anio, grado, seccion].every(Number.isInteger)) {
            return res.status(400).json({ error: 'mes, anio, grado y seccion son obligatorios' });
        }

        // Permisos por rol (rápida verificación) (auth)
        if (!req.user.isAdmin) {
            const gOk = (req.user.allowedGrades || []).includes(grado);
            const sOk = !req.user.allowedSections?.length || (req.user.allowedSections || []).includes(seccion);
            if (!gOk || !sOk) {
                return res.status(403).json({ error: 'No tienes permiso para este grado o sección' });
            }
        }

        const sql = `
        SELECT
            e.ID_ESTUDIANTE,
            p.APELLIDO_PATERNO,
            p.APELLIDO_MATERNO,
            p.NOMBRES,
            g.NRO_GRADO     AS GRADO,
            s.SECCION       AS SECCION,

            /* Conteo de asistencias A en el mes */
            SUM(CASE WHEN a.ESTADO_ASISTENCIA = 'A'  THEN 1 ELSE 0 END) AS A_COUNT,

            /* Fechas justificadas de falta (FJ) en el mes */
            CAST(
            COALESCE(
                CONCAT('[', GROUP_CONCAT(
                CASE WHEN a.ESTADO_ASISTENCIA = 'FJ'
                    THEN JSON_QUOTE(DATE_FORMAT(a.FECHA,'%Y-%m-%d')) END
                ORDER BY a.FECHA SEPARATOR ','), ']'
                ),
                '[]'
            ) AS JSON
            ) AS FJ_FECHAS,

            /* Fechas justificadas de tardanza (TJ) en el mes */
            CAST(
            COALESCE(
                CONCAT('[', GROUP_CONCAT(
                CASE WHEN a.ESTADO_ASISTENCIA = 'TJ'
                    THEN JSON_QUOTE(DATE_FORMAT(a.FECHA,'%Y-%m-%d')) END
                ORDER BY a.FECHA SEPARATOR ','), ']'
                ),
                '[]'
            ) AS JSON
            ) AS TJ_FECHAS

        FROM \`estudiante\` e
        INNER JOIN \`persona\` p           ON p.ID_PERSONA        = e.ID_PERSONA
        INNER JOIN \`grado_estudiante\` g  ON g.ID_ESTUDIANTE     = e.ID_ESTUDIANTE
        INNER JOIN \`seccion\` s           ON s.ID_SECCION        = g.ID_SECCION
        INNER JOIN \`nivel\` n             ON n.ID_NIVEL          = g.ID_NIVEL
        INNER JOIN \`anio_lectivo\` al     ON al.ID_ANIO_LECTIVO  = g.ID_ANIO_LECTIVO

        /* Traemos SOLO A/FJ/TJ del mes/año; left join para no perder alumnos sin registros */
        LEFT JOIN \`asistencia\` a
            ON a.ID_ESTUDIANTE = e.ID_ESTUDIANTE
        AND MONTH(a.FECHA)  = ?
        AND YEAR(a.FECHA)   = ?
        AND a.ESTADO_ASISTENCIA IN ('A','FJ','TJ')

        WHERE n.CODIGO_NIVEL = ?
            AND al.NRO_ANIO    = ?
            AND g.NRO_GRADO    = ?
            AND s.ID_SECCION   = ?

        GROUP BY
            e.ID_ESTUDIANTE, p.APELLIDO_PATERNO, p.APELLIDO_MATERNO, p.NOMBRES,
            g.NRO_GRADO, s.SECCION

        ORDER BY
            g.NRO_GRADO ASC,
            s.SECCION   ASC,
            p.APELLIDO_PATERNO ASC, p.APELLIDO_MATERNO ASC, p.NOMBRES ASC
        `;

        const params = [mes, anio, NIVEL_CODIGO, ANIO_LECTIVO, grado, seccion];
        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error('❌ Error en /incidencias:', err);
        res.status(500).json({ error: 'Error en servidor' });
    }
});

module.exports = router;
