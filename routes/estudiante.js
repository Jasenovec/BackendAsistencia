
const express = require('express');
const router = express.Router();
const db = require('../database');

// Ruta para obtener todos los alumnos
router.get("/:grado/:seccion", (req, res) => {
    const { grado, seccion } = req.params;
    const anioLectivo = 2025;
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

    db.query(sql, [grado, seccion, anioLectivo], (err, results) => {
        if (err) {
            console.error('❌ Error al obtener los estudiantes:', err);
            return res.status(500).json({ error: 'Error al obtener los estudiantes' });
        } else {
            res.json(results);

        }
    });
});

module.exports = router;

