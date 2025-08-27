const express = require('express');
const router = express.Router();
const pool = require('../database');
const auth = require('../middlewares/auth');
const roleGrades = require('../middlewares/roleGrades');

// Aplica autenticación a todas las rutas
router.use(auth);

/**
 * Helper para filtrar por grados permitidos
 * Si es admin, no filtra nada
 * Si es auxiliar, agrega condición WHERE
 */
function addGradeFilter(sqlBase, user) {
  if (user.role === 'administrador') {
    return { sql: sqlBase, params: [] };
  } else {
    const grades = user.allowedGrades || [];
    const placeholders = grades.map(() => '?').join(',');
    return {
      sql: `${sqlBase} WHERE grado IN (${placeholders})`,
      params: grades
    };
  }
}

// GET todas las asistencias (filtradas por rol)
router.get('/', roleGrades, async (req, res) => {
  try {
    const { sql, params } = addGradeFilter(
      'SELECT * FROM asistencias',
      req.user
    );
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener asistencias' });
  }
});

// GET historial (filtradas por rol)
router.get('/historial', async (req, res) => {
  try {
    const { sql, params } = addGradeFilter(
      'SELECT * FROM asistencias_historial',
      req.user
    );
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

// GET asistencias por grado y sección
router.get('/:grado/:seccion', roleGrades, async (req, res) => {
  try {
    const { grado, seccion } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM asistencias WHERE grado = ? AND seccion = ?',
      [grado, seccion]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener asistencias' });
  }
});

// GET asistencias por grado, sección y fecha
router.get('/:grado/:seccion/:fecha', roleGrades, async (req, res) => {
  try {
    const { grado, seccion, fecha } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM asistencias WHERE grado = ? AND seccion = ? AND fecha = ?',
      [grado, seccion, fecha]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener asistencias' });
  }
});

// POST nueva asistencia
router.post('/', roleGrades, async (req, res) => {
  const { id_estudiante, fecha, estado } = req.body;

  try {
    // Verificar que el estudiante pertenece a un grado permitido
    const [alumno] = await pool.query(
      'SELECT grado FROM alumnos WHERE id_estudiante = ?',
      [id_estudiante]
    );

    if (!alumno.length) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }

    if (
      req.user.role !== 'administrador' &&
      !req.user.allowedGrades.includes(alumno[0].grado)
    ) {
      return res.status(403).json({ error: 'No tienes permiso para este grado' });
    }

    await pool.query(
      'INSERT INTO asistencias (id_estudiante, fecha, estado) VALUES (?, ?, ?)',
      [id_estudiante, fecha, estado]
    );

    res.json({ message: 'Asistencia registrada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar asistencia' });
  }
});

// PUT actualizar asistencia
router.put('/:id_asistencia', roleGrades, async (req, res) => {
  const { id_asistencia } = req.params;
  const { estado } = req.body;

  try {
    // Verificar grado del registro antes de actualizar
    const [registro] = await pool.query(
      `SELECT a.grado 
       FROM asistencias asi
       JOIN alumnos a ON asi.id_estudiante = a.id_estudiante
       WHERE asi.id_asistencia = ?`,
      [id_asistencia]
    );

    if (!registro.length) {
      return res.status(404).json({ error: 'Asistencia no encontrada' });
    }

    if (
      req.user.role !== 'administrador' &&
      !req.user.allowedGrades.includes(registro[0].grado)
    ) {
      return res.status(403).json({ error: 'No tienes permiso para este grado' });
    }

    await pool.query(
      'UPDATE asistencias SET estado = ? WHERE id_asistencia = ?',
      [estado, id_asistencia]
    );

    res.json({ message: 'Asistencia actualizada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar asistencia' });
  }
});

// DELETE eliminar asistencia
router.delete('/:id_asistencia', async (req, res) => {
  const { id_asistencia } = req.params;

  try {
    // Verificar grado antes de eliminar
    const [registro] = await pool.query(
      `SELECT a.grado 
       FROM asistencias asi
       JOIN alumnos a ON asi.id_estudiante = a.id_estudiante
       WHERE asi.id_asistencia = ?`,
      [id_asistencia]
    );

    if (!registro.length) {
      return res.status(404).json({ error: 'Asistencia no encontrada' });
    }

    if (
      req.user.role !== 'administrador' &&
      !req.user.allowedGrades.includes(registro[0].grado)
    ) {
      return res.status(403).json({ error: 'No tienes permiso para este grado' });
    }

    await pool.query('DELETE FROM asistencias WHERE id_asistencia = ?', [
      id_asistencia
    ]);

    res.json({ message: 'Asistencia eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar asistencia' });
  }
});

module.exports = router;
