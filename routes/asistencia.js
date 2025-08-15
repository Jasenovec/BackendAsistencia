const express = require('express');
const router = express.Router();
const db = require('../database');

// Obtener asistencias
router.get("/", (req, res) => {
    const sql = `
        SELECT
            a.ID_ASISTENCIA,
            p.APELLIDO_PATERNO,
            p.APELLIDO_MATERNO,
            p.NOMBRES,
            g.NRO_GRADO,
            s.SECCION,
            a.FECHA,
            a.ESTADO_ASISTENCIA,
            a.OBSERVACION
        FROM \`asistencia\` a
        INNER JOIN \`estudiante\` e ON a.ID_ESTUDIANTE = e.ID_ESTUDIANTE
        INNER JOIN \`persona\` p ON e.ID_PERSONA = p.ID_PERSONA
        INNER JOIN \`grado_estudiante\` g ON e.ID_ESTUDIANTE = g.ID_ESTUDIANTE
        INNER JOIN \`seccion\` s ON g.ID_SECCION = s.ID_SECCION
        ORDER BY a.FECHA DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Error al obtener asistencias:', err);
            return res.status(500).json({ error: 'Error al obtener asistencias' });
        }
        res.json(results);
    });
});

// Registrar nueva asistencia
router.post("/", (req, res) => {
    const { id_estudiante, fecha, estado_asistencia, observacion } = req.body;

    if (!id_estudiante || !fecha || !estado_asistencia) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const sql = `
        INSERT INTO \`asistencia\` (ID_ESTUDIANTE, FECHA, ESTADO_ASISTENCIA, OBSERVACION)
        VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [id_estudiante, fecha, estado_asistencia, observacion], (err, result) => {
        if (err) {
            console.error('❌ Error al registrar la asistencia:', err);
            return res.status(500).json({ error: 'Error al registrar la asistencia' });
        }
        res.status(201).json({ message: '✅ Asistencia registrada con éxito', asistenciaId: result.insertId });
    });
});

// Actualizar asistencia por ID y registrar en historial
router.put("/:id_asistencia", (req, res) => {
    const { id_asistencia } = req.params;
    const { estado_asistencia, observacion } = req.body;

    const getAsistenciaSql = `
        SELECT ID_ESTUDIANTE, ESTADO_ASISTENCIA, OBSERVACION, FECHA
        FROM \`asistencia\`
        WHERE ID_ASISTENCIA = ?
    `;

    // Obtener asistencia por ID para registrar en historial
    db.query(getAsistenciaSql, [id_asistencia], (err, results) => {
        if (err) {
            console.error('❌ Error al obtener asistencia:', err);
            return res.status(500).json({ error: 'Error al obtener asistencia' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Asistencia no encontrada' });
        }

        const asistencia = results[0];

        const insertHistorialSql = `
            INSERT INTO \`historial_asistencia\` (
                ID_ASISTENCIA,
                ID_ESTUDIANTE,
                FECHA,
                ESTADO_ANTERIOR,
                ESTADO_NUEVO,
                OBSERVACION_ANTERIOR,
                OBSERVACION_NUEVA
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        // Insertar en historial antes de actualizar
        db.query(insertHistorialSql, [
            id_asistencia,
            asistencia.ID_ESTUDIANTE,
            asistencia.FECHA,
            asistencia.ESTADO_ASISTENCIA,
            estado_asistencia,
            asistencia.OBSERVACION,
            observacion
        ], (err) => {
            if (err) {
                console.error('❌ Error al insertar en historial:', err);
                return res.status(500).json({ error: 'Error al insertar en historial' });
            }

            const updateSql = `
                UPDATE \`asistencia\`
                SET ESTADO_ASISTENCIA = ?, OBSERVACION = ?
                WHERE ID_ASISTENCIA = ?
            `;

            // Actualizar asistencia
            db.query(updateSql, [estado_asistencia, observacion, id_asistencia], (err) => {
                if (err) {
                    console.error('❌ Error al actualizar asistencia:', err);
                    return res.status(500).json({ error: 'Error al actualizar asistencia' });
                }

                res.json({ message: '✅ Asistencia actualizada y registrada en historial con éxito' });
            });
        });
    });
});

