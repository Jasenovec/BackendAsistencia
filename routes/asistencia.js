const express = require('express');
const router = express.Router();
const pool = require('../database');
const auth = require('../middlewares/auth');
const roleGrades = require('../middlewares/roleGrades');

// Autenticación en todas
router.use(auth);


/**
 * 📘 ASISTENCIA ENDPOINTS (POSTMAN)
 *
 * # Obtener todas las asistencias (admin ve todo, auxiliares solo lo suyo)
 * GET http://localhost:3000/asistencia/
 * Headers:
 *   Authorization: Bearer <TOKEN_JWT>
 *
 * # Obtener historial de asistencias (con restricciones por rol)
 * GET http://localhost:3000/asistencia/historial
 * Headers:
 *   Authorization: Bearer <TOKEN_JWT>
 *
 * # Obtener asistencias por grado y sección
 * GET http://localhost:3000/asistencia/4/1   // Ejemplo: grado=4, seccion=1
 * Headers:
 *   Authorization: Bearer <TOKEN_JWT>
 *
 * # Obtener asistencias por grado, sección y fecha
 * GET http://localhost:3000/asistencia/4/1/2025-09-02
 * Headers:
 *   Authorization: Bearer <TOKEN_JWT>
 *
 * # Registrar nueva asistencia
 * POST http://localhost:3000/asistencia/
 * Headers:
 *   Authorization: Bearer <TOKEN_JWT>
 * Body (JSON):
 * {
 *   "id_estudiante": 15,
 *   "fecha": "2025-09-02",
 *   "estado_asistencia": "TJ",      
 *   "observacion": "Llegó tarde"
 * }
 * ACOTACIÓN = {A = Asistió, 
 *              FI = Falta Injustificada, 
 *              FJ = Falta Justificada, 
 *              TJ = Tardanza Justificada, 
 *              TI = Tardanza Injustificada}
 *
 * # Actualizar asistencia (y registrar historial)
 * PUT http://localhost:3000/asistencia/10
 * Headers:
 *   Authorization: Bearer <TOKEN_JWT>
 * Body (JSON):
 * {
 *   "estado_asistencia": "F",
 *   "observacion": "No asistió"
 * }
 *
 * # Eliminar asistencia
 * DELETE http://localhost:3000/asistencia/10
 * Headers:
 *   Authorization: Bearer <TOKEN_JWT>
 */


/** Helpers de filtros por rol (grado y sección) */
function isAdmin(user) {
  return user?.isAdmin || user?.codigo_rol === 'administrador' || Number(user?.nivel_rol) === 1;
}

function buildAllowedFilters(user, aliasG = 'g', aliasS = 's') {
  if (isAdmin(user)) return { clause: '', params: [] };

  const grades = Array.isArray(user.allowedGrades) ? user.allowedGrades : [];
  const sections = Array.isArray(user.allowedSections) ? user.allowedSections : [];

  let clause = '';
  const params = [];

  if (grades.length) {
    clause += ` AND ${aliasG}.NRO_GRADO IN (${grades.map(() => '?').join(',')}) `;
    params.push(...grades);
  } else {
    clause += ' AND 1=0 '; // sin grados => sin acceso
  }

  if (sections.length) {
    clause += ` AND ${aliasS}.ID_SECCION IN (${sections.map(() => '?').join(',')}) `;
    params.push(...sections);
  }

  return { clause, params };
}

function assertAccessByParams(user, grado, seccion) {
  if (isAdmin(user)) return null;

  const g = Number(grado);
  const s = seccion != null ? Number(seccion) : null;

  if (!user.allowedGrades?.includes(g)) {
    return { status: 403, body: { error: 'No tienes permiso para este grado' } };
  }
  if (s != null && user.allowedSections?.length && !user.allowedSections.includes(s)) {
    return { status: 403, body: { error: 'No tienes permiso para esta sección' } };
  }
  return null;
}

