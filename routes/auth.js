const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const pool = require("../database");

const router = express.Router();

// POST /auth/login
router.post("/login", async (req, res) => {
  const { usuario, password } = req.body;

  try {
    // Verificar si el usuario existe
    const [rows] = await pool.query(
      `SELECT 
        ua.USUARIO, 
        ua.CONTRASENA AS contrasena, 
        r.CODIGO_ROL, 
        r.NIVEL, 
        r.ROL
      FROM usuario_administrativo ua
      JOIN rol r ON ua.ID_ROL = r.ID_ROL
      WHERE ua.USUARIO = ?`,
      [usuario]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }

    const user = rows[0];

    // Comparar contraseñas
    const match = await bcrypt.compare(password, user.contrasena);

    if (!match) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    // Generar token
    const token = jwt.sign(
      {
        usuario: user.USUARIO,
        rol: user.CODIGO_ROL,
        nivel: user.NIVEL,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    res.json({
      message: "Login exitoso",
      token,
      usuario: user.USUARIO,
      rol: user.ROL,
      codigoRol: user.CODIGO_ROL,
    });
  } catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({ message: "Error en el servidor" });
  }
});

// GET /auth/me
router.get("/me", (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token requerido" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ usuario: decoded.usuario, rol: decoded.rol, nivel: decoded.nivel });
  } catch (err) {
    return res.status(403).json({ message: "Token inválido" });
  }
});

module.exports = router;
