const pool = require("../database");

module.exports = async (req, res, next) => {
  const { rol } = req.user; // viene del token (authMiddleware)

  // Si es administrador, pasa sin restricción
  if (rol === "administrador") {
    return next();
  }

  const gradoParam = parseInt(req.params.grado, 10);
  if (!gradoParam) {
    return res.status(400).json({ message: "Grado inválido" });
  }

  try {
    // Verificamos si este rol tiene acceso a ese grado
    const [rows] = await pool.query(
      `SELECT 1 
       FROM rol_grado_secu rgs
       JOIN rol r ON rgs.ID_ROL = r.ID_ROL
       WHERE r.CODIGO_ROL = ? AND rgs.GRADO = ?`,
      [rol, gradoParam]
    );

    if (rows.length === 0) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para acceder a este grado" });
    }

    next();
  } catch (error) {
    console.error("Error en roleGrade:", error);
    return res
      .status(500)
      .json({ message: "Error verificando permisos en roleGrade" });
  }
};
