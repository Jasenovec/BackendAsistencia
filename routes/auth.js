const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../database');

const router = express.Router();

// POST /auth/login
router.post('/login', async (req, res) => {
  const { usuario, password } = req.body;

  try {
    const [rows] = await pool.query(
      'SELECT id_usuario, usuario, password, rol FROM usuarios WHERE usuario = ?',
      [usuario]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      { id_usuario: user.id_usuario, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({ token });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// GET /auth/me
router.get('/me', require('../middlewares/auth'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id_usuario, usuario, rol FROM usuarios WHERE id_usuario = ?',
      [req.user.id_usuario]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error en /me:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

module.exports = router;
