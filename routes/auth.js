const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../database');

const router = express.Router();

/**
 * POST /auth/login
 * Body: { usuario, password }
 */
router.post('/login', async (req, res) => {
  const { usuario, password } = req.body;

  try {
    // Trae al usuario y su rol (alias en camelCase para evitar confusiones)
    const [rows] = await pool.query(
      `
      SELECT
        ua.ID_USUARIO_ADMIN      AS idUsuarioAdmin,
        ua.USUARIO               AS usuario,
        ua.CONTRASENA            AS contrasena,
        ua.ACTIVO                AS activo,
        ua.REQUIERE_CAMBIO_CONTRASENA AS requiereCambioContrasena,
        ua.ID_ROL                AS idRol,
        r.ROL                    AS rolNombre,
        r.CODIGO_ROL             AS codigoRol,
        r.NIVEL                  AS nivelRol
      FROM usuario_administrativo ua
      LEFT JOIN rol r ON r.ID_ROL = ua.ID_ROL
      WHERE ua.USUARIO = ?
      LIMIT 1
      `,
      [usuario]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    const u = rows[0];

    // Bloquea usuarios inactivos
    if (!u.activo) {
      return res.status(403).json({ message: 'Usuario inactivo' });
    }

    // Valida contraseña
    const ok = await bcrypt.compare(password, u.contrasena);
    if (!ok) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    // Genera token con claves que sí existen en tu DB
    const token = jwt.sign(
      {
        id_usuario_admin: u.idUsuarioAdmin,
        id_rol: u.idRol,
        codigo_rol: u.codigoRol,
        nivel_rol: u.nivelRol,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return res.json({
      token,
      // útil para UX (p.ej. forzar cambio de contraseña)
      requiere_cambio_contrasena: !!u.requiereCambioContrasena,
      usuario: u.usuario,
      rol: {
        id_rol: u.idRol,
        nombre: u.rolNombre,
        codigo: u.codigoRol,
        nivel: u.nivelRol,
      },
    });
  } catch (error) {
    console.error('Error en /auth/login:', error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
});

/**
 * GET /auth/me
 * Header: Authorization: Bearer <token>
 * (Tu middleware debe decodificar y poner req.user.* con las mismas claves del payload)
 */
router.get('/me', require('../middlewares/auth'), async (req, res) => {
  try {
    const { id_usuario_admin } = req.user; // <- coherente con el token de arriba

    const [rows] = await pool.query(
      `
      SELECT
        ua.ID_USUARIO_ADMIN      AS idUsuarioAdmin,
        ua.USUARIO               AS usuario,
        ua.ACTIVO                AS activo,
        ua.REQUIERE_CAMBIO_CONTRASENA AS requiereCambioContrasena,
        ua.ID_ROL                AS idRol,
        r.ROL                    AS rolNombre,
        r.CODIGO_ROL             AS codigoRol,
        r.NIVEL                  AS nivelRol
      FROM usuario_administrativo ua
      LEFT JOIN rol r ON r.ID_ROL = ua.ID_ROL
      WHERE ua.ID_USUARIO_ADMIN = ?
      LIMIT 1
      `,
      [id_usuario_admin]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const u = rows[0];
    return res.json({
      id_usuario_admin: u.idUsuarioAdmin,
      usuario: u.usuario,
      activo: !!u.activo,
      requiere_cambio_contrasena: !!u.requiereCambioContrasena,
      rol: {
        id_rol: u.idRol,
        nombre: u.rolNombre,
        codigo: u.codigoRol,
        nivel: u.nivelRol,
      },
    });
  } catch (error) {
    console.error('Error en /auth/me:', error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
});

module.exports = router;