// GET todas las asistencias (filtra por grados/secciones)
router.get('/', roleGrades, async (req, res) => {
  const baseSql = `
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
    WHERE 1=1
  `;
  try {
    const { clause, params } = buildAllowedFilters(req.user, 'g', 's');
    const [rows] = await pool.query(`${baseSql} ${clause} ORDER BY a.FECHA DESC`, params);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error al obtener asistencias:', err);
    res.status(500).json({ error: 'Error al obtener asistencias' });
  }
});

// GET historial (filtra por grados/secciones)
router.get('/historial', roleGrades, async (req, res) => {
  const baseSql = `
    SELECT
      h.ID_HISTORIAL,
      h.ID_ASISTENCIA,
      h.FECHA,
      h.ESTADO_ANTERIOR,
      h.ESTADO_NUEVO,
      h.OBSERVACION_ANTERIOR,
      h.OBSERVACION_NUEVA,
      h.FECHA_MODIFICACION
    FROM \`historial_asistencia\` h
    INNER JOIN \`asistencia\` a ON a.ID_ASISTENCIA = h.ID_ASISTENCIA
    INNER JOIN \`estudiante\` e ON a.ID_ESTUDIANTE = e.ID_ESTUDIANTE
    INNER JOIN \`grado_estudiante\` g ON g.ID_ESTUDIANTE = e.ID_ESTUDIANTE
    INNER JOIN \`seccion\` s ON g.ID_SECCION = s.ID_SECCION
    WHERE 1=1
  `;
  try {
    const { clause, params } = buildAllowedFilters(req.user, 'g', 's');
    const [rows] = await pool.query(`${baseSql} ${clause} ORDER BY h.FECHA_MODIFICACION DESC`, params);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error al obtener el historial:', err);
    res.status(500).json({ error: 'Error al obtener las asistencias' });
  }
});

// GET por grado y sección
router.get('/:grado/:seccion', roleGrades, async (req, res) => {
  const { grado, seccion } = req.params;

  const denied = assertAccessByParams(req.user, grado, seccion);
  if (denied) return res.status(denied.status).json(denied.body);

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
    WHERE g.NRO_GRADO = ? AND s.ID_SECCION = ?
    ORDER BY a.FECHA DESC
  `;
  try {
    const [rows] = await pool.query(sql, [grado, seccion]);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error al obtener asistencias filtradas:', err);
    res.status(500).json({ error: 'Error al obtener asistencias' });
  }
});

// GET por grado, sección y fecha
router.get('/:grado/:seccion/:fecha', roleGrades, async (req, res) => {
  const { grado, seccion, fecha } = req.params;

  const denied = assertAccessByParams(req.user, grado, seccion);
  if (denied) return res.status(denied.status).json(denied.body);

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
    WHERE g.NRO_GRADO = ? AND s.ID_SECCION = ? AND DATE(a.FECHA) = ?
    ORDER BY a.FECHA DESC
  `;
  try {
    const [rows] = await pool.query(sql, [grado, seccion, fecha]);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error al obtener asistencias filtradas:', err);
    res.status(500).json({ error: 'Error al obtener asistencias' });
  }
});