// Eliminar asistencia
router.delete("/:id_asistencia", (req, res) => {
    const { id_asistencia } = req.params;

    const sql = `
        DELETE FROM \`asistencia\`
        WHERE ID_ASISTENCIA = ?
    `;

    db.query(sql, [id_asistencia], (err) => {
        if (err) {
            console.error('❌ Error al eliminar la asistencia:', err);
            return res.status(500).json({ error: 'Error al eliminar la asistencia' });
        }
        res.json({ message: '✅ Asistencia eliminada con éxito' });
    });
});

// Obtener historial de asistencias
router.get("/historial", (req, res) => {
    const sql = `
        SELECT
            ID_HISTORIAL,
            ID_ASISTENCIA,
            FECHA,
            ESTADO_ANTERIOR,
            ESTADO_NUEVO,
            OBSERVACION_ANTERIOR,
            OBSERVACION_NUEVA,
            FECHA_MODIFICACION
        FROM \`historial_asistencia\`
        ORDER BY FECHA_MODIFICACION DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Error al obtener las asistencias:', err);
            return res.status(500).json({ error: 'Error al obtener las asistencias' });
        }
        res.json(results);
    });
});

// Obtener asistencias filtradas por grado y sección
router.get("/:grado/:seccion", (req, res) => {
    const { grado, seccion } = req.params;
    const sql = `
    SELECT
      a.ID_ASISTENCIA,
      p.APELLIDO_PATERNO,
      p.APELLIDO_MATERNO,
      p.NOMBRES,
      g.NRO_GRADO,
      s.SECCION,
      a.FECHA,
      a.ESTADO_ASISTENCIA,
      a.OBSERVACION
    FROM asistencia a
    INNER JOIN estudiante e ON a.ID_ESTUDIANTE = e.ID_ESTUDIANTE
    INNER JOIN persona p ON e.ID_PERSONA = p.ID_PERSONA
    INNER JOIN grado_estudiante g ON e.ID_ESTUDIANTE = g.ID_ESTUDIANTE
    INNER JOIN seccion s ON g.ID_SECCION = s.ID_SECCION
    WHERE g.NRO_GRADO = ? AND s.ID_SECCION = ?
    ORDER BY a.FECHA DESC
  `;

    db.query(sql, [grado, seccion], (err, results) => {
        if (err) {
            console.error('❌ Error al obtener asistencias filtradas:', err);
            return res.status(500).json({ error: 'Error al obtener asistencias' });
        }
        res.json(results);
    });
});

// Obtener asistencias filtradas por grado, sección y fecha
router.get("/:grado/:seccion/:fecha", (req, res) => {
    const { grado, seccion, fecha } = req.params;
    const sql = `
    SELECT
      a.ID_ASISTENCIA,
      p.APELLIDO_PATERNO,
      p.APELLIDO_MATERNO,
      p.NOMBRES,
      g.NRO_GRADO,
      s.SECCION,
      a.FECHA,
      a.ESTADO_ASISTENCIA,
      a.OBSERVACION
    FROM asistencia a
    INNER JOIN estudiante e ON a.ID_ESTUDIANTE = e.ID_ESTUDIANTE
    INNER JOIN persona p ON e.ID_PERSONA = p.ID_PERSONA
    INNER JOIN grado_estudiante g ON e.ID_ESTUDIANTE = g.ID_ESTUDIANTE
    INNER JOIN seccion s ON g.ID_SECCION = s.ID_SECCION
    WHERE g.NRO_GRADO = ? AND s.ID_SECCION = ? AND DATE(a.FECHA) = ?
    ORDER BY a.FECHA DESC
  `;

    db.query(sql, [grado, seccion, fecha], (err, results) => {
        if (err) {
            console.error("❌ Error al obtener asistencias filtradas:", err);
            return res.status(500).json({ error: "Error al obtener asistencias" });
        }
        res.json(results);
    });
});


module.exports = router;
