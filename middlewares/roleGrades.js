// middlewares/roleGrades.js
const pool = require('../database');

/**
 * Obtiene grados y secciones permitidas para el rol del usuario.
 * - Admin => sin restricciones (isAdmin=true)
 * - Auxiliares => allowedGrades a partir de rol_grado.GRADO
 *                 allowedSections se calcula como todas las secciones (ID_SECCION) que existan para esos grados
 *                 en el año lectivo configurado.
 */
module.exports = async (req, res, next) => {
  try {
    const { codigo_rol, nivel_rol } = req.user || {};

    // Falla si no hay info de rol en el token
    if (!codigo_rol && !nivel_rol) {
      return res.status(401).json({ message: 'Token sin información de rol' });
    }

    // Admin: sin restricciones
    const isAdmin = codigo_rol === 'administrador' || Number(nivel_rol) === 1;
    if (isAdmin) {
      req.user.isAdmin = true;
      req.user.allowedGrades = null;
      req.user.allowedSections = null;
      return next();
    }

    // 1) Obtener ID_ROL a partir de codigo_rol
    const [rolRows] = await pool.query(
      'SELECT ID_ROL FROM rol WHERE CODIGO_ROL = ? LIMIT 1',
      [codigo_rol]
    );
    if (!rolRows.length) {
      return res.status(403).json({ message: 'Rol no reconocido' });
    }
    const idRol = rolRows[0].ID_ROL;

    // 2) Grados permitidos desde rol_grado
    const [gradoRows] = await pool.query(
      'SELECT GRADO FROM rol_grado WHERE ID_ROL = ? ORDER BY GRADO',
      [idRol]
    );
    const allowedGrades = gradoRows.map(r => Number(r.GRADO));

    if (!allowedGrades.length) {
      // Rol sin grados asignados => sin acceso
      req.user.allowedGrades = [];
      req.user.allowedSections = [];
      return res.status(403).json({ message: 'No tienes grados asignados' });
    }

    // 3) Secciones permitidas: todas las secciones que existan para esos grados (nivel Secundaria = 3)
    // Año lectivo configurable por ENV; si no, usaremos el actual o 2025 como fallback.
    const anioLectivo = Number(process.env.ANIO_LECTIVO) || 2025;

    const placeholders = allowedGrades.map(() => '?').join(',');
    const params = [...allowedGrades, 3, anioLectivo];

    const [secRows] = await pool.query(
      `
      SELECT DISTINCT g.ID_SECCION
      FROM grado_estudiante g
      JOIN anio_lectivo a ON a.ID_ANIO_LECTIVO = g.ID_ANIO_LECTIVO
      WHERE g.NRO_GRADO IN (${placeholders})
        AND g.ID_NIVEL = ?
        AND a.NRO_ANIO = ?
      `,
      params
    );
    const allowedSections = secRows.map(r => Number(r.ID_SECCION));

    req.user.isAdmin = false;
    req.user.allowedGrades = allowedGrades;
    req.user.allowedSections = allowedSections;

    // Si la ruta tiene :grado / :seccion, valida de inmediato
    const gradoParam = req.params?.grado ? Number(req.params.grado) : null;
    if (gradoParam !== null && !allowedGrades.includes(gradoParam)) {
      return res.status(403).json({ message: 'No tienes permiso para este grado' });
    }

    const seccionParam = req.params?.seccion ? Number(req.params.seccion) : null;
    if (seccionParam !== null && allowedSections.length && !allowedSections.includes(seccionParam)) {
      return res.status(403).json({ message: 'No tienes permiso para esta sección' });
    }

    return next();
  } catch (error) {
    console.error('Error en roleGrades:', error);
    return res.status(500).json({ message: 'Error verificando permisos' });
  }
};