// POST (verifica grado y sección del estudiante)
router.post('/', roleGrades, async (req, res) => {
  const { id_estudiante, fecha, estado_asistencia, observacion } = req.body;

  if (!id_estudiante || !fecha || !estado_asistencia) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  try {
    // Obtener grado y sección del estudiante
    const [gs] = await pool.query(
      `
      SELECT g.NRO_GRADO, g.ID_SECCION
      FROM \`grado_estudiante\` g
      WHERE g.ID_ESTUDIANTE = ? LIMIT 1
      `,
      [id_estudiante]
    );
    if (!gs.length) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }
    const { NRO_GRADO, ID_SECCION } = gs[0];

    const denied = assertAccessByParams(req.user, NRO_GRADO, ID_SECCION);
    if (denied) return res.status(denied.status).json(denied.body);

    const sql = `
      INSERT INTO \`asistencia\` (ID_ESTUDIANTE, FECHA, ESTADO_ASISTENCIA, OBSERVACION)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await pool.query(sql, [
      id_estudiante,
      fecha,
      estado_asistencia,
      observacion ?? null
    ]);

    res.status(201).json({ message: '✅ Asistencia registrada con éxito', asistenciaId: result.insertId });
  } catch (err) {
    console.error('❌ Error al registrar la asistencia:', err);
    res.status(500).json({ error: 'Error al registrar la asistencia' });
  }
});

// PUT (transacción + historial, valida grado/sección)
router.put('/:id_asistencia', roleGrades, async (req, res) => {
  const { id_asistencia } = req.params;
  const { estado_asistencia, observacion } = req.body;

  if (!estado_asistencia) {
    return res.status(400).json({ error: 'Falta estado_asistencia' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rowsAsis] = await conn.query(
      'SELECT ID_ESTUDIANTE, ESTADO_ASISTENCIA, OBSERVACION, FECHA FROM `asistencia` WHERE ID_ASISTENCIA = ? FOR UPDATE',
      [id_asistencia]
    );
    if (!rowsAsis.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Asistencia no encontrada' });
    }
    const asis = rowsAsis[0];

    // Verificar grado y sección del estudiante
    const [gs] = await conn.query(
      'SELECT g.NRO_GRADO, g.ID_SECCION FROM `grado_estudiante` g WHERE g.ID_ESTUDIANTE = ? LIMIT 1',
      [asis.ID_ESTUDIANTE]
    );
    const denied = assertAccessByParams(req.user, gs?.[0]?.NRO_GRADO, gs?.[0]?.ID_SECCION);
    if (denied) {
      await conn.rollback();
      return res.status(denied.status).json(denied.body);
    }

    // Insertar historial
    await conn.query(
      `
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
      `,
      [
        id_asistencia,
        asis.ID_ESTUDIANTE,
        asis.FECHA,
        asis.ESTADO_ASISTENCIA,
        estado_asistencia,
        asis.OBSERVACION,
        observacion ?? null
      ]
    );

    // Actualizar registro principal
    await conn.query(
      'UPDATE `asistencia` SET ESTADO_ASISTENCIA = ?, OBSERVACION = ? WHERE ID_ASISTENCIA = ?',
      [estado_asistencia, observacion ?? null, id_asistencia]
    );

    await conn.commit();
    res.json({ message: '✅ Asistencia actualizada y registrada en historial con éxito' });
  } catch (err) {
    await conn.rollback();
    console.error('❌ Error al actualizar asistencia:', err);
    res.status(500).json({ error: 'Error al actualizar asistencia' });
  } finally {
    conn.release();
  }
});

// DELETE (valida grado/sección)
router.delete('/:id_asistencia', roleGrades, async (req, res) => {
  const { id_asistencia } = req.params;
  try {
    // verificar grado/sección del registro
    const [rows] = await pool.query(
      `
      SELECT g.NRO_GRADO, g.ID_SECCION
      FROM \`asistencia\` a
      INNER JOIN \`estudiante\` e ON a.ID_ESTUDIANTE = e.ID_ESTUDIANTE
      INNER JOIN \`grado_estudiante\` g ON g.ID_ESTUDIANTE = e.ID_ESTUDIANTE
      WHERE a.ID_ASISTENCIA = ?
      `,
      [id_asistencia]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Asistencia no encontrada' });
    }

    const denied = assertAccessByParams(req.user, rows[0].NRO_GRADO, rows[0].ID_SECCION);
    if (denied) return res.status(denied.status).json(denied.body);

    await pool.query('DELETE FROM `asistencia` WHERE ID_ASISTENCIA = ?', [id_asistencia]);
    res.json({ message: '✅ Asistencia eliminada con éxito' });
  } catch (err) {
    console.error('❌ Error al eliminar la asistencia:', err);
    res.status(500).json({ error: 'Error al eliminar la asistencia' });
  }
});

module.exports = router;
