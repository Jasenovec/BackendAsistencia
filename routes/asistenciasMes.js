const express = require('express');
const router = express.Router();
const db = require('../database');

// Obtener asistencias del mes y año especificados
router.get('/asistencias-mes', (req, res) => {
    const { mes, anio } = req.query;

    const query = `
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
        ORDER BY ge.nro_grado, s.seccion, p.apellido_paterno, p.apellido_materno;
  `;

    db.query(query, [mes, anio], (err, results) => {
        if (err) {
            console.error('Error consultando asistencias:', err);
            res.status(500).json({ error: 'Error en servidor' });
        } else {
            res.json(results);
        }
    });
});

module.exports = router;
