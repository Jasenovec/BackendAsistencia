const express = require('express');
const router = express.Router();
const db = require('../database');

// Obtener grados
router.get('/grados', (req, res) => {
  const sql = `SELECT DISTINCT NRO_GRADO FROM grado_estudiante ORDER BY NRO_GRADO ASC`;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error al obtener grados:', err);
      return res.status(500).json({ error: 'Error al obtener grados' });
    }
    res.json(results);
  });
});

router.get('/secciones', (req, res) => {
  const sql = `SELECT ID_SECCION, SECCION FROM seccion ORDER BY SECCION ASC`;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error al obtener secciones:', err);
      return res.status(500).json({ error: 'Error al obtener secciones' });
    }
    res.json(results);
  });
});

module.exports = router;
